import type { FastifyPluginAsync } from 'fastify';
import { addToQueueSchema, voteSchema } from '@auxqueue/shared';
import type { PartySettings } from '@auxqueue/shared';
import { requireAuth, requirePartyAuth } from '../middleware/auth';
import * as partyService from '../services/partyService';
import * as queueService from '../services/queueService';
import * as voteService from '../services/voteService';
import { getAdapterForParty } from '../streaming/getAdapter';
import { getIo } from '../socket/io';
import { db } from '../db/client';
import { queueItems, queueItemScores } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const queueRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:id/queue', { preHandler: requirePartyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await queueService.getQueue(id);
    return { items, nowPlaying: null };
  });

  fastify.post('/:id/queue', {
    preHandler: requirePartyAuth,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = addToQueueSchema.parse(request.body);
    const userId = (request as any).userId as string | undefined;
    const guestId = (request as any).guestId as string | undefined;
    const guestDisplayName = (request as any).guestDisplayName as string | undefined;
    const guestAvatar = (request as any).guestAvatar as string | undefined;

    const party = await partyService.getPartyById(id);
    if (!party || party.status !== 'active') {
      return reply.code(404).send({ error: 'Party not found' });
    }

    const settings = party.settings as PartySettings;

    // Enforce max-per-guest for non-host callers
    if (guestId && settings.maxPerGuest) {
      const existing = await queueService.countGuestQueuedItems(id, guestId);
      if (existing >= settings.maxPerGuest) {
        return reply.code(429).send({ error: `Max ${settings.maxPerGuest} songs per guest` });
      }
    }

    const isPending = settings.approvalRequired && !userId; // guests require approval if enabled
    const item = await queueService.addToQueue(id, body, userId, guestId, isPending);

    const io = getIo();

    if (isPending) {
      const pendingItem = await queueService.getQueueItemById(item.id);
      io.to(id).emit('queue:pending', { item: pendingItem as any });
    } else {
      const items = await queueService.getQueue(id);
      const added = items.find((i) => i.id === item.id);
      if (added) io.to(id).emit('queue:added', { item: added });
      io.to(id).emit('queue:reordered', { items });
    }

    return { queueItemId: item.id, status: isPending ? 'pending' : 'queued' };
  });

  fastify.delete('/:id/queue/:itemId', { preHandler: requirePartyAuth }, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const userId = (request as any).userId as string | undefined;
    const guestId = (request as any).guestId as string | undefined;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });

    const isHost = userId && party.hostUserId === userId;

    // Guests can only remove their own items
    if (!isHost) {
      const item = await db.select().from(queueItems).where(eq(queueItems.id, itemId)).limit(1);
      if (!item[0] || item[0].addedByGuest !== guestId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    await queueService.removeFromQueue(itemId);
    getIo().to(id).emit('queue:removed', { queueItemId: itemId });
    return { ok: true };
  });

  fastify.post('/:id/queue/:itemId/vote', {
    preHandler: requirePartyAuth,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const body = voteSchema.parse(request.body);
    const userId = (request as any).userId as string | undefined;
    const guestId = (request as any).guestId as string | undefined;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });

    const score = await voteService.castVote(itemId, body.direction, userId, guestId);

    const io = getIo();
    const settings = party.settings as PartySettings;

    if (body.direction !== 0 && score.netScore <= settings.voteOutThreshold) {
      const [item] = await db.select().from(queueItems).where(eq(queueItems.id, itemId)).limit(1);
      await queueService.markAsVotedOut(itemId);
      io.to(id).emit('queue:voted_out', { queueItemId: itemId, title: item?.trackTitle ?? '' });
    }

    const items = await queueService.getQueue(id);
    io.to(id).emit('queue:reordered', { items });

    return { score };
  });

  // Playback controls (host only)
  fastify.post('/:id/playback/play', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;
    const party = await partyService.getPartyById(id);
    if (!party || party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });
    const adapter = await getAdapterForParty(id);
    await adapter.play();
    return { ok: true };
  });

  fastify.post('/:id/playback/pause', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;
    const party = await partyService.getPartyById(id);
    if (!party || party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });
    const adapter = await getAdapterForParty(id);
    await adapter.pause();
    return { ok: true };
  });

  fastify.post('/:id/playback/skip', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;
    const party = await partyService.getPartyById(id);
    if (!party || party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });
    const adapter = await getAdapterForParty(id);
    await adapter.skipToNext();
    return { ok: true };
  });

  fastify.get('/:id/playback/state', { preHandler: requirePartyAuth }, async (request, reply) => {
    // TODO: return cached playback state from Redis
    return { isPlaying: false, track: null, progressMs: 0, durationMs: 0 };
  });
};
