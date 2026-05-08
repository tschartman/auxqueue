import type { QueueItem as QueueItemType } from '@auxqueue/shared';
import { VoteControls } from './VoteControls';
import { AvatarBubble } from '../avatars/AvatarBubble';

interface QueueItemProps {
  item: QueueItemType;
  rank: number;
  showVotes: boolean;
  isHost: boolean;
  onVote?: (direction: 1 | -1 | 0) => void;
  onRemove?: () => void;
}

export function QueueItem({ item, rank, showVotes, isHost, onVote, onRemove }: QueueItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border hover:border-border-strong transition-colors group">
      <span className="w-5 text-xs font-bold text-white/25 tabular-nums text-center flex-shrink-0">
        {rank}
      </span>

      {item.trackAlbumArt ? (
        <img
          src={item.trackAlbumArt}
          alt={item.trackTitle}
          className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-white/5"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
          🎵
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{item.trackTitle}</p>
        <p className="text-xs text-white/50 truncate">{item.trackArtist}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.addedByAvatar && (
            <AvatarBubble avatar={item.addedByAvatar} size="xs" />
          )}
          {item.addedByName && (
            <span className="text-xs text-white/30">{item.addedByName}</span>
          )}
          {item.trackDuration && (
            <span className="text-xs text-white/25 ml-auto">{item.trackDuration}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {showVotes && onVote && (
          <VoteControls
            netScore={item.netScore}
            myVote={item.myVote}
            onVote={onVote}
          />
        )}
        {isHost && onRemove && (
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg text-white/20 hover:text-error hover:bg-error/10 flex items-center justify-center text-base transition-all opacity-0 group-hover:opacity-100"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
