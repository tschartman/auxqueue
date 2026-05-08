import type { QueueItem } from '@auxqueue/shared';
import { Button } from '../ui/Button';

interface ApprovalQueueProps {
  items: QueueItem[];
  onApprove: (itemId: string) => void;
  onReject: (itemId: string) => void;
}

export function ApprovalQueue({ items, onApprove, onReject }: ApprovalQueueProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3">✅</span>
        <p className="text-white/50 font-medium">No pending songs</p>
        <p className="text-sm text-white/30 mt-1">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/50">{items.length} song{items.length !== 1 ? 's' : ''} waiting for approval</p>
      {items.map((item) => (
        <div key={item.id} className="glass rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            {item.trackAlbumArt ? (
              <img src={item.trackAlbumArt} alt={item.trackTitle} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">🎵</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{item.trackTitle}</p>
              <p className="text-xs text-white/50 truncate">{item.trackArtist}</p>
              {item.addedByName && (
                <p className="text-xs text-white/30 mt-0.5">by {item.addedByName}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" fullWidth onClick={() => onReject(item.id)}>
              ✕ Reject
            </Button>
            <Button variant="primary" size="sm" fullWidth onClick={() => onApprove(item.id)}>
              ✓ Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
