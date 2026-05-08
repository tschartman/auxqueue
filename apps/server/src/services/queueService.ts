import { db } from '../db/client';
import { queueItems, queueItemScores, guestSessions, parties, users } from '../db/schema';
import { eq, and, asc, desc, sql, count } from 'drizzle-orm';
import type { QueueItem, PartySettings } from '@auxqueue/shared';
import * as userService from './userService';

export async function getQueue(partyId: string): Promise<QueueItem[]> {
  // Look up queue mode to determine sort order
  const [party] = await db
    .select({ settings: parties.settings })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);

  const mode = (party?.settings as PartySettings | null)?.queueMode ?? 'vote';

  const orderBy =
    mode === 'host'
      ? [asc(queueItems.position), asc(queueItems.createdAt)]
      : mode === 'open'
      ? [asc(queueItems.createdAt)]
      : [
          desc(sql<number>`COALESCE(${queueItemScores.netScore}, 0)`),
          asc(queueItems.createdAt),
        ];

  const rows = await db
    .select({
      id: queueItems.id,
      partyId: queueItems.partyId,
      trackTitle: queueItems.trackTitle,
      trackArtist: queueItems.trackArtist,
      trackDuration: queueItems.trackDuration,
      trackUri: queueItems.trackUri,
      trackAlbumArt: queueItems.trackAlbumArt,
      addedByUser: queueItems.addedByUser,
      addedByGuest: queueItems.addedByGuest,
      status: queueItems.status,
      position: queueItems.position,
      createdAt: queueItems.createdAt,
      netScore: sql<number>`COALESCE(${queueItemScores.netScore}, 0)`,
      upvotes: sql<number>`COALESCE(${queueItemScores.upvotes}, 0)`,
      downvotes: sql<number>`COALESCE(${queueItemScores.downvotes}, 0)`,
      guestDisplayName: guestSessions.displayName,
      guestAvatar: guestSessions.avatar,
      userDisplayName: users.displayName,
      userAvatar: users.avatar,
    })
    .from(queueItems)
    .leftJoin(queueItemScores, eq(queueItems.id, queueItemScores.queueItemId))
    .leftJoin(guestSessions, eq(queueItems.addedByGuest, guestSessions.id))
    .leftJoin(users, eq(queueItems.addedByUser, users.id))
    .where(and(eq(queueItems.partyId, partyId), eq(queueItems.status, 'queued')))
    .orderBy(...orderBy);

  return rows.map(toQueueItem);
}

export async function getQueueItemById(itemId: string): Promise<QueueItem | null> {
  const rows = await db
    .select({
      id: queueItems.id,
      partyId: queueItems.partyId,
      trackTitle: queueItems.trackTitle,
      trackArtist: queueItems.trackArtist,
      trackDuration: queueItems.trackDuration,
      trackUri: queueItems.trackUri,
      trackAlbumArt: queueItems.trackAlbumArt,
      addedByUser: queueItems.addedByUser,
      addedByGuest: queueItems.addedByGuest,
      status: queueItems.status,
      position: queueItems.position,
      createdAt: queueItems.createdAt,
      netScore: sql<number>`COALESCE(${queueItemScores.netScore}, 0)`,
      upvotes: sql<number>`COALESCE(${queueItemScores.upvotes}, 0)`,
      downvotes: sql<number>`COALESCE(${queueItemScores.downvotes}, 0)`,
      guestDisplayName: guestSessions.displayName,
      guestAvatar: guestSessions.avatar,
      userDisplayName: users.displayName,
      userAvatar: users.avatar,
    })
    .from(queueItems)
    .leftJoin(queueItemScores, eq(queueItems.id, queueItemScores.queueItemId))
    .leftJoin(guestSessions, eq(queueItems.addedByGuest, guestSessions.id))
    .leftJoin(users, eq(queueItems.addedByUser, users.id))
    .where(eq(queueItems.id, itemId))
    .limit(1);

  return rows[0] ? toQueueItem(rows[0]) : null;
}

export async function countGuestQueuedItems(partyId: string, guestId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(queueItems)
    .where(
      and(
        eq(queueItems.partyId, partyId),
        eq(queueItems.addedByGuest, guestId),
        eq(queueItems.status, 'queued'),
      ),
    );
  return row?.n ?? 0;
}

export async function addToQueue(
  partyId: string,
  track: {
    trackUri: string;
    trackTitle: string;
    trackArtist: string;
    trackDuration?: string;
    trackAlbumArt?: string;
  },
  addedByUser?: string,
  addedByGuest?: string,
  isPending = false,
) {
  const status = isPending ? 'pending' : 'queued';
  const [item] = await db
    .insert(queueItems)
    .values({ partyId, ...track, addedByUser, addedByGuest, status })
    .returning();

  // Only create score entry for queued items (not pending)
  if (!isPending) {
    await db.insert(queueItemScores).values({ queueItemId: item.id });
  }

  if (addedByUser) {
    userService.incrementSongsQueued(addedByUser).catch(() => {});
  }

  return item;
}

export async function approveQueueItem(itemId: string): Promise<QueueItem | null> {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'queued' })
    .where(and(eq(queueItems.id, itemId), eq(queueItems.status, 'pending')))
    .returning();

  if (!item) return null;

  await db
    .insert(queueItemScores)
    .values({ queueItemId: itemId })
    .onConflictDoNothing();

  return getQueueItemById(itemId);
}

export async function rejectQueueItem(itemId: string) {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'removed' })
    .where(and(eq(queueItems.id, itemId), eq(queueItems.status, 'pending')))
    .returning();
  return item;
}

export async function removeFromQueue(itemId: string) {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'removed' })
    .where(eq(queueItems.id, itemId))
    .returning();
  return item;
}

export async function getNextItem(partyId: string) {
  const [party] = await db
    .select({ settings: parties.settings })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);

  const mode = (party?.settings as PartySettings | null)?.queueMode ?? 'vote';

  if (mode === 'vote') {
    const [item] = await db
      .select({ qi: queueItems })
      .from(queueItems)
      .leftJoin(queueItemScores, eq(queueItems.id, queueItemScores.queueItemId))
      .where(and(eq(queueItems.partyId, partyId), eq(queueItems.status, 'queued')))
      .orderBy(
        desc(sql<number>`COALESCE(${queueItemScores.netScore}, 0)`),
        asc(queueItems.createdAt),
      )
      .limit(1);
    return item?.qi ?? null;
  }

  if (mode === 'host') {
    const [item] = await db
      .select()
      .from(queueItems)
      .where(and(eq(queueItems.partyId, partyId), eq(queueItems.status, 'queued')))
      .orderBy(asc(queueItems.position), asc(queueItems.createdAt))
      .limit(1);
    return item ?? null;
  }

  // open mode: FIFO
  const [item] = await db
    .select()
    .from(queueItems)
    .where(and(eq(queueItems.partyId, partyId), eq(queueItems.status, 'queued')))
    .orderBy(asc(queueItems.createdAt))
    .limit(1);
  return item ?? null;
}

export async function getQueuedItemByUri(partyId: string, trackUri: string) {
  const [item] = await db
    .select()
    .from(queueItems)
    .where(
      and(
        eq(queueItems.partyId, partyId),
        eq(queueItems.trackUri, trackUri),
        eq(queueItems.status, 'queued'),
      ),
    )
    .orderBy(asc(queueItems.createdAt))
    .limit(1);
  return item ?? null;
}

export async function lockItem(itemId: string) {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'queued' })
    .where(eq(queueItems.id, itemId))
    .returning();
  return item;
}

export async function markAsPlayed(itemId: string) {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'played' })
    .where(eq(queueItems.id, itemId))
    .returning();

  if (item?.addedByUser) {
    userService.incrementSongsPlayed(item.addedByUser).catch(() => {});
  }

  return item;
}

export async function markAsVotedOut(itemId: string) {
  const [item] = await db
    .update(queueItems)
    .set({ status: 'voted_out' })
    .where(eq(queueItems.id, itemId))
    .returning();
  return item;
}

// ─── Internal mapper ─────────────────────────────────────────────────────────

function toQueueItem(row: {
  id: string; partyId: string; trackTitle: string; trackArtist: string;
  trackDuration: string | null; trackUri: string; trackAlbumArt: string | null;
  addedByUser: string | null; addedByGuest: string | null; status: string;
  position: number | null; createdAt: Date; netScore: number; upvotes: number;
  downvotes: number; guestDisplayName: string | null; guestAvatar: string | null;
  userDisplayName: string | null; userAvatar: string | null;
}): QueueItem {
  const addedByName = row.userDisplayName ?? row.guestDisplayName ?? undefined;
  const addedByAvatar = row.userAvatar ?? row.guestAvatar ?? undefined;

  return {
    id: row.id,
    partyId: row.partyId,
    trackTitle: row.trackTitle,
    trackArtist: row.trackArtist,
    trackDuration: row.trackDuration ?? undefined,
    trackUri: row.trackUri,
    trackAlbumArt: row.trackAlbumArt ?? undefined,
    addedByUser: row.addedByUser ?? undefined,
    addedByGuest: row.addedByGuest ?? undefined,
    addedByName,
    addedByAvatar,
    status: row.status as QueueItem['status'],
    position: row.position ?? undefined,
    createdAt: row.createdAt.toISOString(),
    netScore: row.netScore,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    myVote: 0,
  };
}
