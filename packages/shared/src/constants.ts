import type { TierDefinition } from './types';

export const TIER_DEFINITIONS: TierDefinition[] = [
  { name: 'Listener', minSongs: 0, emoji: '🎧', color: '#9ca3af' },
  { name: 'Regular', minSongs: 10, emoji: '🎵', color: '#60a5fa' },
  { name: 'Selector', minSongs: 25, emoji: '🎶', color: '#a78bfa' },
  { name: 'Tastemaker', minSongs: 50, emoji: '🎸', color: '#f59e0b' },
  { name: 'DJ', minSongs: 100, emoji: '🎛️', color: '#ff6b6b' },
];

export const AVATARS = [
  '🎧', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁',
  '🎤', '🎼', '🎷', '🪗', '🪘', '🪕', '🎙️', '📻',
  '🦊', '🐺', '🦁', '🐯', '🦅', '🦋', '🐉', '🦄',
  '🌙', '⭐', '🔥', '💫', '🌊', '🌈', '💎', '🎭',
];

export const QUEUE_MODES = {
  VOTE: 'vote',
  OPEN: 'open',
  HOST: 'host',
} as const;

export type QueueMode = (typeof QUEUE_MODES)[keyof typeof QUEUE_MODES];

export const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_PREFIX = 'AUX';

export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_PARTY_NAME_LENGTH = 100;
export const DEFAULT_MAX_PER_GUEST = 5;
export const DEFAULT_VOTE_OUT_THRESHOLD = -3;
export const MAX_SEARCH_RESULTS = 10;
export const PLAYBACK_POLL_INTERVAL_MS = 3000;
export const NEXT_SONG_THRESHOLD_MS = 15000;
