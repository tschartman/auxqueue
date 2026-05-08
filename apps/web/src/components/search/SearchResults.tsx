import type { Track } from '@auxqueue/shared';
import { Button } from '../ui/Button';

interface SearchResultsProps {
  results: Track[];
  onAdd: (track: Track) => void;
  addedIds?: Set<string>;
}

export function SearchResults({ results, onAdd, addedIds = new Set() }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      {results.map((track) => {
        const added = addedIds.has(track.uri);
        return (
          <div
            key={track.uri}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border"
          >
            {track.albumArtUrl ? (
              <img
                src={track.albumArtUrl}
                alt={track.title}
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                🎵
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {track.isExplicit && <span className="text-xs text-error mr-1">E</span>}
                {track.title}
              </p>
              <p className="text-xs text-white/50 truncate">{track.artist}</p>
              <p className="text-xs text-white/30 truncate">{track.album}</p>
            </div>

            <Button
              size="sm"
              variant={added ? 'ghost' : 'primary'}
              disabled={added}
              onClick={() => onAdd(track)}
              className="flex-shrink-0"
            >
              {added ? '✓' : '+ Add'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
