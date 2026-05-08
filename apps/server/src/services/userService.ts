import { db } from '../db/client';
import { users, userStats, streamingAccounts } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { TIER_DEFINITIONS } from '@auxqueue/shared';

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  avatar: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ email, displayName, avatar, passwordHash })
    .returning();

  await db.insert(userStats).values({ userId: user.id });

  return user;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function verifyPassword(user: { passwordHash: string | null }, password: string) {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function getStats(userId: string) {
  const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
  return stats ?? null;
}

export async function getTier(totalSongsQueued: number) {
  const tiers = [...TIER_DEFINITIONS].reverse();
  return tiers.find((t) => totalSongsQueued >= t.minSongs) ?? TIER_DEFINITIONS[0];
}

export async function updateUser(
  userId: string,
  data: { displayName?: string; avatar?: string },
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function getUserBySpotifyId(spotifyId: string) {
  const [row] = await db
    .select({ user: users })
    .from(users)
    .innerJoin(streamingAccounts, eq(streamingAccounts.userId, users.id))
    .where(
      eq(streamingAccounts.serviceUserId, spotifyId),
    )
    .limit(1);
  return row?.user ?? null;
}

export async function incrementSongsQueued(userId: string) {
  await db
    .update(userStats)
    .set({ totalSongsQueued: sql`${userStats.totalSongsQueued} + 1`, updatedAt: new Date() })
    .where(eq(userStats.userId, userId));
}

export async function incrementSongsPlayed(userId: string) {
  await db
    .update(userStats)
    .set({ totalSongsPlayed: sql`${userStats.totalSongsPlayed} + 1`, updatedAt: new Date() })
    .where(eq(userStats.userId, userId));
}

export async function incrementUpvotesReceived(userId: string) {
  await db
    .update(userStats)
    .set({
      totalUpvotesReceived: sql`${userStats.totalUpvotesReceived} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId));
}

export async function createOauthUser(
  email: string,
  displayName: string,
  avatar: string,
  oauthProvider: string,
  oauthId: string,
) {
  const [user] = await db
    .insert(users)
    .values({ email, displayName, avatar, oauthProvider, oauthId })
    .returning();
  await db.insert(userStats).values({ userId: user.id });
  return user;
}
