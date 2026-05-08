export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  totalSongsQueued: number;
  totalUpvotesReceived: number;
  totalPartiesAttended: number;
  totalSongsPlayed: number;
  totalSongsVotedOut: number;
}

export interface GuestSession {
  id: string;
  partyId: string;
  displayName: string;
  avatar: string;
  status: 'active' | 'muted' | 'kicked' | 'banned';
  userId?: string;
  joinedAt: string;
}

export interface PartySettings {
  queueMode: 'vote' | 'open' | 'host';
  approvalRequired: boolean;
  explicitFilter: boolean;
  maxPerGuest: number;
  voteOutThreshold: number;
  lockOnDeck: boolean;
}

export interface Party {
  id: string;
  hostUserId: string;
  roomCode: string;
  partyName: string;
  streamingService: string;
  settings: PartySettings;
  status: 'active' | 'ended';
  createdAt: string;
  endedAt?: string;
}

export interface Track {
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  albumArtUrl: string;
  isExplicit: boolean;
}

export interface QueueItem {
  id: string;
  partyId: string;
  trackTitle: string;
  trackArtist: string;
  trackDuration?: string;
  trackUri: string;
  trackAlbumArt?: string;
  addedByUser?: string;
  addedByGuest?: string;
  addedByName?: string;
  addedByAvatar?: string;
  status: 'pending' | 'queued' | 'playing' | 'played' | 'removed' | 'voted_out';
  position?: number;
  netScore: number;
  upvotes: number;
  downvotes: number;
  myVote?: 1 | -1 | 0;
  createdAt: string;
}

export interface Vote {
  id: string;
  queueItemId: string;
  voterUserId?: string;
  voterGuestId?: string;
  direction: 1 | -1;
  createdAt: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  track: Track | null;
  progressMs: number;
  durationMs: number;
}

export interface TierDefinition {
  name: string;
  minSongs: number;
  emoji: string;
  color: string;
}

export interface ClientToServerEvents {
  'party:join': (data: { partyId: string; sessionToken: string }) => void;
  'party:leave': (data: { partyId: string }) => void;
  'queue:add': (data: {
    trackUri: string;
    trackTitle: string;
    trackArtist: string;
    trackDuration?: string;
    trackAlbumArt?: string;
  }) => void;
  'queue:vote': (data: { queueItemId: string; direction: 1 | -1 | 0 }) => void;
  'queue:approve': (data: { queueItemId: string }) => void;
  'queue:reject': (data: { queueItemId: string }) => void;
  'queue:remove': (data: { queueItemId: string }) => void;
  'playback:play': () => void;
  'playback:pause': () => void;
  'playback:skip': () => void;
  'guest:mute': (data: { guestId: string }) => void;
  'guest:unmute': (data: { guestId: string }) => void;
  'guest:kick': (data: { guestId: string }) => void;
  'guest:ban': (data: { guestId: string }) => void;
  'party:settings': (data: Partial<PartySettings>) => void;
}

export interface ServerToClientEvents {
  'queue:state': (data: { items: QueueItem[]; nowPlaying: QueueItem | null }) => void;
  'queue:added': (data: { item: QueueItem }) => void;
  'queue:reordered': (data: { items: QueueItem[] }) => void;
  'queue:voted_out': (data: { queueItemId: string; title: string }) => void;
  'queue:removed': (data: { queueItemId: string }) => void;
  'queue:pending': (data: { item: QueueItem }) => void;
  'queue:item_locked': (data: { queueItemId: string }) => void;
  'playback:update': (data: PlaybackState) => void;
  'playback:track_changed': (data: {
    track: Track | null;
    addedBy?: { name: string; avatar: string };
  }) => void;
  'guest:joined': (data: { guest: { id: string; name: string; avatar: string; tier: string } }) => void;
  'guest:left': (data: { guestId: string }) => void;
  'guest:status': (data: { guestId: string; status: GuestSession['status'] }) => void;
  'party:settings_updated': (data: { settings: PartySettings }) => void;
  toast: (data: { message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}
