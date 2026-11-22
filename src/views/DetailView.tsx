import { useEffect, useState } from 'react';
import { Play, Shuffle } from 'lucide-react';
import { ytMusicApi } from '../lib/api';
import type {
  AlbumDetailResponse,
  ArtistDetailResponse,
  PlaylistDetailResponse,
  TrackItem,
  UserPlaylist,
  ViewRoute,
} from '../types/music';
import { Artwork } from '../components/Artwork';
import { MediaCard } from '../components/MediaCard';
import { TrackRow } from '../components/TrackRow';

interface DetailViewProps {
  mode: 'album' | 'playlist' | 'artist';
  id: string;
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

export function DetailView({
  mode,
  id,
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
}: DetailViewProps) {
  const [album, setAlbum] = useState<AlbumDetailResponse | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistDetailResponse | null>(null);
  const [artist, setArtist] = useState<ArtistDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAlbum(null);
    setPlaylist(null);
    setArtist(null);

    const req =
      mode === 'album'
        ? ytMusicApi.getAlbum(id).then((res) => !cancelled && setAlbum(res))
        : mode === 'playlist'
          ? ytMusicApi.getPlaylist(id).then((res) => !cancelled && setPlaylist(res))
          : ytMusicApi.getArtist(id).then((res) => !cancelled && setArtist(res));

    req
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-52 h-52 rounded-xl bg-[#141418] shrink-0" />
          <div className="flex-1 space-y-3 py-4">
            <div className="h-8 w-2/3 bg-[#141418] rounded" />
            <div className="h-4 w-1/3 bg-[#141418] rounded" />
            <div className="h-10 w-40 bg-[#141418] rounded mt-6" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-[#141418]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-sm text-[#FF2D55]">{error}</div>;
  }

  if (mode === 'artist' && artist) {
    return (
      <div className="space-y-10 pb-8">
        <header className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#141418] min-h-[240px] flex items-end">
          {artist.thumbnail && (
            <img
              src={artist.thumbnail}
              alt={artist.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/75 to-transparent" />

          <div className="relative z-10 p-6 md:p-8 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-medium text-zinc-300">
                Artist{artist.subscribers ? ` · ${artist.subscribers}` : ''}
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
                {artist.name}
              </h1>
              {artist.description && (
                <p className="text-sm text-zinc-300 line-clamp-2">{artist.description}</p>
              )}
            </div>

            {artist.topSongs.length > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onPlayTrack(artist.topSongs[0], artist.topSongs)}
                  className="h-11 px-5 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Top Songs</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = [...artist.topSongs].sort(() => Math.random() - 0.5);
                    onPlayTrack(s[0], s);
                  }}
                  className="h-11 px-4 rounded-lg bg-white/[0.1] hover:bg-white/[0.16] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {artist.topSongs.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-white">Top Songs</h2>
            <div className="space-y-1">
              {artist.topSongs.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  isLiked={likedIds.has(track.id)}
                  userPlaylists={userPlaylists}
                  onPlay={(t) => onPlayTrack(t, artist.topSongs)}
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

        {artist.albums.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artist.albums.map((item) => (
                <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        )}

        {artist.singles.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Singles & EPs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artist.singles.map((item) => (
                <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        )}

        {artist.relatedArtists.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Fans Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artist.relatedArtists.map((item) => (
                <MediaCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const activeCollection = mode === 'album' ? album : playlist;
  if (!activeCollection) return null;

  const tracks = activeCollection.tracks;

  return (
    <div className="space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-white/[0.08]">
        <Artwork
          src={activeCollection.thumbnail}
          alt={activeCollection.title}
          className="w-48 h-48 md:w-56 md:h-56 shadow-2xl"
          rounded="lg"
        />

        <div className="flex-1 min-w-0 space-y-3">
          <div className="text-xs font-medium text-zinc-400">
            {mode === 'album' ? 'Album' : 'Playlist'}
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-bold text-white tracking-tight [text-wrap:balance]">
            {activeCollection.title}
          </h1>

          <div className="text-sm text-zinc-300 flex flex-wrap items-center gap-2">
            {mode === 'album' && album?.artists?.length ? (
              <span>
                {album.artists.map((a, idx) => (
                  <span key={`${a.name}-${idx}`}>
                    {idx > 0 && ', '}
                    {a.id ? (
                      <button
                        type="button"
                        onClick={() => onNavigate({ view: 'artist', id: a.id! })}
                        className="font-medium text-white hover:underline"
                      >
                        {a.name}
                      </button>
                    ) : (
                      a.name
                    )}
                  </span>
                ))}
              </span>
            ) : (
              <span>{activeCollection.subtitle}</span>
            )}
            {activeCollection.trackCount && (
              <>
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
                <span className="text-zinc-400">{activeCollection.trackCount}</span>
              </>
            )}
          </div>

          {activeCollection.description && (
            <p className="text-xs text-zinc-400 max-w-2xl line-clamp-2">
              {activeCollection.description}
            </p>
          )}

          {tracks.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onPlayTrack(tracks[0], tracks)}
                className="h-10 px-5 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play All</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = [...tracks].sort(() => Math.random() - 0.5);
                  onPlayTrack(s[0], s);
                }}
                className="h-10 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {tracks.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">No playable tracks in this collection.</div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
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
              showAlbum={mode !== 'album'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
