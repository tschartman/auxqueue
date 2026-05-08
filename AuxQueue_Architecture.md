# AuxQueue — Technical Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS (React PWA)                       │
│                                                                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │  Host Client  │  │ Guest Client │  │ Guest Client │  ...     │
│   │  (rich UI)    │  │ (lean UI)    │  │ (lean UI)    │          │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└──────────┼─────────────────┼─────────────────┼──────────────────┘
           │ REST + WebSocket│                  │
           ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                   (Node.js + Fastify)                             │
│                                                                   │
│   ┌────────────┐  ┌────────────┐  ┌─────────────┐               │
│   │  REST API   │  │  WebSocket │  │   Auth       │              │
│   │  Routes     │  │  Server    │  │   Middleware  │              │
│   └─────┬──────┘  └─────┬──────┘  └──────┬──────┘               │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│                                                                   │
│   ┌────────────┐  ┌────────────┐  ┌─────────────┐               │
│   │   Party     │  │   Queue    │  │   Streaming  │              │
│   │   Service   │  │   Service  │  │   Adapter    │              │
│   └─────┬──────┘  └─────┬──────┘  └──────┬──────┘               │
│         │                │                │                       │
│   ┌────────────┐  ┌────────────┐         │                       │
│   │   User     │  │   Vote     │         │                       │
│   │   Service  │  │   Service  │         │                       │
│   └─────┬──────┘  └─────┬──────┘         │                       │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────────┐ ┌──────────┐ ┌────────────────────┐
│   PostgreSQL     │ │  Redis   │ │  Streaming APIs    │
│   (persistent)   │ │  (cache  │ │  ┌──────────────┐  │
│                  │ │  + pub/  │ │  │   Spotify     │  │
│  - users         │ │  sub +   │ │  │   Web API     │  │
│  - parties       │ │  rooms)  │ │  └──────────────┘  │
│  - queue_items   │ │          │ │  ┌──────────────┐  │
│  - votes         │ │          │ │  │   Apple       │  │
│  - user_stats    │ │          │ │  │   MusicKit    │  │
│  - guest_sessions│ │          │ │  └──────────────┘  │
└──────────────────┘ └──────────┘ └────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite + TypeScript | Fast builds, strong typing, PWA support via vite-plugin-pwa |
| **Styling** | Tailwind CSS | Rapid UI development, mobile-first utilities |
| **State (client)** | Zustand | Lightweight, works well with WebSocket-driven updates |
| **Backend** | Node.js + Fastify + TypeScript | High-performance HTTP, plugin ecosystem, native TypeScript |
| **WebSocket** | Socket.io (on Fastify) | Rooms, namespaces, auto-reconnect, fallback to polling |
| **Database** | PostgreSQL 16 | Relational integrity for votes/queue/users, JSONB for settings |
| **Cache / Pub-Sub** | Redis 7 | Ephemeral room state, rate limiting, Socket.io adapter for horizontal scaling |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great migration tooling |
| **Auth** | Lucia Auth + OAuth adapters | Lightweight, supports multiple OAuth providers |
| **Deployment** | Vercel (frontend) + Fly.io (backend) + Neon (Postgres) + Upstash (Redis) | Cost-effective, scales well, good DX |

---

## 3. Directory Structure

```
auxqueue/
├── apps/
│   ├── web/                          # React PWA (frontend)
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── sw.js
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/
│   │   │   │   ├── Landing.tsx
│   │   │   │   ├── HostSetup.tsx
│   │   │   │   ├── HostConnect.tsx
│   │   │   │   ├── GuestJoin.tsx
│   │   │   │   ├── Party.tsx         # Main party view (host + guest)
│   │   │   │   └── Profile.tsx       # Account profile page (future)
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Primitives (Button, Toggle, Input, Modal)
│   │   │   │   ├── queue/
│   │   │   │   │   ├── QueueList.tsx
│   │   │   │   │   ├── QueueItem.tsx
│   │   │   │   │   ├── NowPlaying.tsx
│   │   │   │   │   └── VoteControls.tsx
│   │   │   │   ├── party/
│   │   │   │   │   ├── GuestRow.tsx
│   │   │   │   │   ├── GuestCard.tsx
│   │   │   │   │   ├── ProfileCard.tsx
│   │   │   │   │   ├── ApprovalQueue.tsx
│   │   │   │   │   └── PartySettings.tsx
│   │   │   │   ├── search/
│   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   └── SearchResults.tsx
│   │   │   │   ├── avatars/
│   │   │   │   │   ├── AvatarPicker.tsx
│   │   │   │   │   ├── AvatarBubble.tsx
│   │   │   │   │   └── TierBadge.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── PartyHeader.tsx
│   │   │   │       ├── TabBar.tsx
│   │   │   │       └── Toast.tsx
│   │   │   ├── stores/
│   │   │   │   ├── partyStore.ts     # Party config, room state
│   │   │   │   ├── queueStore.ts     # Queue items, now playing
│   │   │   │   ├── userStore.ts      # Current user identity
│   │   │   │   └── socketStore.ts    # WebSocket connection state
│   │   │   ├── hooks/
│   │   │   │   ├── useSocket.ts      # Socket.io connection + event handlers
│   │   │   │   ├── useParty.ts       # Party actions (create, join, leave)
│   │   │   │   ├── useQueue.ts       # Queue actions (add, vote, remove)
│   │   │   │   └── usePlayback.ts    # Playback state subscription
│   │   │   ├── lib/
│   │   │   │   ├── socket.ts         # Socket.io client singleton
│   │   │   │   ├── api.ts            # REST API client (fetch wrapper)
│   │   │   │   ├── tiers.ts          # Tier definitions + helpers
│   │   │   │   └── avatars.ts        # Avatar list + constants
│   │   │   └── types/
│   │   │       └── index.ts          # Shared TypeScript types
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── server/                       # Node.js backend
│       ├── src/
│       │   ├── index.ts              # Entry point, Fastify server + Socket.io setup
│       │   ├── config.ts             # Environment config
│       │   ├── routes/
│       │   │   ├── auth.ts           # POST /auth/login, /auth/register, /auth/oauth/*
│       │   │   ├── parties.ts        # POST /parties, GET /parties/:code
│       │   │   ├── queue.ts          # POST /parties/:id/queue, DELETE /parties/:id/queue/:itemId
│       │   │   ├── search.ts         # GET /parties/:id/search?q=...
│       │   │   └── users.ts          # GET /users/me, PATCH /users/me
│       │   ├── services/
│       │   │   ├── partyService.ts   # Party CRUD, room code generation, settings
│       │   │   ├── queueService.ts   # Queue operations, ordering, vote-out logic
│       │   │   ├── voteService.ts    # Vote processing, score calculation, reordering
│       │   │   ├── guestService.ts   # Guest sessions, mute/kick/ban, fingerprinting
│       │   │   ├── userService.ts    # Account CRUD, stats, tier calculation
│       │   │   ├── playbackService.ts# Playback state polling, next-song push logic
│       │   │   └── searchService.ts  # Proxied search to streaming APIs
│       │   ├── streaming/
│       │   │   ├── adapter.ts        # Abstract streaming adapter interface
│       │   │   ├── spotify.ts        # Spotify Web API implementation
│       │   │   └── appleMusic.ts     # Apple MusicKit implementation (post-MVP)
│       │   ├── socket/
│       │   │   ├── handler.ts        # Socket.io event handler registration
│       │   │   ├── events.ts         # Event type constants
│       │   │   └── middleware.ts     # Socket auth middleware
│       │   ├── db/
│       │   │   ├── schema.ts         # Drizzle schema definitions
│       │   │   ├── migrations/       # SQL migration files
│       │   │   └── client.ts         # Database connection
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT/session validation
│       │   │   └── rateLimit.ts      # Redis-backed rate limiting
│       │   └── types/
│       │       └── index.ts
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   └── shared/                       # Shared types, constants, validation
│       ├── src/
│       │   ├── types.ts              # Shared TypeScript interfaces
│       │   ├── constants.ts          # Tiers, avatars, queue modes, limits
│       │   ├── validation.ts         # Zod schemas for API payloads
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                      # Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                        # Turborepo config
├── .env.example
├── docker-compose.yml                # Local Postgres + Redis
└── README.md
```

---

## 4. Database Schema

```sql
-- Users (account holders only)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    avatar          VARCHAR(10) NOT NULL DEFAULT '🎧',
    password_hash   VARCHAR(255),                       -- null for OAuth-only users
    oauth_provider  VARCHAR(20),                        -- 'google', 'apple', null
    oauth_id        VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User stats (lifetime, for tier system)
CREATE TABLE user_stats (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_songs_queued      INTEGER NOT NULL DEFAULT 0,
    total_upvotes_received  INTEGER NOT NULL DEFAULT 0,
    total_parties_attended  INTEGER NOT NULL DEFAULT 0,
    total_songs_played      INTEGER NOT NULL DEFAULT 0,
    total_songs_voted_out   INTEGER NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Linked streaming accounts
CREATE TABLE streaming_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service         VARCHAR(20) NOT NULL,               -- 'spotify', 'apple', 'youtube', etc.
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    service_user_id VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, service)
);

-- Parties
CREATE TABLE parties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_user_id    UUID NOT NULL REFERENCES users(id),
    room_code       VARCHAR(10) UNIQUE NOT NULL,        -- e.g., 'AUX-AB3F'
    party_name      VARCHAR(100),
    streaming_service VARCHAR(20) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    -- settings shape:
    -- {
    --   "queue_mode": "vote" | "open" | "host",
    --   "approval_required": false,
    --   "explicit_filter": false,
    --   "max_per_guest": 5,
    --   "vote_out_threshold": -3,
    --   "lock_on_deck": true
    -- }
    status          VARCHAR(10) NOT NULL DEFAULT 'active', -- 'active', 'ended'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_parties_room_code ON parties(room_code) WHERE status = 'active';
CREATE INDEX idx_parties_host ON parties(host_user_id);

-- Guest sessions (anonymous participants)
CREATE TABLE guest_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id            UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    display_name        VARCHAR(50) NOT NULL,
    avatar              VARCHAR(10) NOT NULL DEFAULT '🎵',
    device_fingerprint  VARCHAR(255),
    status              VARCHAR(10) NOT NULL DEFAULT 'active', -- 'active', 'muted', 'kicked', 'banned'
    user_id             UUID REFERENCES users(id),             -- set if guest is also an account holder
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_sessions_party ON guest_sessions(party_id);
CREATE INDEX idx_guest_sessions_fingerprint ON guest_sessions(device_fingerprint, party_id);

-- Queue items
CREATE TABLE queue_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id        UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    track_title     VARCHAR(255) NOT NULL,
    track_artist    VARCHAR(255) NOT NULL,
    track_duration  VARCHAR(10),                        -- "3:45"
    track_uri       VARCHAR(500) NOT NULL,              -- streaming service URI
    track_album_art VARCHAR(500),                       -- album art URL
    added_by_user   UUID REFERENCES users(id),          -- set if added by account holder
    added_by_guest  UUID REFERENCES guest_sessions(id), -- set if added by guest
    status          VARCHAR(15) NOT NULL DEFAULT 'queued',
    -- 'pending' (awaiting approval), 'queued', 'playing', 'played', 'removed', 'voted_out'
    position        INTEGER,                            -- for host-control and open modes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_items_party ON queue_items(party_id, status);
CREATE INDEX idx_queue_items_added_by_user ON queue_items(added_by_user);
CREATE INDEX idx_queue_items_added_by_guest ON queue_items(added_by_guest);

-- Votes
CREATE TABLE votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id   UUID NOT NULL REFERENCES queue_items(id) ON DELETE CASCADE,
    voter_user_id   UUID REFERENCES users(id),
    voter_guest_id  UUID REFERENCES guest_sessions(id),
    direction       SMALLINT NOT NULL,                  -- 1 = upvote, -1 = downvote
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(queue_item_id, voter_user_id),
    UNIQUE(queue_item_id, voter_guest_id),
    CHECK (
        (voter_user_id IS NOT NULL AND voter_guest_id IS NULL) OR
        (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
    )
);

CREATE INDEX idx_votes_queue_item ON votes(queue_item_id);

-- Materialized vote counts (updated via trigger or app logic)
CREATE TABLE queue_item_scores (
    queue_item_id   UUID PRIMARY KEY REFERENCES queue_items(id) ON DELETE CASCADE,
    upvotes         INTEGER NOT NULL DEFAULT 0,
    downvotes       INTEGER NOT NULL DEFAULT 0,
    net_score       INTEGER NOT NULL DEFAULT 0
);

-- Friends (account holders only)
CREATE TABLE friendships (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);
```

---

## 5. API Design

### REST Endpoints

#### Auth
```
POST   /api/auth/register          { email, password, display_name, avatar }
POST   /api/auth/login             { email, password }
GET    /api/auth/oauth/spotify      → redirect to Spotify OAuth
GET    /api/auth/oauth/spotify/cb   → callback, exchange code for tokens
GET    /api/auth/oauth/google       → redirect to Google OAuth
GET    /api/auth/oauth/google/cb    → callback
POST   /api/auth/logout
```

#### Parties
```
POST   /api/parties                { party_name, streaming_service, settings }
                                   → { party_id, room_code }
GET    /api/parties/:code          → { party_id, party_name, host_avatar, queue_mode, guest_count }
                                   (public info for join screen)
POST   /api/parties/:id/join       { display_name, avatar, device_fingerprint }
                                   → { session_id, session_token }
DELETE /api/parties/:id            (host only — ends party)
PATCH  /api/parties/:id/settings   { ...partial settings }  (host only)
```

#### Queue
```
GET    /api/parties/:id/queue      → { items: [...], now_playing: {...} }
POST   /api/parties/:id/queue      { track_uri, track_title, track_artist, ... }
                                   → { queue_item_id, status: 'queued' | 'pending' }
DELETE /api/parties/:id/queue/:itemId   (host only, or adder removing own song)
```

#### Votes
```
POST   /api/parties/:id/queue/:itemId/vote    { direction: 1 | -1 | 0 }
                                              (0 = remove vote)
```

#### Search
```
GET    /api/parties/:id/search?q=espresso     → { results: [...] }
       (proxied to host's connected streaming service)
```

#### Guests (Host Only)
```
GET    /api/parties/:id/guests                → { guests: [...] }
PATCH  /api/parties/:id/guests/:guestId       { status: 'muted' | 'active' }
DELETE /api/parties/:id/guests/:guestId       { action: 'kick' | 'ban' }
```

#### Users
```
GET    /api/users/me               → { user, stats, tier }
PATCH  /api/users/me               { display_name, avatar }
```

#### Playback (Host Only)
```
POST   /api/parties/:id/playback/play
POST   /api/parties/:id/playback/pause
POST   /api/parties/:id/playback/skip
GET    /api/parties/:id/playback/state   → { is_playing, current_track, progress_ms, duration_ms }
```

---

## 6. WebSocket Events

### Client → Server
```typescript
// Join the party room
'party:join'        { party_id, session_token }

// Leave the party room
'party:leave'       { party_id }

// Add song (can also use REST)
'queue:add'         { track_uri, track_title, track_artist, track_duration }

// Vote on a song
'queue:vote'        { queue_item_id, direction: 1 | -1 | 0 }

// Host: approve/reject pending song
'queue:approve'     { queue_item_id }
'queue:reject'      { queue_item_id }

// Host: remove song
'queue:remove'      { queue_item_id }

// Host: playback control
'playback:play'     {}
'playback:pause'    {}
'playback:skip'     {}

// Host: guest management
'guest:mute'        { guest_id }
'guest:unmute'      { guest_id }
'guest:kick'        { guest_id }
'guest:ban'         { guest_id }

// Host: settings change
'party:settings'    { ...partial settings }
```

### Server → Client (broadcast to room)
```typescript
// Full queue state (sent on join)
'queue:state'       { items: [...], now_playing: {...} }

// Queue item added
'queue:added'       { item: {...} }

// Queue reordered (after vote or mode change)
'queue:reordered'   { items: [...] }

// Song voted out
'queue:voted_out'   { queue_item_id, title }

// Song removed by host
'queue:removed'     { queue_item_id }

// Now playing changed
'playback:update'   { is_playing, current_track, progress_ms, duration_ms }

// Track changed
'playback:track_changed'  { track: {...}, added_by: {...} }

// Guest joined
'guest:joined'      { guest: { id, name, avatar, tier } }

// Guest left
'guest:left'        { guest_id }

// Guest status changed (muted/kicked/banned)
'guest:status'      { guest_id, status }

// Settings updated
'party:settings_updated'  { settings: {...} }

// Approval needed (host only)
'queue:pending'     { item: {...} }

// Toast notification
'toast'             { message, type: 'info' | 'success' | 'warning' }
```

---

## 7. Streaming Service Adapter

```typescript
// Abstract interface — each service implements this
interface StreamingAdapter {
  // Auth
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<TokenPair>;
  refreshToken(refreshToken: string): Promise<TokenPair>;

  // Search
  search(query: string, limit?: number): Promise<Track[]>;

  // Playback (host device)
  getPlaybackState(): Promise<PlaybackState>;
  play(): Promise<void>;
  pause(): Promise<void>;
  skipToNext(): Promise<void>;
  addToQueue(trackUri: string): Promise<void>;
}

interface Track {
  uri: string;           // service-specific URI
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  album_art_url: string;
  is_explicit: boolean;
}

interface PlaybackState {
  is_playing: boolean;
  track: Track | null;
  progress_ms: number;
  duration_ms: number;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}
```

### Spotify Implementation Key Details
```typescript
// Base URL: https://api.spotify.com/v1
// Auth: https://accounts.spotify.com/authorize

// Scopes needed:
// user-read-playback-state
// user-modify-playback-state
// user-read-currently-playing
// streaming (for future Web Playback SDK)

// Key endpoints:
// GET  /search?q={query}&type=track&limit=10
// GET  /me/player
// POST /me/player/queue?uri={spotify:track:xxx}
// POST /me/player/next
// PUT  /me/player/play
// PUT  /me/player/pause

// Rate limits: ~180 req/min
// Token refresh: access tokens expire in 1 hour
// Requires Premium for playback control
```

---

## 8. Playback Sync Engine

The playback sync engine is a server-side process that runs per active party:

```typescript
class PlaybackSyncEngine {
  private partyId: string;
  private adapter: StreamingAdapter;
  private pollInterval: NodeJS.Timer;
  private lastTrackUri: string | null = null;
  private nextSongPushed: boolean = false;

  start() {
    // Poll every 3 seconds
    this.pollInterval = setInterval(() => this.poll(), 3000);
  }

  stop() {
    clearInterval(this.pollInterval);
  }

  private async poll() {
    const state = await this.adapter.getPlaybackState();

    // Broadcast playback state to all clients
    io.to(this.partyId).emit('playback:update', state);

    // Detect track change
    if (state.track?.uri !== this.lastTrackUri) {
      this.lastTrackUri = state.track?.uri || null;
      this.nextSongPushed = false;
      // Mark previous as played, update now_playing in DB
      await this.handleTrackChange(state.track);
    }

    // Check if we need to push the next song
    if (state.is_playing && state.track && !this.nextSongPushed) {
      const remaining = state.duration_ms - state.progress_ms;

      if (remaining <= 15000) { // 15 seconds remaining
        await this.pushNextSong();
      }
    }
  }

  private async pushNextSong() {
    const nextItem = await queueService.getNextItem(this.partyId);
    if (!nextItem) return;

    // Lock the item if lock_on_deck is enabled
    const settings = await partyService.getSettings(this.partyId);
    if (settings.lock_on_deck) {
      await queueService.lockItem(nextItem.id);
      io.to(this.partyId).emit('queue:item_locked', { queue_item_id: nextItem.id });
    }

    // Push to streaming service queue
    await this.adapter.addToQueue(nextItem.track_uri);
    this.nextSongPushed = true;

    // Mark as transitioning
    await queueService.markAsNext(nextItem.id);
  }

  private async handleTrackChange(track: Track | null) {
    // Update now_playing, mark previous as played, shift queue
    io.to(this.partyId).emit('playback:track_changed', { track });
  }
}
```

---

## 9. Redis Data Structures

```
# Active room state (ephemeral, TTL: 24h)
room:{party_id}:state          → JSON { guest_count, is_playing, current_track_uri }
room:{party_id}:guests         → SET of session_ids
room:{party_id}:banned         → SET of device_fingerprints

# Rate limiting
ratelimit:search:{party_id}    → counter (max 30/min)
ratelimit:add:{session_id}     → counter (max 10/min)
ratelimit:vote:{session_id}    → counter (max 60/min)

# Spotify token cache (avoid hitting DB on every API call)
token:{user_id}:{service}      → JSON { access_token, expires_at }
```

---

## 10. Security

### Authentication Flows
- **Account holders**: JWT-based sessions. Short-lived access token (15 min) + long-lived refresh token (7 days). Stored in httpOnly cookies.
- **Guest sessions**: Session token generated on join, scoped to a single party. Stored in memory (Zustand) and passed via WebSocket auth. Expires when party ends or guest is kicked.
- **Streaming OAuth**: Tokens stored encrypted in `streaming_accounts` table. Auto-refreshed when expired.

### Authorization
- Every WebSocket event and REST call validates the caller's identity against the party
- Host-only actions (playback, guest management, settings, approval) verify `party.host_user_id === caller`
- Guest actions (add, vote) verify guest session is active (not muted/kicked/banned)
- Queue item removal: host can remove any, guests can only remove their own

### Anti-Abuse
- Device fingerprinting via FingerprintJS (open source) for anonymous guests
- Rate limiting on all write operations (Redis-backed)
- Max songs per guest enforced server-side (count of `queue_items` where `status = 'queued'` and `added_by_guest = session_id`)
- Vote deduplication enforced by unique constraint on `(queue_item_id, voter_guest_id)`
- WebSocket connections require valid session token in handshake

---

## 11. Deployment Architecture

```
                    ┌─────────────┐
                    │   Vercel     │
                    │   (CDN)      │
                    │   React PWA  │
                    └──────┬──────┘
                           │ HTTPS
                           ▼
                    ┌─────────────┐
                    │   Fly.io     │
                    │   Node.js    │ ← auto-scales, 1-3 instances
                    │   Fastify +  │
                    │   Socket.io  │
                    └──┬───────┬──┘
                       │       │
              ┌────────▼──┐ ┌──▼────────┐
              │   Neon     │ │  Upstash  │
              │ PostgreSQL │ │  Redis    │
              │ (serverless│ │ (serverless│
              │  Postgres) │ │  Redis)   │
              └────────────┘ └───────────┘
```

### Scaling Considerations
- Socket.io with Redis adapter enables horizontal scaling across multiple Fly.io instances
- Playback sync engines run as lightweight loops per party; at scale, could be extracted to a worker service
- Neon Postgres handles connection pooling automatically
- CDN-served PWA means minimal frontend infrastructure

---

## 12. MVP Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Project scaffolding (monorepo, configs, Docker compose)
- Database schema + migrations
- User auth (email/password + Google OAuth)
- Spotify OAuth + token management
- Basic REST API structure

### Phase 2: Party Core (Week 3-4)
- Party creation + room code generation
- Guest join flow (REST + WebSocket)
- Song search (proxied to Spotify)
- Queue CRUD (add, remove)
- WebSocket room management + event broadcasting

### Phase 3: Queue Intelligence (Week 5-6)
- Vote system (up/down/remove, score calculation, reordering)
- Vote-out logic
- Queue mode switching (host/open/vote)
- Approval flow
- Lock-on-deck logic

### Phase 4: Playback (Week 6-7)
- Spotify playback state polling
- Playback sync engine (next-song push)
- Play/pause/skip controls
- Track change detection + now playing updates

### Phase 5: Guest Management & Polish (Week 7-8)
- Mute/kick/ban with device fingerprinting
- Profile cards + tier system
- Avatar picker
- Toast notifications
- PWA manifest + service worker
- Error handling, loading states, reconnection logic

### Phase 6: Testing & Launch Prep (Week 8-9)
- Integration tests for queue sync, voting, playback
- Load testing WebSocket connections (target: 50 concurrent guests per party)
- Spotify API compliance review
- Security audit (auth, rate limiting, input validation)
- Production deployment