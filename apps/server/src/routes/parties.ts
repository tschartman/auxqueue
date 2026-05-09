import type { FastifyPluginAsync } from 'fastify';
import {
  createPartySchema,
  joinPartySchema,
  updateSettingsSchema,
  guestActionSchema,
} from '@auxqueue/shared';
import type { PartySettings } from '@auxqueue/shared';
import { requireAuth } from '../middleware/auth';
import * as partyService from '../services/partyService';
import * as guestService from '../services/guestService';
import { getAdapterForParty } from '../streaming/getAdapter';
import { stopEngineForParty } from '../socket/handler';

const DEFAULT_SETTINGS: PartySettings = {
  queueMode: 'vote',
  approvalRequired: false,
  explicitFilter: false,
  maxPerGuest: 5,
  voteOutThreshold: -3,
  lockOnDeck: true,
};

export const partyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const body = createPartySchema.parse(request.body);
    const userId = (request as any).userId as string;

    const endedIds = await partyService.endActivePartiesForUser(userId);
    for (const id of endedIds) stopEngineForParty(id);

    const party = await partyService.createParty(
      userId,
      body.partyName,
      body.streamingService,
      { ...DEFAULT_SETTINGS, ...(body.settings ?? {}) },
    );

    return { partyId: party.id, roomCode: party.roomCode };
  });

  // GET /api/parties/:code — public party info by room code
  fastify.get('/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const party = await partyService.getPartyByCode(code);

    if (!party) {
      return reply.code(404).send({ error: 'Party not found' });
    }

    const settings = party.settings as PartySettings;

    return {
      partyId: party.id,
      partyName: party.partyName,
      roomCode: party.roomCode,
      streamingService: party.streamingService,
      queueMode: settings.queueMode,
    };
  });

  // POST /api/parties/:id/join
  fastify.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = joinPartySchema.parse(request.body);

    const party = await partyService.getPartyById(id);
    if (!party || party.status !== 'active') {
      return reply.code(404).send({ error: 'Party not found or has ended' });
    }

    const { session, sessionToken } = await guestService.joinParty(
      id,
      body.displayName,
      body.avatar,
      body.deviceFingerprint,
    );

    return {
      sessionId: session.id,
      sessionToken,
      partyId: party.id,
      partyName: party.partyName,
      roomCode: party.roomCode,
      settings: party.settings,
    };
  });

  // GET /api/parties/:id/details — full party info for hosts
  fastify.get('/:id/details', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });
    if (party.status !== 'active') return reply.code(410).send({ error: 'Party has ended' });

    return party;
  });

  fastify.delete('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    await partyService.endParty(id);
    stopEngineForParty(id);
    return { ok: true };
  });

  fastify.patch('/:id/settings', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;
    const body = updateSettingsSchema.parse(request.body);

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    const updated = await partyService.updateSettings(id, body);
    return { settings: updated?.settings };
  });

  fastify.get('/:id/guests', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    const guests = await guestService.getGuestsByParty(id);
    return { guests };
  });

  fastify.patch('/:id/guests/:guestId', { preHandler: requireAuth }, async (request, reply) => {
    const { id, guestId } = request.params as { id: string; guestId: string };
    const userId = (request as any).userId as string;
    const body = guestActionSchema.parse(request.body);

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    const guest = await guestService.updateGuestStatus(guestId, body.status);
    return { guest };
  });

  // GET /api/parties/:id/playback — debug: raw Spotify playback state for host
  fastify.get('/:id/playback', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    try {
      const adapter = await getAdapterForParty(id);
      const state = await adapter.getPlaybackState();
      return { ok: true, state };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: err?.message ?? 'Unknown error' });
    }
  });

  fastify.delete('/:id/guests/:guestId', { preHandler: requireAuth }, async (request, reply) => {
    const { id, guestId } = request.params as { id: string; guestId: string };
    const userId = (request as any).userId as string;
    const { action } = request.query as { action?: string };

    const party = await partyService.getPartyById(id);
    if (!party) return reply.code(404).send({ error: 'Party not found' });
    if (party.hostUserId !== userId) return reply.code(403).send({ error: 'Forbidden' });

    const status = action === 'ban' ? 'banned' : 'kicked';
    await guestService.updateGuestStatus(guestId, status);
    return { ok: true };
  });
};
