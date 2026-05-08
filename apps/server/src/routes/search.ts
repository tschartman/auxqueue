import type { FastifyPluginAsync } from 'fastify';
import type { PartySettings } from '@auxqueue/shared';
import { requirePartyAuth } from '../middleware/auth';
import { getAdapterForParty } from '../streaming/getAdapter';
import * as partyService from '../services/partyService';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:id/search', { preHandler: requirePartyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { q } = request.query as { q?: string };
    if (!q?.trim()) return reply.code(400).send({ error: 'Missing query param q' });

    try {
      const [adapter, party] = await Promise.all([
        getAdapterForParty(id),
        partyService.getPartyById(id),
      ]);

      const settings = party?.settings as PartySettings | null;
      const results = await adapter.search(q.trim());

      const filtered = settings?.explicitFilter
        ? results.filter((t) => !t.isExplicit)
        : results;

      return { results: filtered };
    } catch (err: any) {
      if (err.message === 'No Spotify account linked for host') {
        return reply.code(503).send({ error: 'Streaming service not connected' });
      }
      throw err;
    }
  });
};
