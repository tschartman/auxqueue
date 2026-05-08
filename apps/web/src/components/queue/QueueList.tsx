import type { QueueItem as QueueItemType } from '@auxqueue/shared';
import { QueueItem } from './QueueItem';

interface QueueListProps {
  items: QueueItemType[];
  showVotes: boolean;
  isHost: boolean;
  onVote?: (itemId: string, direction: 1 | -1 | 0) => void;
  onRemove?: (itemId: string) => void;
}

export function QueueList({ items, showVotes, isHost, onVote, onRemove }: QueueListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3">🎶</span>
        <p className="text-white/50 font-medium">Queue is empty</p>
        <p className="text-sm text-white/30 mt-1">Be the first to add a song</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="transition-all duration-300 ease-out"
          style={{ order: i }}
        >
          <QueueItem
            item={item}
            rank={i + 1}
            showVotes={showVotes}
            isHost={isHost}
            onVote={onVote ? (dir) => onVote(item.id, dir) : undefined}
            onRemove={onRemove ? () => onRemove(item.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
