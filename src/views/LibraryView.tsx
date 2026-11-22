import { Heart, History, ListMusic, Play, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { TrackItem, UserPlaylist, ViewRoute } from '../types/music';
import { Artwork } from '../components/Artwork';
import { TrackRow } from '../components/TrackRow';

interface LibraryViewProps {
  tab: 'liked' | 'playlists' | 'recent';
  selectedPlaylistId?: string;
  likedTracks: TrackItem[];
  recentTracks: TrackItem[];
  userPlaylists: UserPlaylist[];
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  onSelectTab: (tab: 'liked' | 'playlists' | 'recent', playlistId?: string) => void;
  onPlayTrack: (track: TrackItem, queue?: TrackItem[]) => void;
  onToggleLike: (track: TrackItem) => void;
  onAddToQueue: (track: TrackItem) => void;
  onAddToPlaylist: (playlistId: string, track: TrackItem) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onOpenCreatePlaylist: () => void;
  onCreatePlaylistWithTrack: (track: TrackItem) => void;
  onNavigate: (route: ViewRoute) => void;
}

export function LibraryView({
  tab,
  selectedPlaylistId,
  likedTracks,
  recentTracks,
  userPlaylists,
  currentTrack,
  isPlaying,
  likedIds,
  onSelectTab,
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  onOpenCreatePlaylist,
  onCreatePlaylistWithTrack,
  onNavigate,
}: LibraryViewProps) {
  const activePlaylist = selectedPlaylistId
    ? userPlaylists.find((p) => p.id === selectedPlaylistId) || null
    : null;

  if (activePlaylist) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-white/[0.08]">
          <Artwork
            src={activePlaylist.tracks[0]?.thumbnail || activePlaylist.coverUrl}
            alt={activePlaylist.name}
            className="w-44 h-44 shadow-2xl"
            rounded="lg"
          />

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="text-xs font-medium text-zinc-400">Personal Playlist</div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white truncate">
              {activePlaylist.name}
            </h1>
            {activePlaylist.description && (
              <p className="text-sm text-zinc-400">{activePlaylist.description}</p>
            )}
            <div className="text-xs text-zinc-500 font-mono tabular-nums">
              {activePlaylist.tracks.length} tracks
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {activePlaylist.tracks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(activePlaylist.tracks[0], activePlaylist.tracks)}
                    className="h-10 px-5 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Play All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s = [...activePlaylist.tracks].sort(() => Math.random() - 0.5);
                      onPlayTrack(s[0], s);
                    }}
                    className="h-10 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Shuffle</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onDeletePlaylist(activePlaylist.id)}
                className="h-10 px-3.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-zinc-300 hover:text-red-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Playlist</span>
              </button>
            </div>
          </div>
        </div>

        {activePlaylist.tracks.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <p className="text-sm text-zinc-300">This playlist has no tracks yet.</p>
            <p className="text-xs text-zinc-500">
              Use the + button on any song across Home, Search, or Charts to add it here.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activePlaylist.tracks.map((track, idx) => (
              <div key={`${track.id}-${idx}`} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <TrackRow
                    track={track}
                    index={idx}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isLiked={likedIds.has(track.id)}
                    userPlaylists={userPlaylists}
                    onPlay={(t) => onPlayTrack(t, activePlaylist.tracks)}
                    onToggleLike={onToggleLike}
                    onAddToQueue={onAddToQueue}
                    onAddToPlaylist={onAddToPlaylist}
                    onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                    onNavigate={onNavigate}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFromPlaylist(activePlaylist.id, track.id)}
                  aria-label={`Remove ${track.title} from playlist`}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Your Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Saved tracks, custom playlists, and recent listening history.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreatePlaylist}
          className="h-10 px-4 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Segmented Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#141418] border border-white/[0.08]">
        <button
          type="button"
          onClick={() => onSelectTab('liked')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            tab === 'liked' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Liked Songs ({likedTracks.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('playlists')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            tab === 'playlists' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Playlists ({userPlaylists.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            tab === 'recent' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Recently Played ({recentTracks.length})</span>
        </button>
      </div>

      {tab === 'liked' && (
        <div className="space-y-4">
          {likedTracks.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-white/[0.08] rounded-2xl">
              <p className="text-sm font-medium text-zinc-300">No liked songs yet</p>
              <p className="text-xs text-zinc-500">
                Click the heart icon on any song to save it to your Liked Songs.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onPlayTrack(likedTracks[0], likedTracks)}
                  className="h-9 px-4 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Play Liked</span>
                </button>
              </div>
              <div className="space-y-1">
                {likedTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isLiked={true}
                    userPlaylists={userPlaylists}
                    onPlay={(t) => onPlayTrack(t, likedTracks)}
                    onToggleLike={onToggleLike}
                    onAddToQueue={onAddToQueue}
                    onAddToPlaylist={onAddToPlaylist}
                    onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'playlists' && (
        <div>
          {userPlaylists.length === 0 ? (
            <div className="py-16 text-center space-y-4 border border-dashed border-white/[0.08] rounded-2xl">
              <p className="text-sm font-medium text-zinc-300">No playlists created yet</p>
              <button
                type="button"
                onClick={onOpenCreatePlaylist}
                className="px-4 py-2 rounded-lg bg-[#FF2D55] text-white text-xs font-semibold"
              >
                Create First Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {userPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => onSelectTab('playlists', pl.id)}
                  className="group text-left p-3 rounded-xl bg-[#141418] border border-white/[0.06] hover:bg-[#1B1B21] transition-colors"
                >
                  <Artwork
                    src={pl.tracks[0]?.thumbnail || pl.coverUrl}
                    alt={pl.name}
                    className="w-full aspect-square mb-3"
                    rounded="lg"
                  />
                  <div className="text-sm font-semibold text-white truncate">{pl.name}</div>
                  <div className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                    {pl.tracks.length} tracks
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'recent' && (
        <div>
          {recentTracks.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-white/[0.08] rounded-2xl">
              <p className="text-sm font-medium text-zinc-300">No listening history yet</p>
              <p className="text-xs text-zinc-500">Songs you play will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTracks.map((track, idx) => (
                <TrackRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  isLiked={likedIds.has(track.id)}
                  userPlaylists={userPlaylists}
                  onPlay={(t) => onPlayTrack(t, recentTracks)}
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
      )}
    </div>
  );
}
