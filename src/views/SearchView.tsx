import { useEffect, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { ytMusicApi } from '../lib/api';
import type {
  MediaCardItem,
  SearchFilterType,
  SearchResponse,
  TrackItem,
  UserPlaylist,
  ViewRoute,
} from '../types/music';
import { Artwork } from '../components/Artwork';
import { MediaCard } from '../components/MediaCard';
import { TrackRow } from '../components/TrackRow';

interface SearchViewProps {
  query: string;
  filter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
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

const FILTERS: Array<{ id: SearchFilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs' },
  { id: 'video', label: 'Videos' },
  { id: 'album', label: 'Albums' },
  { id: 'artist', label: 'Artists' },
  { id: 'playlist', label: 'Playlists' },
];

function isTrackItem(item: MediaCardItem | TrackItem): item is TrackItem {
  return 'artists' in item && !('subtitle' in item && item.itemType === 'artist');
}

export function SearchView({
  query,
  filter,
  onFilterChange,
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
}: SearchViewProps) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    ytMusicApi
      .search(query, filter)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, filter]);

  const handleLoadMore = async () => {
    if (!data?.nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await ytMusicApi.searchMore(data.nextToken, filter);
      setData((prev) => {
        if (!prev) return prev;
        const mergeTracks = (curr: TrackItem[], incoming: TrackItem[]) => {
          const seen = new Set(curr.map((t) => t.id));
          return [...curr, ...incoming.filter((t) => !seen.has(t.id))];
        };
        const mergeCards = (curr: MediaCardItem[], incoming: MediaCardItem[]) => {
          const seen = new Set(curr.map((c) => c.id));
          return [...curr, ...incoming.filter((c) => !seen.has(c.id))];
        };
        return {
          ...prev,
          tracks: mergeTracks(prev.tracks, more.tracks),
          albums: mergeCards(prev.albums, more.albums),
          artists: mergeCards(prev.artists, more.artists),
          playlists: mergeCards(prev.playlists, more.playlists),
          nextToken: more.nextToken,
        };
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTopResultClick = () => {
    if (!data?.topResult) return;
    const item = data.topResult;
    if (item.itemType === 'artist') {
      onNavigate({ view: 'artist', id: item.id });
    } else if (item.itemType === 'album') {
      onNavigate({ view: 'album', id: item.id });
    } else if (item.itemType === 'playlist') {
      onNavigate({ view: 'playlist', id: item.id });
    } else if (isTrackItem(item)) {
      onPlayTrack(item, data.tracks);
    } else {
      onPlayTrack({
        id: item.id,
        title: item.title,
        artists: item.artists || [{ name: item.subtitle }],
        thumbnail: item.thumbnail,
        itemType: 'song',
      });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header + Segmented Filter Tabs */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Results for “{query}”
          </h1>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#141418] border border-white/[0.08]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === f.id
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 rounded-xl bg-[#141418]" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-14 rounded-lg bg-[#141418]" />
          ))}
        </div>
      )}

      {error && <div className="text-sm text-[#FF2D55]">{error}</div>}

      {!loading && data && (
        <div className="space-y-10">
          {/* Top Result Spotlight */}
          {filter === 'all' && data.topResult && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-white">Top Result</h2>
              <button
                type="button"
                onClick={handleTopResultClick}
                className="group w-full max-w-md p-4 rounded-xl bg-[#141418] border border-white/[0.08] hover:bg-[#1B1B22] flex items-center gap-4 text-left transition-colors"
              >
                <Artwork
                  src={data.topResult.thumbnail}
                  alt={data.topResult.title}
                  className="w-20 h-20"
                  rounded={data.topResult.itemType === 'artist' ? 'full' : 'lg'}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold text-white truncate">
                    {data.topResult.title}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 truncate">
                    {'subtitle' in data.topResult && data.topResult.subtitle
                      ? data.topResult.subtitle
                      : isTrackItem(data.topResult)
                        ? data.topResult.artists.map((a) => a.name).join(', ')
                        : 'YouTube Music'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#FF2D55] text-white flex items-center justify-center shrink-0 opacity-90 group-hover:scale-105 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </button>
            </section>
          )}

          {/* Songs / Videos */}
          {data.tracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">
                  {filter === 'video' ? 'Videos' : 'Songs'}
                </h2>
                {filter === 'all' && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('song')}
                    className="text-xs font-medium text-zinc-400 hover:text-white"
                  >
                    See all songs
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {(filter === 'all' ? data.tracks.slice(0, 10) : data.tracks).map((track, idx) => (
                  <TrackRow
                    key={`${track.id}-${idx}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isLiked={likedIds.has(track.id)}
                    userPlaylists={userPlaylists}
                    onPlay={(t) => onPlayTrack(t, data.tracks)}
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

          {/* Albums */}
          {data.albums.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-white">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(filter === 'all' ? data.albums.slice(0, 5) : data.albums).map((item) => (
                  <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {data.artists.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-white">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(filter === 'all' ? data.artists.slice(0, 5) : data.artists).map((item) => (
                  <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {data.playlists.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-white">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(filter === 'all' ? data.playlists.slice(0, 5) : data.playlists).map((item) => (
                  <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* Unlimited Load More Button */}
          {filter !== 'all' && data.nextToken && (
            <div className="pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="h-10 px-5 rounded-lg bg-[#141418] border border-white/[0.1] hover:bg-[#1B1B22] text-xs font-medium text-zinc-200 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{loadingMore ? 'Loading more...' : 'Load More Results'}</span>
              </button>
            </div>
          )}

          {data.tracks.length === 0 &&
            data.albums.length === 0 &&
            data.artists.length === 0 &&
            data.playlists.length === 0 && (
              <div className="py-16 text-center text-sm text-zinc-400">
                No matches found on YouTube Music for “{query}”.
              </div>
            )}
        </div>
      )}
    </div>
  );
}
