import type { FastifyPluginAsync } from 'fastify';
import { updateUserSchema } from '@auxqueue/shared';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', async (request, reply) => {
    // TODO: authenticate, userService.getMe
    return reply.code(501).send({ error: 'Not implemented' });
  });

  fastify.patch('/me', async (request, reply) => {
    const body = updateUserSchema.parse(request.body);
    // TODO: authenticate, userService.updateMe
    return reply.code(501).send({ error: 'Not implemented' });
  });
};
