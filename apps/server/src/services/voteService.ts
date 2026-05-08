import { db } from '../db/client';
import { votes, queueItemScores, queueItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as userService from './userService';

export async function castVote(
  queueItemId: string,
  direction: 1 | -1 | 0,
  voterUserId?: string,
  voterGuestId?: string,
) {
  if (direction === 0) {
    // Remove vote
    if (voterUserId) {
      await db
        .delete(votes)
        .where(and(eq(votes.queueItemId, queueItemId), eq(votes.voterUserId, voterUserId)));
    } else if (voterGuestId) {
      await db
        .delete(votes)
        .where(and(eq(votes.queueItemId, queueItemId), eq(votes.voterGuestId, voterGuestId)));
    }
  } else {
    // Upsert vote — delete existing then insert
    if (voterUserId) {
      await db
        .delete(votes)
        .where(and(eq(votes.queueItemId, queueItemId), eq(votes.voterUserId, voterUserId)));
    } else if (voterGuestId) {
      await db
        .delete(votes)
        .where(and(eq(votes.queueItemId, queueItemId), eq(votes.voterGuestId, voterGuestId)));
    }
    await db.insert(votes).values({ queueItemId, voterUserId, voterGuestId, direction });

    // Credit upvote to the song's adder if they're a registered user
    if (direction === 1) {
      const [item] = await db
        .select({ addedByUser: queueItems.addedByUser })
        .from(queueItems)
        .where(eq(queueItems.id, queueItemId))
        .limit(1);
      if (item?.addedByUser) {
        userService.incrementUpvotesReceived(item.addedByUser).catch(() => {});
      }
    }
  }

  return recalculateScore(queueItemId);
}

async function recalculateScore(queueItemId: string) {
  const rows = await db.select().from(votes).where(eq(votes.queueItemId, queueItemId));
  const upvotes = rows.filter((v) => v.direction === 1).length;
  const downvotes = rows.filter((v) => v.direction === -1).length;
  const netScore = upvotes - downvotes;

  await db
    .insert(queueItemScores)
    .values({ queueItemId, upvotes, downvotes, netScore })
    .onConflictDoUpdate({
      target: queueItemScores.queueItemId,
      set: { upvotes, downvotes, netScore },
    });

  return { upvotes, downvotes, netScore };
}
