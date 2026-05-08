import type { PlaybackState } from '@auxqueue/shared';

interface NowPlayingProps {
  playback: PlaybackState | null;
  isHost: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSkip?: () => void;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function NowPlaying({ playback, isHost, onPlay, onPause, onSkip }: NowPlayingProps) {
  if (!playback?.track) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-border">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl animate-pulse">
          🎵
        </div>
        <div>
          <p className="text-sm font-semibold text-white/60">Waiting for music…</p>
          <p className="text-xs text-white/30">
            {isHost ? 'Start playing on Spotify, then add songs to the queue' : 'The host will start music soon'}
          </p>
        </div>
      </div>
    );
  }

  const { track, isPlaying, progressMs, durationMs } = playback;
  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3">
        {track.albumArtUrl ? (
          <img
            src={track.albumArtUrl}
            alt={track.title}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">
            🎵
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{track.title}</p>
          <p className="text-xs text-white/50 truncate">{track.artist}</p>
        </div>

        {isHost && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-sm shadow-glow-sm transition-transform active:scale-95"
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              onClick={onSkip}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white text-sm hover:bg-white/15 transition-colors active:scale-95"
            >
              ⏭
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-white/30">{formatTime(progressMs)}</span>
          <span className="text-xs text-white/30">{formatTime(durationMs)}</span>
        </div>
      </div>
    </div>
  );
}
