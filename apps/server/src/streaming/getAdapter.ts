import { db } from '../db/client';
import { streamingAccounts, parties } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { SpotifyAdapter } from './spotify';

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getAdapterForParty(partyId: string): Promise<SpotifyAdapter> {
  const [party] = await db
    .select({ hostUserId: parties.hostUserId })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);

  if (!party) throw new Error('Party not found');

  const [account] = await db
    .select()
    .from(streamingAccounts)
    .where(
      and(
        eq(streamingAccounts.userId, party.hostUserId),
        eq(streamingAccounts.service, 'spotify'),
      ),
    )
    .limit(1);

  if (!account) throw new Error('No Spotify account linked for host');

  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - Date.now() < REFRESH_BUFFER_MS;

  if (needsRefresh && account.refreshToken) {
    const refresher = new SpotifyAdapter('');
    const tokens = await refresher.refreshToken(account.refreshToken);

    await db
      .update(streamingAccounts)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || account.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      })
      .where(eq(streamingAccounts.id, account.id));

    return new SpotifyAdapter(tokens.accessToken);
  }

  return new SpotifyAdapter(account.accessToken);
}
