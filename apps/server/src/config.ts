import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  SPOTIFY_CLIENT_ID: z.string().default(''),
  SPOTIFY_CLIENT_SECRET: z.string().default(''),
  SPOTIFY_REDIRECT_URI: z.string().default('http://localhost:3001/api/auth/oauth/spotify/cb'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = configSchema.parse(process.env);
