import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { ZodError } from 'zod';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { partyRoutes } from './routes/parties';
import { queueRoutes } from './routes/queue';
import { searchRoutes } from './routes/search';
import { userRoutes } from './routes/users';
import { registerSocketHandler, startEnginesForActiveParties } from './socket/handler';
import { setIo } from './socket/io';
import { cleanupOldParties } from './services/partyService';

const fastify = Fastify({ logger: config.NODE_ENV !== 'test' });

fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: 'Validation error', issues: error.issues });
  }
  fastify.log.error(error);
  return reply.code(500).send({ error: 'Internal server error' });
});

async function start() {
  await fastify.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    strictPreflight: false,
  });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyRateLimit, {
    global: false, // opt-in per route
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(partyRoutes, { prefix: '/api/parties' });
  await fastify.register(queueRoutes, { prefix: '/api/parties' });
  await fastify.register(searchRoutes, { prefix: '/api/parties' });
  await fastify.register(userRoutes, { prefix: '/api/users' });

  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(fastify.server, {
    cors: { origin: config.CORS_ORIGIN, credentials: true },
  });

  setIo(io);
  registerSocketHandler(io);
  startEnginesForActiveParties(io).catch(() => {});

  cleanupOldParties().catch(() => {});
  setInterval(() => cleanupOldParties().catch(() => {}), 60 * 60 * 1000);

  const shutdown = async () => {
    fastify.log.info('Shutting down...');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
