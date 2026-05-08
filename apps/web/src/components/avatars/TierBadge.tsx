import { getTier } from '../../lib/tiers';

interface TierBadgeProps {
  songsQueued: number;
  showName?: boolean;
  size?: 'sm' | 'md';
}

export function TierBadge({ songsQueued, showName = false, size = 'sm' }: TierBadgeProps) {
  const tier = getTier(songsQueued);

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm',
      ].join(' ')}
      style={{ color: tier.color, background: `${tier.color}22`, border: `1px solid ${tier.color}44` }}
    >
      <span>{tier.emoji}</span>
      {showName && <span>{tier.name}</span>}
    </span>
  );
}
