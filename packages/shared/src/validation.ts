import { z } from 'zod';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PARTY_NAME_LENGTH,
  DEFAULT_MAX_PER_GUEST,
  DEFAULT_VOTE_OUT_THRESHOLD,
} from './constants';

export const partySettingsSchema = z.object({
  queueMode: z.enum(['vote', 'open', 'host']).default('vote'),
  approvalRequired: z.boolean().default(false),
  explicitFilter: z.boolean().default(false),
  maxPerGuest: z.number().int().min(1).max(50).default(DEFAULT_MAX_PER_GUEST),
  voteOutThreshold: z.number().int().min(-10).max(-1).default(DEFAULT_VOTE_OUT_THRESHOLD),
  lockOnDeck: z.boolean().default(true),
});

export const createPartySchema = z.object({
  partyName: z.string().min(1).max(MAX_PARTY_NAME_LENGTH).optional(),
  streamingService: z.enum(['spotify', 'apple', 'youtube']),
  settings: partySettingsSchema.optional(),
});

export const joinPartySchema = z.object({
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
  avatar: z.string().min(1).max(10),
  deviceFingerprint: z.string().optional(),
});

export const addToQueueSchema = z.object({
  trackUri: z.string().min(1),
  trackTitle: z.string().min(1).max(255),
  trackArtist: z.string().min(1).max(255),
  trackDuration: z.string().optional(),
  trackAlbumArt: z.string().url().optional(),
});

export const voteSchema = z.object({
  direction: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const updateSettingsSchema = partySettingsSchema.partial();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
  avatar: z.string().min(1).max(10),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH).optional(),
  avatar: z.string().min(1).max(10).optional(),
});

export const guestActionSchema = z.object({
  status: z.enum(['active', 'muted']),
});
