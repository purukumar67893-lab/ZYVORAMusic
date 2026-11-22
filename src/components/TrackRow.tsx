import { useState } from 'react';
import { Heart, ListPlus, Pause, Play, Plus } from 'lucide-react';
import type { TrackItem, UserPlaylist, ViewRoute } from '../types/music';
import { Artwork } from './Artwork';

interface TrackRowProps {
  track: TrackItem;
  index?: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  userPlaylists: UserPlaylist[];
  onPlay: (track: TrackItem) => void;
  onToggleLike: (track: TrackItem) => void;
  onAddToQueue: (track: TrackItem) => void;
  onAddToPlaylist: (playlistId: string, track: TrackItem) => void;
  onCreatePlaylistWithTrack: (track: TrackItem) => void;
  onNavigate: (route: ViewRoute) => void;
  showAlbum?: boolean;
}

export function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  userPlaylists,
  onPlay,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
  onNavigate,
  showAlbum = true,
}: TrackRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-3.5 px-3 py-2 rounded-lg transition-colors ${
        isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
      }`}
    >
      {/* Optional Index Number */}
      {typeof index === 'number' && (
        <div className="w-6 text-right font-mono text-xs tabular-nums text-zinc-500 shrink-0">
          {isCurrent && isPlaying ? (
            <span className="text-[#FF2D55] font-semibold">▶</span>
          ) : (
            index + 1
          )}
        </div>
      )}

      {/* Artwork + Play/Pause Button Overlay */}
      <button
        type="button"
        onClick={() => onPlay(track)}
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D55]"
      >
        <Artwork src={track.thumbnail} alt={track.title} className="w-11 h-11" rounded="md" />
        <div
          className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </div>
      </button>

      {/* Title & Artist */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onPlay(track)}
          className={`text-left text-sm font-medium truncate block w-full hover:underline ${
            isCurrent ? 'text-[#FF2D55]' : 'text-zinc-100'
          }`}
        >
          {track.title}
        </button>

        <div className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
          {track.artists.map((artist, idx) => (
            <span key={`${artist.name}-${idx}`} className="inline-flex items-center">
              {idx > 0 && <span className="mr-1">,</span>}
              {artist.id ? (
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'artist', id: artist.id! })}
                  className="hover:text-white hover:underline truncate"
                >
                  {artist.name}
                </button>
              ) : (
                <span>{artist.name}</span>
              )}
            </span>
          ))}
          {track.views && (
            <>
              <span aria-hidden="true" className="text-zinc-600 mx-1">
                ·
              </span>
              <span className="text-zinc-500">{track.views}</span>
            </>
          )}
        </div>
      </div>

      {/* Album Link */}
      {showAlbum && (
        <div className="hidden md:block w-1/4 min-w-0">
          {track.album?.name ? (
            track.album.id ? (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'album', id: track.album!.id! })}
                className="text-xs text-zinc-400 hover:text-white hover:underline truncate block max-w-full text-left"
              >
                {track.album.name}
              </button>
            ) : (
              <span className="text-xs text-zinc-500 truncate block">{track.album.name}</span>
            )
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleLike(track)}
          aria-label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          className={`p-2 rounded-md transition-colors ${
            isLiked
              ? 'text-[#FF2D55]'
              : 'text-zinc-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF2D55]' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onAddToQueue(track)}
          title="Add to queue"
          aria-label={`Add ${track.title} to queue`}
          className="p-2 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white transition-colors"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            title="Add to playlist"
            aria-label={`Add ${track.title} to playlist`}
            className="p-2 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-52 bg-[#18181F] border border-white/[0.1] rounded-xl shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 border-b border-white/[0.06]">
                  Add to playlist
                </div>
                {userPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      onAddToPlaylist(pl.id, track);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06] truncate"
                  >
                    {pl.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCreatePlaylistWithTrack(track);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#FF2D55] hover:bg-white/[0.06] font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New playlist</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabular Duration */}
      <div className="w-12 text-right font-mono text-xs tabular-nums text-zinc-400 shrink-0">
        {track.duration || '—'}
      </div>
    </div>
  );
}
