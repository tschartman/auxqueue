import type { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { config } from '../config';

const redis = new Redis(config.REDIS_URL);

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return current <= max;
}

export function searchRateLimiter(max = 30) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const partyId = (request.params as any).id;
    const key = `ratelimit:search:${partyId}`;
    const allowed = await rateLimit(key, max, 60);
    if (!allowed) {
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }
  };
}

export { redis };
