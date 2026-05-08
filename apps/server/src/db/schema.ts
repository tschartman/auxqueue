import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  avatar: varchar('avatar', { length: 10 }).notNull().default('🎧'),
  passwordHash: varchar('password_hash', { length: 255 }),
  oauthProvider: varchar('oauth_provider', { length: 20 }),
  oauthId: varchar('oauth_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userStats = pgTable('user_stats', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalSongsQueued: integer('total_songs_queued').notNull().default(0),
  totalUpvotesReceived: integer('total_upvotes_received').notNull().default(0),
  totalPartiesAttended: integer('total_parties_attended').notNull().default(0),
  totalSongsPlayed: integer('total_songs_played').notNull().default(0),
  totalSongsVotedOut: integer('total_songs_voted_out').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const streamingAccounts = pgTable(
  'streaming_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    service: varchar('service', { length: 20 }).notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    serviceUserId: varchar('service_user_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserService: uniqueIndex('unique_user_service').on(t.userId, t.service),
  }),
);

export const parties = pgTable(
  'parties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostUserId: uuid('host_user_id')
      .notNull()
      .references(() => users.id),
    roomCode: varchar('room_code', { length: 10 }).unique().notNull(),
    partyName: varchar('party_name', { length: 100 }),
    streamingService: varchar('streaming_service', { length: 20 }).notNull(),
    settings: jsonb('settings').notNull().default('{}'),
    status: varchar('status', { length: 10 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => ({
    roomCodeIdx: index('idx_parties_room_code').on(t.roomCode).where(sql`status = 'active'`),
    hostIdx: index('idx_parties_host').on(t.hostUserId),
  }),
);

export const guestSessions = pgTable(
  'guest_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    avatar: varchar('avatar', { length: 10 }).notNull().default('🎵'),
    deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
    sessionToken: varchar('session_token', { length: 255 }),
    status: varchar('status', { length: 10 }).notNull().default('active'),
    userId: uuid('user_id').references(() => users.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    partyIdx: index('idx_guest_sessions_party').on(t.partyId),
    fingerprintIdx: index('idx_guest_sessions_fingerprint').on(t.deviceFingerprint, t.partyId),
    sessionTokenIdx: index('idx_guest_sessions_token').on(t.sessionToken),
  }),
);

export const queueItems = pgTable(
  'queue_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    trackTitle: varchar('track_title', { length: 255 }).notNull(),
    trackArtist: varchar('track_artist', { length: 255 }).notNull(),
    trackDuration: varchar('track_duration', { length: 10 }),
    trackUri: varchar('track_uri', { length: 500 }).notNull(),
    trackAlbumArt: varchar('track_album_art', { length: 500 }),
    addedByUser: uuid('added_by_user').references(() => users.id),
    addedByGuest: uuid('added_by_guest').references(() => guestSessions.id),
    status: varchar('status', { length: 15 }).notNull().default('queued'),
    position: integer('position'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    partyStatusIdx: index('idx_queue_items_party').on(t.partyId, t.status),
    addedByUserIdx: index('idx_queue_items_added_by_user').on(t.addedByUser),
    addedByGuestIdx: index('idx_queue_items_added_by_guest').on(t.addedByGuest),
  }),
);

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queueItemId: uuid('queue_item_id')
      .notNull()
      .references(() => queueItems.id, { onDelete: 'cascade' }),
    voterUserId: uuid('voter_user_id').references(() => users.id),
    voterGuestId: uuid('voter_guest_id').references(() => guestSessions.id),
    direction: smallint('direction').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    queueItemIdx: index('idx_votes_queue_item').on(t.queueItemId),
    uniqueUserVote: uniqueIndex('unique_user_vote').on(t.queueItemId, t.voterUserId),
    uniqueGuestVote: uniqueIndex('unique_guest_vote').on(t.queueItemId, t.voterGuestId),
  }),
);

export const queueItemScores = pgTable('queue_item_scores', {
  queueItemId: uuid('queue_item_id')
    .primaryKey()
    .references(() => queueItems.id, { onDelete: 'cascade' }),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  netScore: integer('net_score').notNull().default(0),
});

export const friendships = pgTable(
  'friendships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
  }),
);
