# CLAUDE.md — AuxQueue

## Project Overview
AuxQueue is a shared party queue app. One host connects a streaming service (Spotify for MVP) and plays music on a speaker. Guests join via browser (PWA), search for songs, add them to a shared queue, and optionally vote to control play order. The host manages permissions and playback.

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend** (`apps/web`): React 18 + Vite + TypeScript + Tailwind CSS + Zustand
- **Backend** (`apps/server`): Node.js + Fastify + TypeScript + Socket.io
- **Database**: PostgreSQL 16 via Drizzle ORM
- **Cache/Pub-Sub**: Redis 7
- **Shared** (`packages/shared`): Types, constants, Zod validation schemas
- **Auth**: Lucia Auth (email/password + Google OAuth + Spotify OAuth)
- **Local Dev**: Docker Compose for Postgres + Redis

## Architecture Principles
- **REST for mutations, WebSocket for real-time state sync.** Song additions, votes, and guest management go through REST (for validation/auth) and then broadcast via WebSocket to all room clients.
- **Streaming service is a server-side adapter.** The client never talks to Spotify directly. All search and playback calls are proxied through our API, which handles token refresh and rate limiting.
- **Queue ordering is always server-authoritative.** Clients receive the ordered queue via WebSocket events. The server computes sort order based on queue mode (vote score, insertion order, or manual).
- **Ephemeral room state lives in Redis, persistent data in Postgres.** Guest connection counts, playback state cache, and rate limits go in Redis. Users, parties, queue items, and votes go in Postgres.

## Directory Layout
```
auxqueue/
├── apps/
│   ├── web/              # React PWA
│   │   └── src/
│   │       ├── routes/       # Page components (Landing, HostSetup, GuestJoin, Party)
│   │       ├── components/   # UI components organized by feature
│   │       ├── stores/       # Zustand stores (party, queue, user, socket)
│   │       ├── hooks/        # Custom hooks (useSocket, useParty, useQueue)
│   │       ├── lib/          # Utilities (socket client, API client, tier helpers)
│   │       └── types/
│   └── server/           # Fastify backend
│       └── src/
│           ├── routes/       # REST endpoints
│           ├── services/     # Business logic
│           ├── streaming/    # Streaming service adapters (Spotify, etc.)
│           ├── socket/       # Socket.io event handlers
│           ├── db/           # Drizzle schema + migrations
│           └── middleware/   # Auth, rate limiting
└── packages/
    └── shared/           # Shared types, constants, validation
```

## Code Style & Conventions
- TypeScript strict mode everywhere
- Named exports, no default exports (except React route components)
- Use `interface` for object shapes, `type` for unions/intersections
- Zod schemas in `packages/shared` for all API request/response validation
- Fastify routes use schema validation via Zod + fastify-type-provider-zod
- Database queries go through service layer, never directly in routes
- Socket.io events use typed event maps (see `packages/shared/src/types.ts`)
- Tailwind for all styling, no CSS files, no inline style objects
- Component files: PascalCase. Utilities/hooks: camelCase
- Environment variables: validated at startup via Zod in `config.ts`

## Key Implementation Details

### Room Codes
Format: `AUX-XXXX` where X is uppercase alphanumeric (excluding ambiguous chars: 0, O, I, L, 1). Generated server-side, checked for uniqueness against active parties.

### Queue Ordering
```typescript
// Vote mode: sort by net_score DESC, then created_at ASC (tie-break)
// Open mode: sort by created_at ASC
// Host mode: sort by position ASC (manually set by host)
```

### Vote Processing
When a vote comes in:
1. Upsert into `votes` table (unique constraint handles dedup)
2. Recalculate `queue_item_scores` for that item
3. If net_score <= vote_out_threshold, mark item as `voted_out`, remove from queue
4. Re-sort the entire queue for the party
5. Broadcast `queue:reordered` to all room clients

### Playback Sync Engine
One instance per active party, runs on the server:
- Polls Spotify `GET /me/player` every 3 seconds
- Broadcasts `playback:update` to room
- When current track has ≤15 seconds remaining AND next song hasn't been pushed:
  - Lock top queue item (if lock_on_deck enabled)
  - Call Spotify `POST /me/player/queue?uri=...`
  - Mark as pushed
- On track change detection: update now_playing, mark previous as played, broadcast

### Guest Sessions
- Anonymous guests get a `session_id` + `session_token` (UUID) on join
- Token passed in WebSocket handshake `auth` field and as Bearer token for REST calls
- Device fingerprint stored for kick/ban enforcement
- Guest sessions are scoped to a single party

### Spotify Token Management
- Access tokens cached in Redis with TTL matching expiry
- Auto-refresh via refresh token when expired or within 5 minutes of expiry
- All Spotify API calls go through a wrapper that handles token refresh transparently
- Rate limiting: track request counts in Redis, back off if approaching 180/min

## Database Migrations
Use Drizzle Kit for migrations:
```bash
cd apps/server
pnpm drizzle-kit generate    # generate migration from schema changes
pnpm drizzle-kit migrate     # apply migrations
```

## Local Development
```bash
docker compose up -d          # Start Postgres + Redis
pnpm install                  # Install all deps
pnpm dev                      # Start both web + server in dev mode
```

## Environment Variables
```
# apps/server/.env
DATABASE_URL=postgresql://auxqueue:auxqueue@localhost:5432/auxqueue
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-32-chars>
SPOTIFY_CLIENT_ID=<from spotify developer dashboard>
SPOTIFY_CLIENT_SECRET=<from spotify developer dashboard>
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/auth/oauth/spotify/cb
GOOGLE_CLIENT_ID=<optional for MVP>
GOOGLE_CLIENT_SECRET=<optional for MVP>
CORS_ORIGIN=http://localhost:5173

# apps/web/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## Testing Strategy
- Unit tests for services (queue ordering, vote processing, tier calculation)
- Integration tests for API routes (supertest)
- Socket.io integration tests (socket.io-client in test)
- No E2E tests for MVP; manual QA against Spotify sandbox

## Important Constraints
- Spotify Web API requires Premium for playback control — handle gracefully if host doesn't have Premium
- Spotify rate limit is ~180 req/min — the playback polling (1 req / 3 sec = 20/min per party) leaves headroom but needs monitoring at scale
- WebSocket reconnection: client should auto-reconnect with exponential backoff and re-fetch queue state on reconnect
- PWA: must work on mobile Safari (iOS) and Chrome (Android) — test both
- No localStorage in the PWA for auth — use in-memory state + httpOnly cookies for session persistence