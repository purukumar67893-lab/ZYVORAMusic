import { ArrowRight, RefreshCw } from 'lucide-react';
import type { ExploreResponse, MoodCategory, TrackItem, UserPlaylist, ViewRoute } from '../types/music';
import { MediaCard } from '../components/MediaCard';
import { TrackRow } from '../components/TrackRow';

interface ExploreViewProps {
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
  onSelectMood: (mood: MoodCategory) => void;
}

export function ExploreView({
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
  onSelectMood,
}: ExploreViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-[#141418] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="aspect-[3/4] rounded-xl bg-[#141418]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-medium text-zinc-200">Unable to load Explore</p>
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

  const newReleases = data?.newReleases || [];
  const moods = data?.moods || [];
  const trending = data?.trending || [];

  return (
    <div className="space-y-10 pb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Explore</h1>
        <p className="text-sm text-zinc-400 mt-1">
          New albums, singles, moods, and trending tracks from YouTube Music.
        </p>
      </div>

      {/* New Releases */}
      {newReleases.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-white">New Albums & Singles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {newReleases.slice(0, 15).map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onNavigate={onNavigate}
                onPlayTrack={(t) => onPlayTrack(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Moods & Genres Quick Directory */}
      {moods.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Moods & Genres</h2>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'moods' })}
              className="text-xs font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1"
            >
              <span>Browse all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {moods.slice(0, 18).map((mood) => (
              <button
                key={`${mood.title}-${mood.params}`}
                type="button"
                onClick={() => onSelectMood(mood)}
                className="px-4 py-3 rounded-xl bg-[#141418] border border-white/[0.08] hover:bg-[#1C1C23] hover:border-[#FF2D55]/50 text-left text-sm font-medium text-zinc-200 transition-colors truncate"
              >
                {mood.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trending Songs */}
      {trending.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Trending Tracks</h2>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'charts' })}
              className="text-xs font-medium text-zinc-400 hover:text-white inline-flex items-center gap-1"
            >
              <span>Full charts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {trending.slice(0, 10).map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                isLiked={likedIds.has(track.id)}
                userPlaylists={userPlaylists}
                onPlay={(t) => onPlayTrack(t, trending)}
                onToggleLike={onToggleLike}
                onAddToQueue={onAddToQueue}
                onAddToPlaylist={onAddToPlaylist}
                onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
