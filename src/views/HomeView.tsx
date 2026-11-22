import { useEffect, useState } from 'react';
import { Loader2, Play, RefreshCw, Shuffle } from 'lucide-react';
import { ytMusicApi } from '../lib/api';
import { STUDIO_ASSETS } from '../lib/assets';
import type {
  GenreFeedResponse,
  HomeFeedResponse,
  TrackItem,
  UserPlaylist,
  ViewRoute,
} from '../types/music';
import { MediaCard } from '../components/MediaCard';
import { TrackRow } from '../components/TrackRow';

interface HomeViewProps {
  data: HomeFeedResponse | null;
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

const GENRE_TABS: Array<{ slug: string; label: string }> = [
  { slug: 'for-you', label: 'For You' },
  { slug: 'phonk', label: 'Phonk & Drift' },
  { slug: 'hip-hop', label: 'Hip-Hop' },
  { slug: 'electronic', label: 'Electronic' },
  { slug: 'pop', label: 'Pop' },
  { slug: 'lofi', label: 'Lo-Fi' },
  { slug: 'workout', label: 'Workout' },
  { slug: 'desi', label: 'Bollywood & Desi' },
  { slug: 'rock', label: 'Rock' },
  { slug: 'rnb', label: 'R&B' },
];

export function HomeView({
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
}: HomeViewProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>('for-you');
  const [genreFeed, setGenreFeed] = useState<GenreFeedResponse | null>(null);
  const [genreLoading, setGenreLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (selectedGenre === 'for-you') {
      setGenreFeed(null);
      return;
    }

    let cancelled = false;
    setGenreLoading(true);
    ytMusicApi
      .getGenre(selectedGenre)
      .then((res) => {
        if (!cancelled) setGenreFeed(res);
      })
      .catch(() => {
        if (!cancelled) setGenreFeed(null);
      })
      .finally(() => {
        if (!cancelled) setGenreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

  const handleLoadMoreGenre = async () => {
    if (!genreFeed?.nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await ytMusicApi.searchMore(genreFeed.nextToken, 'song');
      setGenreFeed((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.tracks.map((t) => t.id));
        const fresh = more.tracks.filter((t) => !existingIds.has(t.id));
        return {
          ...prev,
          tracks: [...prev.tracks, ...fresh],
          nextToken: more.nextToken,
        };
      });
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-64 rounded-2xl bg-[#141418]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-16 rounded-lg bg-[#141418]" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="aspect-[3/4] rounded-xl bg-[#141418]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-medium text-zinc-200">Unable to reach YouTube Music</p>
        <p className="text-sm text-zinc-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF2D55] text-white text-sm font-medium hover:bg-[#E12248]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const sections = data?.sections || [];
  const quickPicksSection = sections.find((s) => s.kind === 'tracks' && s.tracks && s.tracks.length > 0);
  const quickPicks = quickPicksSection?.tracks || [];

  const activeSpotlightTracks =
    selectedGenre !== 'for-you' && genreFeed?.tracks.length ? genreFeed.tracks : quickPicks;

  const handlePlayQuickPicks = (shuffled = false) => {
    if (activeSpotlightTracks.length === 0) return;
    const list = shuffled
      ? [...activeSpotlightTracks].sort(() => Math.random() - 0.5)
      : activeSpotlightTracks;
    onPlayTrack(list[0], list);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Featured Listening Spotlight */}
      <section className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#141418] min-h-[240px] flex items-end">
        <img
          src={STUDIO_ASSETS.heroListeningRoom}
          alt="ZYVORAMusic listening room"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/75 to-black/30" />

        <div className="relative z-10 p-6 md:p-8 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-medium text-zinc-300 flex items-center gap-2">
              <span>YouTube Music Catalog</span>
              <span aria-hidden="true">·</span>
              <span>Endless Radio & Phonk Beats</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
              Every track, phonk mix, and live chart in one studio player.
            </h1>
            <p className="text-sm text-zinc-300 max-w-xl">
              Stream unlimited music directly from YouTube Music with automatic radio continuation, synced lyrics, and instant search.
            </p>
          </div>

          {activeSpotlightTracks.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handlePlayQuickPicks(false)}
                className="h-11 px-5 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{selectedGenre === 'for-you' ? 'Play Endless Radio' : `Play ${genreFeed?.title || 'Mix'}`}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePlayQuickPicks(true)}
                className="h-11 px-4 rounded-lg bg-white/[0.1] hover:bg-white/[0.16] text-white text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Genre & Phonk Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {GENRE_TABS.map((tab) => {
          const active = selectedGenre === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => setSelectedGenre(tab.slug)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                active
                  ? 'bg-white text-black border-white'
                  : 'bg-[#141418] text-zinc-300 border-white/[0.08] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Selected Genre View (e.g. Phonk & Drift, Hip-Hop, Electronic, etc.) */}
      {selectedGenre !== 'for-you' ? (
        genreLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-7 w-48 bg-[#141418] rounded" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-[#141418]" />
              ))}
            </div>
          </div>
        ) : genreFeed ? (
          <div className="space-y-10">
            {genreFeed.tracks.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">{genreFeed.title} Tracks</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Live songs from YouTube Music · Auto-queues endless radio
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(genreFeed.tracks[0], genreFeed.tracks)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-white/[0.06] hover:bg-white/[0.12] transition-colors whitespace-nowrap"
                  >
                    Play All
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1">
                  {genreFeed.tracks.map((track, idx) => (
                    <TrackRow
                      key={`${track.id}-${idx}`}
                      track={track}
                      index={idx}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isLiked={likedIds.has(track.id)}
                      userPlaylists={userPlaylists}
                      onPlay={(t) => onPlayTrack(t, genreFeed.tracks)}
                      onToggleLike={onToggleLike}
                      onAddToQueue={onAddToQueue}
                      onAddToPlaylist={onAddToPlaylist}
                      onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                      onNavigate={onNavigate}
                      showAlbum={false}
                    />
                  ))}
                </div>

                {genreFeed.nextToken && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={handleLoadMoreGenre}
                      className="h-10 px-5 rounded-lg bg-[#141418] border border-white/[0.1] hover:bg-[#1B1B22] text-xs font-medium text-zinc-200 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{loadingMore ? 'Loading more songs...' : 'Load More Songs'}</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            {genreFeed.playlists.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-white">
                  {genreFeed.title} Playlists
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {genreFeed.playlists.slice(0, 10).map((card) => (
                    <MediaCard key={card.id} item={card} onNavigate={onNavigate} />
                  ))}
                </div>
              </section>
            )}

            {genreFeed.albums.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-white">
                  {genreFeed.title} Albums
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {genreFeed.albums.slice(0, 10).map((card) => (
                    <MediaCard key={card.id} item={card} onNavigate={onNavigate} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : null
      ) : (
        /* Default For You Feed (including Phonk & Drift Beats + Quick Picks + Releases + Trending) */
        sections.map((section, idx) => {
          if (section.kind === 'tracks' && section.tracks && section.tracks.length > 0) {
            const isQuickPicks = idx === 0;
            const displayTracks = isQuickPicks ? section.tracks.slice(0, 12) : section.tracks.slice(0, 14);

            return (
              <section key={`${section.title}-${idx}`} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">{section.title}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isQuickPicks ? 'Start endless radio from any song' : 'Live from YouTube Music'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPlayTrack(displayTracks[0], displayTracks)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-white/[0.06] hover:bg-white/[0.12] transition-colors whitespace-nowrap"
                  >
                    Play All
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1">
                  {displayTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isLiked={likedIds.has(track.id)}
                      userPlaylists={userPlaylists}
                      onPlay={(t) => onPlayTrack(t, section.tracks)}
                      onToggleLike={onToggleLike}
                      onAddToQueue={onAddToQueue}
                      onAddToPlaylist={onAddToPlaylist}
                      onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                      onNavigate={onNavigate}
                      showAlbum={false}
                    />
                  ))}
                </div>
              </section>
            );
          }

          if (section.kind === 'cards' && section.cards && section.cards.length > 0) {
            return (
              <section key={`${section.title}-${idx}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-white">{section.title}</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {section.cards.slice(0, 10).map((card) => (
                    <MediaCard
                      key={card.id}
                      item={card}
                      onNavigate={onNavigate}
                      onPlayTrack={(t) => onPlayTrack(t)}
                    />
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })
      )}
    </div>
  );
}
