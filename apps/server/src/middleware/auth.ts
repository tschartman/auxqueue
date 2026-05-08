import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db/client';
import { guestSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearer(request);
  if (!token) return reply.code(401).send({ error: 'Unauthorized' });

  const payload = verifyToken(token);
  if (payload?.type !== 'access') {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
  (request as any).userId = payload.userId;
}

/** Accepts either a host JWT or a guest session token. Sets userId or guestId on request. */
export async function requirePartyAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearer(request);
  if (!token) return reply.code(401).send({ error: 'Unauthorized' });

  // Try JWT first
  const payload = verifyToken(token);
  if (payload?.type === 'access') {
    (request as any).userId = payload.userId;
    return;
  }

  // Try guest session token — party ID must be in route params
  const partyId = (request.params as any)?.id as string | undefined;
  if (!partyId) return reply.code(401).send({ error: 'Unauthorized' });

  const [session] = await db
    .select()
    .from(guestSessions)
    .where(and(eq(guestSessions.sessionToken, token), eq(guestSessions.partyId, partyId)))
    .limit(1);

  if (!session || session.status === 'kicked' || session.status === 'banned') {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  (request as any).guestId = session.id;
  (request as any).guestDisplayName = session.displayName;
  (request as any).guestAvatar = session.avatar;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, config.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

function extractBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
