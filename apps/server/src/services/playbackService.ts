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
  private pausedUntil = 0;

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
    if (Date.now() < this.pausedUntil) return;
    try {
      const adapter = await getAdapterForParty(this.partyId);
      const state = await adapter.getPlaybackState();
      this.io.to(this.partyId).emit('playback:update', state);

      const currentUri = state.track?.uri ?? null;

      if (currentUri !== this.lastTrackUri) {
        const wasPlaying = this.lastTrackUri !== null;
        this.lastTrackUri = currentUri;
        this.nextSongPushed = false;

        if (currentUri) {
          // Check if this track is from our queue
          const queuedItem = await queueService.getQueuedItemByUri(this.partyId, currentUri);

          if (queuedItem) {
            // Our song is playing — mark it played
            await queueService.markAsPlayed(queuedItem.id);
            this.io.to(this.partyId).emit('queue:removed', { queueItemId: queuedItem.id });
          } else {
            // A song NOT from our queue started — override with our next item if we have one
            const nextItem = await queueService.getNextItem(this.partyId);
            if (nextItem) {
              console.log(`[PlaybackEngine][${this.partyId}] Non-queue track detected, overriding with ${nextItem.trackUri}`);
              await adapter.playTrack(nextItem.trackUri);
              this.lastTrackUri = null; // reset so next poll detects the change
              this.nextSongPushed = false;
              return;
            }
          }
        }

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
    } catch (err: any) {
      if (err?.message?.startsWith('rate_limited:')) {
        const seconds = Number(err.message.split(':')[1]) || 10;
        this.pausedUntil = Date.now() + seconds * 1000;
        console.warn(`[PlaybackEngine][${this.partyId}] rate limited, pausing ${seconds}s`);
      } else {
        console.error(`[PlaybackEngine][${this.partyId}] poll error:`, err);
      }
    }
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
