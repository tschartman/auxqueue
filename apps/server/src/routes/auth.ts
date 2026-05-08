import type { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema } from '@auxqueue/shared';
import * as userService from '../services/userService';
import * as partyService from '../services/partyService';
import { signToken, signRefreshToken, verifyToken } from '../middleware/auth';
import { config } from '../config';
import { SpotifyAdapter } from '../streaming/spotify';
import { db } from '../db/client';
import { streamingAccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await userService.getUserByEmail(body.email);
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const user = await userService.createUser(
      body.email,
      body.password,
      body.displayName,
      body.avatar,
    );

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    };
  });

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await userService.getUserByEmail(body.email);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const valid = await userService.verifyPassword(user, body.password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    };
  });

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  });

  fastify.post('/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>).refreshToken;
    if (!token) return reply.code(401).send({ error: 'No refresh token' });

    const payload = verifyToken(token);
    if (payload?.type !== 'refresh') {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    const user = await userService.getUserById(payload.userId);
    if (!user) return reply.code(401).send({ error: 'User not found' });

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  });

  fastify.get('/me', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>).refreshToken;
    if (!token) return reply.code(401).send({ error: 'Not authenticated' });

    const payload = verifyToken(token);
    if (payload?.type !== 'refresh') {
      return reply.code(401).send({ error: 'Invalid or expired session' });
    }

    const user = await userService.getUserById(payload.userId);
    if (!user) return reply.code(401).send({ error: 'User not found' });

    const activeParty = await partyService.getActivePartyForUser(user.id);
    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      accessToken,
      user: { id: user.id, displayName: user.displayName, avatar: user.avatar },
      activePartyId: activeParty?.id ?? null,
    };
  });

  fastify.get('/oauth/spotify', async (request, reply) => {
    const spotify = new SpotifyAdapter('');
    return reply.redirect(spotify.getAuthUrl());
  });

  fastify.get('/oauth/spotify/cb', async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string };

    if (error || !code) {
      return reply.redirect(`${config.CORS_ORIGIN}/host/connect?error=spotify_denied`);
    }

    try {
      const spotify = new SpotifyAdapter('');
      const tokens = await spotify.exchangeCode(code);

      // Fetch the Spotify user profile to get their user ID
      const profileAdapter = new SpotifyAdapter(tokens.accessToken);
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const profile = await profileRes.json() as { id: string; email?: string; display_name?: string };

      // Find or create a user account linked to this Spotify ID
      let user = await userService.getUserBySpotifyId(profile.id);
      if (!user) {
        const email = profile.email ?? `${profile.id}@spotify.placeholder`;
        const existing = await userService.getUserByEmail(email);
        if (existing) {
          user = existing;
        } else {
          user = await userService.createOauthUser(
            email,
            profile.display_name ?? 'DJ',
            '🎧',
            'spotify',
            profile.id,
          );
        }
      }

      // Upsert streaming account tokens
      await db
        .insert(streamingAccounts)
        .values({
          userId: user.id,
          service: 'spotify',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          tokenExpiresAt: tokens.expiresAt,
          serviceUserId: profile.id,
        })
        .onConflictDoUpdate({
          target: [streamingAccounts.userId, streamingAccounts.service],
          set: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenExpiresAt: tokens.expiresAt,
          },
        });

      const accessToken = signToken(user.id);
      const refreshToken = signRefreshToken(user.id);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      // If user already has an active party, send them straight back to it
      const activeParty = await partyService.getActivePartyForUser(user.id);
      if (activeParty) {
        return reply.redirect(
          `${config.CORS_ORIGIN}/party/${activeParty.id}?accessToken=${accessToken}`,
        );
      }

      return reply.redirect(
        `${config.CORS_ORIGIN}/host/connect?accessToken=${accessToken}&spotifyConnected=1`,
      );
    } catch (err) {
      fastify.log.error(err, 'Spotify OAuth callback error');
      return reply.redirect(`${config.CORS_ORIGIN}/host/connect?error=spotify_failed`);
    }
  });

  fastify.get('/oauth/google', async (_request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });

  fastify.get('/oauth/google/cb', async (_request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
};
