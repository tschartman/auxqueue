import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';
import { PLAYBACK_POLL_INTERVAL_MS, NEXT_SONG_THRESHOLD_MS } from '@auxqueue/shared';
import { getAdapterForParty } from '../streaming/getAdapter';
import * as queueService from './queueService';
import * as partyService from './partyService';
import type { PartySettings } from '@auxqueue/shared';
import fs from 'fs';
import path from 'path';
import os from 'os';

function rateLimitFile(partyId: string) {
  return path.join(os.tmpdir(), `auxqueue-rl-${partyId}.json`);
}

function readPersistedPause(partyId: string): number {
  try {
    const data = JSON.parse(fs.readFileSync(rateLimitFile(partyId), 'utf8'));
    return typeof data.pausedUntil === 'number' ? data.pausedUntil : 0;
  } catch {
    return 0;
  }
}

function writePersistedPause(partyId: string, pausedUntil: number) {
  try {
    fs.writeFileSync(rateLimitFile(partyId), JSON.stringify({ pausedUntil }));
  } catch { /* best-effort */ }
}

export class PlaybackSyncEngine {
  private partyId: string;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastTrackUri: string | null = null;
  private nextSongPushed = false;
  private pausedUntil = 0;
  private idleStreak = 0; // consecutive polls with nothing playing

  constructor(
    partyId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
  ) {
    this.partyId = partyId;
    this.io = io;
    this.pausedUntil = readPersistedPause(partyId);
    if (this.pausedUntil > Date.now()) {
      const remainingSec = Math.round((this.pausedUntil - Date.now()) / 1000);
      console.warn(`[PlaybackEngine][${partyId}] restoring rate limit pause: ${remainingSec}s remaining`);
    }
  }

  start() {
    this.pollInterval = setInterval(() => this.poll(), PLAYBACK_POLL_INTERVAL_MS);
  }

  async pollNow() {
    return this.poll();
  }

  isRunning() {
    return this.pollInterval !== null;
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = null;
  }

  private async poll() {
    if (Date.now() < this.pausedUntil) return;
    try {
      const party = await partyService.getPartyById(this.partyId);
      if (!party || party.status !== 'active') {
        console.log(`[PlaybackEngine][${this.partyId}] party ended, stopping engine`);
        this.stop();
        return;
      }
      // Adaptive backoff: when nothing is playing, poll less often
      // idle < 12 polls (1 min) → every 5s; < 60 polls (5 min) → every 30s; else → every 60s
      if (this.idleStreak >= 60 && this.idleStreak % 12 !== 0) return;
      if (this.idleStreak >= 12 && this.idleStreak % 6 !== 0) return;

      const adapter = await getAdapterForParty(this.partyId);
      const state = await adapter.getPlaybackState();
      console.log(`[PlaybackEngine][${this.partyId}] poll: isPlaying=${state.isPlaying} track=${state.track?.uri ?? 'none'} progress=${state.progressMs}/${state.durationMs}`);

      if (!state.track) {
        this.idleStreak++;
      } else {
        this.idleStreak = 0;
      }

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
        writePersistedPause(this.partyId, this.pausedUntil);
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
