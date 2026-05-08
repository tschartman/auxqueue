import type { Track, PlaybackState } from '@auxqueue/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface StreamingAdapter {
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<TokenPair>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  search(query: string, limit?: number): Promise<Track[]>;
  getPlaybackState(): Promise<PlaybackState>;
  play(): Promise<void>;
  pause(): Promise<void>;
  skipToNext(): Promise<void>;
  addToQueue(trackUri: string): Promise<void>;
}
