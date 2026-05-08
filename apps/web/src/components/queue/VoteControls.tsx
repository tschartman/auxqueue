interface VoteControlsProps {
  netScore: number;
  myVote?: 1 | -1 | 0;
  onVote: (direction: 1 | -1 | 0) => void;
  disabled?: boolean;
}

export function VoteControls({ netScore, myVote = 0, onVote, disabled = false }: VoteControlsProps) {
  const handleUpvote = () => onVote(myVote === 1 ? 0 : 1);
  const handleDownvote = () => onVote(myVote === -1 ? 0 : -1);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={handleUpvote}
        disabled={disabled}
        className={[
          'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-150',
          myVote === 1
            ? 'bg-success/20 text-success'
            : 'text-white/40 hover:text-success hover:bg-success/10',
          disabled ? 'opacity-40 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        ▲
      </button>
      <span
        className={[
          'text-xs font-bold tabular-nums',
          netScore > 0 ? 'text-success' : netScore < 0 ? 'text-error' : 'text-white/40',
        ].join(' ')}
      >
        {netScore > 0 ? `+${netScore}` : netScore}
      </span>
      <button
        onClick={handleDownvote}
        disabled={disabled}
        className={[
          'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-150',
          myVote === -1
            ? 'bg-error/20 text-error'
            : 'text-white/40 hover:text-error hover:bg-error/10',
          disabled ? 'opacity-40 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        ▼
      </button>
    </div>
  );
}
