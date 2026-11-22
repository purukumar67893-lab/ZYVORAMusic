import { Play, RefreshCw, Shuffle } from 'lucide-react';
import type { ExploreResponse, TrackItem, UserPlaylist, ViewRoute } from '../types/music';
import { TrackRow } from '../components/TrackRow';

interface ChartsViewProps {
  data: ExploreResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  userPlaylists: UserPlaylist[];
  onPlayTrack: (track: TrackItem, queue?: TrackItem[]) => void;
  onToggleLike: (track: TrackItem) => void;
  onAddToQueue: (track: TrackItem) => void;
  onAddToPlaylist: (playlistId: string, track: TrackItem) => void;
  onCreatePlaylistWithTrack: (track: TrackItem) => void;
  onNavigate: (route: ViewRoute) => void;
}

export function ChartsView({
  data,
  loading,
  error,
  onRetry,
  currentTrack,
  isPlaying,
  likedIds,
  userPlaylists,
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
  onNavigate,
}: ChartsViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-48 bg-[#141418] rounded" />
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="h-14 rounded-lg bg-[#141418]" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-medium text-zinc-200">Unable to load Charts</p>
        <p className="text-sm text-zinc-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF2D55] text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const tracks = data?.trending || [];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Trending Charts</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Live top trending songs and music videos on YouTube Music.
          </p>
        </div>

        {tracks.length > 0 && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onPlayTrack(tracks[0], tracks)}
              className="h-10 px-4 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Chart</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                onPlayTrack(shuffled[0], shuffled);
              }}
              className="h-10 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-400">No chart entries found right now.</div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              isLiked={likedIds.has(track.id)}
              userPlaylists={userPlaylists}
              onPlay={(t) => onPlayTrack(t, tracks)}
              onToggleLike={onToggleLike}
              onAddToQueue={onAddToQueue}
              onAddToPlaylist={onAddToPlaylist}
              onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
