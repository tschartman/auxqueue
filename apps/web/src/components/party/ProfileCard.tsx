import type { GuestSession } from '@auxqueue/shared';
import { AvatarBubble } from '../avatars/AvatarBubble';
import { TierBadge } from '../avatars/TierBadge';
import { Button } from '../ui/Button';

interface ProfileCardProps {
  guest: GuestSession & { songsQueued?: number; upvotesReceived?: number };
  isHost: boolean;
  onClose: () => void;
  onKick?: () => void;
  onBan?: () => void;
}

export function ProfileCard({ guest, isHost, onClose, onKick, onBan }: ProfileCardProps) {
  const songsQueued = guest.songsQueued ?? 0;
  const upvotes = guest.upvotesReceived ?? 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <AvatarBubble avatar={guest.avatar} size="xl" />
      <div className="text-center">
        <h3 className="font-heading text-xl font-bold text-white">{guest.displayName}</h3>
        <TierBadge songsQueued={songsQueued} showName size="md" />
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="glass rounded-xl p-3 text-center border border-border">
          <p className="text-2xl font-bold text-white">{songsQueued}</p>
          <p className="text-xs text-white/40 mt-0.5">Songs Added</p>
        </div>
        <div className="glass rounded-xl p-3 text-center border border-border">
          <p className="text-2xl font-bold text-success">+{upvotes}</p>
          <p className="text-xs text-white/40 mt-0.5">Upvotes</p>
        </div>
      </div>

      {isHost && (
        <div className="flex gap-2 w-full">
          <Button variant="danger" fullWidth onClick={onKick}>
            Kick
          </Button>
          <Button variant="danger" fullWidth onClick={onBan}>
            Ban
          </Button>
        </div>
      )}

      <Button variant="ghost" fullWidth onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
