import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';
import { socketAuthMiddleware } from './middleware';
import * as queueService from '../services/queueService';
import * as voteService from '../services/voteService';
import * as guestService from '../services/guestService';
import * as partyService from '../services/partyService';
import { PlaybackSyncEngine } from '../services/playbackService';
import { getAdapterForParty } from '../streaming/getAdapter';
import type { PartySettings } from '@auxqueue/shared';

const engines = new Map<string, PlaybackSyncEngine>();

type AuxSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AuxServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function startEnginesForActiveParties(io: AuxServer) {
  const activeParties = await partyService.getActiveParties();
  console.log(`[Startup] Found ${activeParties.length} active parties, starting engines...`);
  for (const party of activeParties) {
    if (!engines.has(party.id)) {
      const engine = new PlaybackSyncEngine(party.id, io);
      engine.start();
      engines.set(party.id, engine);
      console.log(`[Startup] Engine started for party ${party.id}`);
    }
  }
}

export function stopEngineForParty(partyId: string) {
  const engine = engines.get(partyId);
  if (engine) {
    engine.stop();
    engines.delete(partyId);
    console.log(`[Engine] Stopped engine for ended party ${partyId}`);
  }
}

export function registerSocketHandler(io: AuxServer) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuxSocket) => {
    socket.on('party:join', async ({ partyId, sessionToken: providedToken }) => {
      try {
      const party = await partyService.getPartyById(partyId);
      if (!party || party.status !== 'active') return;

      if (socket.data.userId) {
        // Host JWT auth
        if (party.hostUserId !== socket.data.userId) return;
        socket.data.isHost = true;
        socket.data.displayName = 'Host';
      } else {
        // Guest session token auth
        const token = socket.data.sessionToken ?? providedToken;
        if (!token) return;
        const guest = await guestService.getGuestBySessionToken(token, partyId);
        if (!guest || guest.status === 'kicked' || guest.status === 'banned') return;
        socket.data.guestId = guest.id;
        socket.data.displayName = guest.displayName;
        socket.data.guestAvatar = guest.avatar;
      }

      socket.join(partyId);
      socket.data.partyId = partyId;

      // Send full queue state to joining client
      const items = await queueService.getQueue(partyId);
      socket.emit('queue:state', { items, nowPlaying: null });

      // Send current guest list to host on join/rejoin
      if (socket.data.isHost) {
        const guests = await guestService.getGuestsByParty(partyId);
        for (const g of guests) {
          socket.emit('guest:joined', { guest: { id: g.id, name: g.displayName, avatar: g.avatar, tier: 'free' } });
        }
      }

      // Start playback engine when host joins (one engine per party)
      if (socket.data.isHost) {
        if (!engines.has(partyId)) {
          try {
            const engine = new PlaybackSyncEngine(partyId, io);
            engine.start();
            engines.set(partyId, engine);
          } catch {
            // No Spotify account linked yet — engine will be skipped
          }
        } else {
          // Engine already running — send current state immediately to this socket
          engines.get(partyId)?.pollNow().catch(() => {});
        }
      }

      // Announce to room
      if (!socket.data.isHost) {
        io.to(partyId).emit('guest:joined', {
          guest: {
            id: socket.data.guestId ?? socket.id,
            name: socket.data.displayName ?? 'Guest',
            avatar: socket.data.guestAvatar ?? '🎵',
            tier: 'Listener',
          },
        });
      }
      } catch (err) {
        console.error(`[Socket] party:join error for party ${partyId}:`, err);
      }
    });

    socket.on('party:leave', ({ partyId }) => {
      socket.leave(partyId);
      if (!socket.data.isHost) {
        io.to(partyId).emit('guest:left', { guestId: socket.data.guestId ?? socket.id });
      }
      socket.data.partyId = undefined; // prevent duplicate emit on disconnect
    });

    socket.on('queue:vote', async ({ queueItemId, direction }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId) return;

      const score = await voteService.castVote(
        queueItemId,
        direction,
        socket.data.userId,
        socket.data.guestId,
      );

      // Check vote-out threshold
      const party = await partyService.getPartyById(partyId);
      const settings = party?.settings as PartySettings | null;
      if (settings && score.netScore <= settings.voteOutThreshold) {
        await queueService.markAsVotedOut(queueItemId);
        io.to(partyId).emit('queue:voted_out', {
          queueItemId,
          title: 'A song was voted out',
        });
      }

      const items = await queueService.getQueue(partyId);
      io.to(partyId).emit('queue:reordered', { items });
    });

    socket.on('queue:remove', async ({ queueItemId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;

      await queueService.removeFromQueue(queueItemId);
      io.to(partyId).emit('queue:removed', { queueItemId });
    });

    socket.on('queue:approve', async ({ queueItemId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;

      const approved = await queueService.approveQueueItem(queueItemId);
      if (!approved) return;

      io.to(partyId).emit('queue:added', { item: approved });
      const items = await queueService.getQueue(partyId);
      io.to(partyId).emit('queue:reordered', { items });
    });

    socket.on('queue:reject', async ({ queueItemId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;

      await queueService.rejectQueueItem(queueItemId);
      io.to(partyId).emit('queue:removed', { queueItemId });
    });

    socket.on('playback:play', async () => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      try {
        const adapter = await getAdapterForParty(partyId);
        await adapter.play();
      } catch { /* ignore */ }
    });

    socket.on('playback:pause', async () => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      try {
        const adapter = await getAdapterForParty(partyId);
        await adapter.pause();
      } catch { /* ignore */ }
    });

    socket.on('playback:skip', async () => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      try {
        const adapter = await getAdapterForParty(partyId);
        await adapter.skipToNext();
      } catch { /* ignore */ }
    });

    socket.on('guest:mute', async ({ guestId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      await guestService.updateGuestStatus(guestId, 'muted');
      io.to(partyId).emit('guest:status', { guestId, status: 'muted' });
    });

    socket.on('guest:unmute', async ({ guestId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      await guestService.updateGuestStatus(guestId, 'active');
      io.to(partyId).emit('guest:status', { guestId, status: 'active' });
    });

    socket.on('guest:kick', async ({ guestId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      await guestService.updateGuestStatus(guestId, 'kicked');
      io.to(partyId).emit('guest:status', { guestId, status: 'kicked' });
    });

    socket.on('guest:ban', async ({ guestId }) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      await guestService.updateGuestStatus(guestId, 'banned');
      io.to(partyId).emit('guest:status', { guestId, status: 'banned' });
    });

    socket.on('party:settings', async (settings) => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId || !socket.data.isHost) return;
      const updated = await partyService.updateSettings(partyId, settings);
      if (updated) {
        io.to(partyId).emit('party:settings_updated', {
          settings: updated.settings as PartySettings,
        });
      }
    });

    socket.on('disconnect', () => {
      const partyId = socket.data.partyId as string | undefined;
      if (!partyId) return;

      if (!socket.data.isHost) {
        io.to(partyId).emit('guest:left', {
          guestId: socket.data.guestId ?? socket.id,
        });
      }
    });
  });
}
