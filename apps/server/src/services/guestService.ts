import { db } from '../db/client';
import { guestSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function joinParty(
  partyId: string,
  displayName: string,
  avatar: string,
  deviceFingerprint?: string,
) {
  const sessionToken = uuidv4();
  const [session] = await db
    .insert(guestSessions)
    .values({ partyId, displayName, avatar, deviceFingerprint, sessionToken })
    .returning();
  return { session, sessionToken };
}

export async function getGuestsByParty(partyId: string) {
  return db
    .select()
    .from(guestSessions)
    .where(and(eq(guestSessions.partyId, partyId), eq(guestSessions.status, 'active')));
}

export async function getGuestBySessionToken(token: string, partyId: string) {
  const [session] = await db
    .select()
    .from(guestSessions)
    .where(and(eq(guestSessions.sessionToken, token), eq(guestSessions.partyId, partyId)))
    .limit(1);
  return session ?? null;
}

export async function updateGuestStatus(
  guestId: string,
  status: 'active' | 'muted' | 'kicked' | 'banned',
) {
  const [session] = await db
    .update(guestSessions)
    .set({ status })
    .where(eq(guestSessions.id, guestId))
    .returning();
  return session;
}

export async function getGuestById(guestId: string) {
  const [session] = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.id, guestId))
    .limit(1);
  return session ?? null;
}
