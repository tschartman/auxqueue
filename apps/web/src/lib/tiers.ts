import { TIER_DEFINITIONS } from '@auxqueue/shared';

export function getTier(totalSongsQueued: number) {
  const tiers = [...TIER_DEFINITIONS].reverse();
  return tiers.find((t) => totalSongsQueued >= t.minSongs) ?? TIER_DEFINITIONS[0];
}

export { TIER_DEFINITIONS };
