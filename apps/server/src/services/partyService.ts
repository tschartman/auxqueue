import { db } from '../db/client';
import { parties } from '../db/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH, ROOM_CODE_PREFIX } from '@auxqueue/shared';
import type { PartySettings } from '@auxqueue/shared';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return `${ROOM_CODE_PREFIX}-${code}`;
}

export async function createParty(
  hostUserId: string,
  partyName: string | undefined,
  streamingService: string,
  settings: PartySettings,
) {
  let roomCode = generateRoomCode();
  // Retry until unique
  while (true) {
    const existing = await db
      .select({ id: parties.id })
      .from(parties)
      .where(and(eq(parties.roomCode, roomCode), eq(parties.status, 'active')))
      .limit(1);
    if (existing.length === 0) break;
    roomCode = generateRoomCode();
  }

  const [party] = await db
    .insert(parties)
    .values({ hostUserId, roomCode, partyName, streamingService, settings })
    .returning();

  return party;
}

export async function getPartyByCode(roomCode: string) {
  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.roomCode, roomCode), eq(parties.status, 'active')))
    .limit(1);
  return party ?? null;
}

export async function getPartyById(id: string) {
  const [party] = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
  return party ?? null;
}

export async function updateSettings(partyId: string, settings: Partial<PartySettings>) {
  const party = await getPartyById(partyId);
  if (!party) return null;
  const merged = { ...(party.settings as PartySettings), ...settings };
  const [updated] = await db
    .update(parties)
    .set({ settings: merged })
    .where(eq(parties.id, partyId))
    .returning();
  return updated;
}

export async function getActiveParties() {
  return db.select().from(parties).where(eq(parties.status, 'active'));
}

export async function getActivePartyForUser(userId: string) {
  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.hostUserId, userId), eq(parties.status, 'active')))
    .orderBy(desc(parties.createdAt))
    .limit(1);
  return party ?? null;
}

export async function cleanupOldParties() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await db
    .update(parties)
    .set({ status: 'ended', endedAt: new Date() })
    .where(and(eq(parties.status, 'active'), lt(parties.createdAt, cutoff)));
}

export async function endActivePartiesForUser(userId: string): Promise<string[]> {
  const active = await db
    .select({ id: parties.id })
    .from(parties)
    .where(and(eq(parties.hostUserId, userId), eq(parties.status, 'active')));
  if (active.length === 0) return [];
  await db
    .update(parties)
    .set({ status: 'ended', endedAt: new Date() })
    .where(and(eq(parties.hostUserId, userId), eq(parties.status, 'active')));
  return active.map((p) => p.id);
}

export async function endParty(partyId: string) {
  const [updated] = await db
    .update(parties)
    .set({ status: 'ended', endedAt: new Date() })
    .where(eq(parties.id, partyId))
    .returning();
  return updated;
}
