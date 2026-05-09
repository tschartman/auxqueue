import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';
import { PLAYBACK_POLL_INTERVAL_MS, NEXT_SONG_THRESHOLD_MS } from '@auxqueue/shared';
import { getAdapterForParty } from '../streaming/getAdapter';
import * as queueService from './queueService';
import * as partyService from './partyService';
import type { PartySettings } from '@auxqueue/shared';

export class PlaybackSyncEngine {
  private partyId: string;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastTrackUri: string | null = null;
  private nextSongPushed = false;

  constructor(
    partyId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
  ) {
    this.partyId = partyId;
    this.io = io;
  }

  start() {
    this.pollInterval = setInterval(() => this.poll(), PLAYBACK_POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = null;
  }

  private async poll() {
    try {
      const adapter = await getAdapterForParty(this.partyId);
      const state = await adapter.getPlaybackState();
      this.io.to(this.partyId).emit('playback:update', state);

      const currentUri = state.track?.uri ?? null;

      if (currentUri !== this.lastTrackUri) {
        const wasPlaying = this.lastTrackUri !== null;
        this.lastTrackUri = currentUri;
        this.nextSongPushed = false;

        // Remove the newly-playing song from the queue immediately
        if (currentUri) await this.markFinishedItem(currentUri);

        if (wasPlaying) {
          this.io.to(this.partyId).emit('playback:track_changed', { track: state.track });
        }
      }

      if (state.isPlaying && state.track && !this.nextSongPushed) {
        const remaining = state.durationMs - state.progressMs;
        if (remaining <= NEXT_SONG_THRESHOLD_MS) {
          await this.pushNextSong(adapter);
        }
      }
    } catch (err) {
      console.error(`[PlaybackEngine][${this.partyId}] poll error:`, err);
    }
  }

  private async markFinishedItem(trackUri: string) {
    const item = await queueService.getQueuedItemByUri(this.partyId, trackUri);
    if (!item) return;
    await queueService.markAsPlayed(item.id);
    this.io.to(this.partyId).emit('queue:removed', { queueItemId: item.id });
  }

  private async pushNextSong(adapter: Awaited<ReturnType<typeof getAdapterForParty>>) {
    const nextItem = await queueService.getNextItem(this.partyId);
    if (!nextItem) return;

    const party = await partyService.getPartyById(this.partyId);
    const settings = party?.settings as PartySettings | null;

    if (settings?.lockOnDeck) {
      await queueService.lockItem(nextItem.id);
      this.io.to(this.partyId).emit('queue:item_locked', { queueItemId: nextItem.id });
    }

    await adapter.addToQueue(nextItem.trackUri);
    this.nextSongPushed = true;
  }
}
