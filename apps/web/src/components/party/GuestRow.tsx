import type { GuestSession } from '@auxqueue/shared';
import { AvatarBubble } from '../avatars/AvatarBubble';
import { TierBadge } from '../avatars/TierBadge';
import { Button } from '../ui/Button';

interface GuestRowProps {
  guest: GuestSession & { songsQueued?: number };
  isHost: boolean;
  onMute?: () => void;
  onUnmute?: () => void;
  onKick?: () => void;
  onBan?: () => void;
  onClick?: () => void;
}

const statusBadge: Record<GuestSession['status'], string> = {
  active: '',
  muted: '🔇',
  kicked: '🚫',
  banned: '⛔',
};

export function GuestRow({ guest, isHost, onMute, onUnmute, onKick, onBan, onClick }: GuestRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border hover:border-border-strong transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <AvatarBubble avatar={guest.avatar} size="md" />
        {guest.status !== 'active' && (
          <span className="absolute -bottom-1 -right-1 text-xs">{statusBadge[guest.status]}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{guest.displayName}</span>
          <TierBadge songsQueued={guest.songsQueued ?? 0} />
        </div>
        {guest.status !== 'active' && (
          <span className="text-xs text-white/40 capitalize">{guest.status}</span>
        )}
      </div>

      {isHost && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {guest.status === 'active' ? (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onMute?.(); }}>
              🔇
            </Button>
          ) : guest.status === 'muted' ? (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onUnmute?.(); }}>
              🔊
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => { e.stopPropagation(); onKick?.(); }}
          >
            Kick
          </Button>
        </div>
      )}
    </div>
  );
}
