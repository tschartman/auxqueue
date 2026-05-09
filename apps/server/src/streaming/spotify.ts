import type { Track, PlaybackState } from '@auxqueue/shared';
import type { StreamingAdapter, TokenPair } from './adapter';
import { config } from '../config';

const SPOTIFY_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
].join(' ');

export class SpotifyAdapter implements StreamingAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: config.SPOTIFY_REDIRECT_URI,
      scope: SPOTIFY_SCOPES,
    });
    return `${SPOTIFY_AUTH_BASE}/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<TokenPair> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.SPOTIFY_REDIRECT_URI,
    });

    const res = await this.authRequest(params);
    return this.parseTokenResponse(res);
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const res = await this.authRequest(params);
    return this.parseTokenResponse(res);
  }

  async search(query: string, limit = 10): Promise<Track[]> {
    const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit) });
    const res = await this.apiRequest(`/search?${params}`);
    const data = await res.json();

    return (data.tracks?.items ?? []).map((item: SpotifyTrack) => ({
      uri: item.uri,
      title: item.name,
      artist: item.artists.map((a: { name: string }) => a.name).join(', '),
      album: item.album.name,
      durationMs: item.duration_ms,
      albumArtUrl: item.album.images[0]?.url ?? '',
      isExplicit: item.explicit,
    }));
  }

  async getPlaybackState(): Promise<PlaybackState> {
    const res = await this.apiRequest('/me/player');

    if (res.status === 204) {
      return { isPlaying: false, track: null, progressMs: 0, durationMs: 0 };
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? 5);
      throw new Error(`rate_limited:${retryAfter}`);
    }

    if (!res.ok) {
      throw new Error(`Spotify API error: ${res.status}`);
    }

    const data = await res.json();
    const item = data.item;

    return {
      isPlaying: data.is_playing,
      track: item
        ? {
            uri: item.uri,
            title: item.name,
            artist: item.artists.map((a: { name: string }) => a.name).join(', '),
            album: item.album.name,
            durationMs: item.duration_ms,
            albumArtUrl: item.album.images[0]?.url ?? '',
            isExplicit: item.explicit,
          }
        : null,
      progressMs: data.progress_ms ?? 0,
      durationMs: item?.duration_ms ?? 0,
    };
  }

  async play(): Promise<void> {
    await this.apiRequest('/me/player/play', { method: 'PUT' });
  }

  async playTrack(trackUri: string): Promise<void> {
    await this.apiRequest('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ uris: [trackUri] }),
    });
  }

  async pause(): Promise<void> {
    await this.apiRequest('/me/player/pause', { method: 'PUT' });
  }

  async skipToNext(): Promise<void> {
    await this.apiRequest('/me/player/next', { method: 'POST' });
  }

  async addToQueue(trackUri: string): Promise<void> {
    await this.apiRequest(`/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: 'POST',
    });
  }

  private async apiRequest(path: string, options: RequestInit = {}) {
    return fetch(`${SPOTIFY_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  }

  private async authRequest(params: URLSearchParams) {
    const credentials = Buffer.from(
      `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`,
    ).toString('base64');

    const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!res.ok) throw new Error(`Spotify auth error: ${res.status}`);
    return res.json();
  }

  private parseTokenResponse(data: SpotifyTokenResponse): TokenPair {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}

interface SpotifyTrack {
  uri: string;
  name: string;
  explicit: boolean;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}
