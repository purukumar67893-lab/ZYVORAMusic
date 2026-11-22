import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ytMusicApi } from './lib/api';
import { libraryStorage } from './lib/storage';
import type {
  ExploreResponse,
  HomeFeedResponse,
  LyricsResponse,
  MoodCategory,
  TrackItem,
  UserPlaylist,
  ViewRoute,
} from './types/music';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { PlayerBar } from './components/PlayerBar';
import { QueuePanel } from './components/QueuePanel';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { YouTubeAudioEngine } from './components/YouTubeAudioEngine';
import { ChartsView } from './views/ChartsView';
import { DetailView } from './views/DetailView';
import { ExploreView } from './views/ExploreView';
import { HomeView } from './views/HomeView';
import { LibraryView } from './views/LibraryView';
import { MoodsView } from './views/MoodsView';
import { SearchView } from './views/SearchView';

export default function App() {
  // Navigation history stack
  const [history, setHistory] = useState<ViewRoute[]>([{ view: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const route = history[historyIndex];

  const navigate = useCallback(
    (next: ViewRoute) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, next];
      });
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex]
  );

  const goBack = useCallback(() => {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }, []);

  // API Data
  const [homeData, setHomeData] = useState<HomeFeedResponse | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);

  const [exploreData, setExploreData] = useState<ExploreResponse | null>(null);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreError, setExploreError] = useState<string | null>(null);

  const loadHome = useCallback(() => {
    setHomeLoading(true);
    setHomeError(null);
    ytMusicApi
      .getHome()
      .then((res) => setHomeData(res))
      .catch((err) => setHomeError(err instanceof Error ? err.message : 'Failed to load Home'))
      .finally(() => setHomeLoading(false));
  }, []);

  const loadExplore = useCallback(() => {
    setExploreLoading(true);
    setExploreError(null);
    ytMusicApi
      .getExplore()
      .then((res) => setExploreData(res))
      .catch((err) => setExploreError(err instanceof Error ? err.message : 'Failed to load Explore'))
      .finally(() => setExploreLoading(false));
  }, []);

  useEffect(() => {
    loadHome();
    loadExplore();
  }, [loadHome, loadExplore]);

  // Persistent User Library State
  const [likedTracks, setLikedTracks] = useState<TrackItem[]>(() => libraryStorage.getLikedTracks());
  const [recentTracks, setRecentTracks] = useState<TrackItem[]>(() => libraryStorage.getRecentTracks());
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>(() => libraryStorage.getPlaylists());

  const likedIds = useMemo(() => new Set(likedTracks.map((t) => t.id)), [likedTracks]);

  const toggleLike = useCallback((track: TrackItem) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      const next = exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
      libraryStorage.saveLikedTracks(next);
      return next;
    });
  }, []);

  const recordRecent = useCallback((track: TrackItem) => {
    setRecentTracks((prev) => {
      const next = [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 50);
      libraryStorage.saveRecentTracks(next);
      return next;
    });
  }, []);

  // Playlist Modal & Mutations
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistModalTrack, setPlaylistModalTrack] = useState<TrackItem | null>(null);

  const handleCreatePlaylist = useCallback(
    (name: string, description: string, coverUrl: string, initialTrack: TrackItem | null) => {
      const newPl: UserPlaylist = {
        id: `pl_${Date.now()}`,
        name,
        description,
        coverUrl,
        createdAt: new Date().toISOString(),
        tracks: initialTrack ? [initialTrack] : [],
      };
      setUserPlaylists((prev) => {
        const next = [newPl, ...prev];
        libraryStorage.savePlaylists(next);
        return next;
      });
    },
    []
  );

  const handleAddToPlaylist = useCallback((playlistId: string, track: TrackItem) => {
    setUserPlaylists((prev) => {
      const next = prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      });
      libraryStorage.savePlaylists(next);
      return next;
    });
  }, []);

  const handleRemoveFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setUserPlaylists((prev) => {
      const next = prev.map((pl) =>
        pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) } : pl
      );
      libraryStorage.savePlaylists(next);
      return next;
    });
  }, []);

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      setUserPlaylists((prev) => {
        const next = prev.filter((pl) => pl.id !== playlistId);
        libraryStorage.savePlaylists(next);
        return next;
      });
      navigate({ view: 'library', tab: 'playlists' });
    },
    [navigate]
  );

  // Player & Queue State
  const initialPrefs = useMemo(() => libraryStorage.getPrefs(), []);
  const [queue, setQueue] = useState<TrackItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialPrefs.volume);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(initialPrefs.shuffle);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>(initialPrefs.repeat);
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; nonce: number } | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'queue' | 'lyrics'>('queue');

  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Sleep Timer State
  const [sleepEndAt, setSleepEndAt] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [sleepEndOfTrack, setSleepEndOfTrack] = useState(false);

  const currentTrack = queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;

  useEffect(() => {
    libraryStorage.savePrefs({ volume, shuffle, repeat });
  }, [volume, shuffle, repeat]);

  // Countdown tick for sleep timer
  useEffect(() => {
    if (sleepEndAt === null) {
      setSleepRemainingSec(null);
      return;
    }

    const updateCountdown = () => {
      const diffSec = Math.ceil((sleepEndAt - Date.now()) / 1000);
      if (diffSec <= 0) {
        setSleepEndAt(null);
        setSleepRemainingSec(null);
        setSleepEndOfTrack(false);
        setIsPlaying(false);
      } else {
        setSleepRemainingSec(diffSec);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [sleepEndAt]);

  const handleSetSleepTimer = useCallback((minutes: number) => {
    const safeMinutes = Math.max(1, Math.min(480, minutes));
    setSleepEndOfTrack(false);
    setSleepEndAt(Date.now() + safeMinutes * 60 * 1000);
    setSleepRemainingSec(safeMinutes * 60);
  }, []);

  const handleToggleSleepEndOfTrack = useCallback(() => {
    setSleepEndAt(null);
    setSleepRemainingSec(null);
    setSleepEndOfTrack((prev) => !prev);
  }, []);

  const handleCancelSleepTimer = useCallback(() => {
    setSleepEndAt(null);
    setSleepRemainingSec(null);
    setSleepEndOfTrack(false);
  }, []);

  // Fetch lyrics whenever current track changes & lyrics tab is open (or on demand)
  const lastLyricsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      return;
    }
    if (queuePanelOpen && activePanelTab === 'lyrics' && lastLyricsIdRef.current !== currentTrack.id) {
      lastLyricsIdRef.current = currentTrack.id;
      setLyricsLoading(true);
      ytMusicApi
        .getLyrics(currentTrack.id)
        .then((res) => setLyricsData(res))
        .catch(() => setLyricsData({ videoId: currentTrack.id, lyrics: null }))
        .finally(() => setLyricsLoading(false));
    }
  }, [currentTrack, queuePanelOpen, activePanelTab]);

  // Auto-replenish queue for unlimited continuous radio playback
  const replenishingForRef = useRef<string | null>(null);
  useEffect(() => {
    if (queue.length === 0 || queueIndex < 0 || repeat === 'one' || sleepEndOfTrack) return;
    const remaining = queue.length - 1 - queueIndex;
    const seedTrack = queue[queue.length - 1];
    if (remaining <= 2 && seedTrack && replenishingForRef.current !== seedTrack.id) {
      replenishingForRef.current = seedTrack.id;
      ytMusicApi
        .getUpNext(seedTrack.id)
        .then((res) => {
          if (!res.tracks?.length) return;
          setQueue((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const fresh = res.tracks.filter((t) => !existingIds.has(t.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        })
        .catch(() => {
          // Ignore transient radio fetch error
        });
    }
  }, [queue, queueIndex, repeat, sleepEndOfTrack]);

  // Play track + populate Up Next radio if single track or short list
  const playTrack = useCallback(
    (track: TrackItem, list?: TrackItem[]) => {
      setPlaybackError(null);

      if (currentTrack?.id === track.id) {
        setIsPlaying((p) => !p);
        return;
      }

      recordRecent(track);
      setCurrentTime(0);
      setDuration(track.durationSeconds || 0);
      setIsPlaying(true);

      if (list && list.length > 0) {
        const foundIdx = list.findIndex((t) => t.id === track.id);
        if (foundIdx >= 0) {
          setQueue(list);
          setQueueIndex(foundIdx);
        } else {
          setQueue([track, ...list]);
          setQueueIndex(0);
        }
      } else {
        setQueue([track]);
        setQueueIndex(0);
        // Fetch live YouTube Music Up Next Radio
        ytMusicApi
          .getUpNext(track.id)
          .then((res) => {
            if (res.tracks && res.tracks.length > 0) {
              const radio = res.tracks.filter((t) => t.id !== track.id);
              setQueue((prev) => {
                if (prev[0]?.id !== track.id) return prev;
                return [track, ...radio];
              });
            }
          })
          .catch(() => {
            // Single track queue fallback
          });
      }
    },
    [currentTrack?.id, recordRecent]
  );

  const handleAddToQueue = useCallback((track: TrackItem) => {
    setQueue((prev) => {
      if (prev.length === 0) {
        setQueueIndex(0);
        setIsPlaying(true);
        return [track];
      }
      return [...prev, track];
    });
  }, []);

  const handleNext = useCallback(() => {
    setPlaybackError(null);
    if (queue.length === 0) return;

    if (repeat === 'one') {
      setSeekRequest({ seconds: 0, nonce: Date.now() });
      setIsPlaying(true);
      return;
    }

    if (shuffle && queue.length > 1) {
      let randomIdx = Math.floor(Math.random() * queue.length);
      if (randomIdx === queueIndex) randomIdx = (queueIndex + 1) % queue.length;
      setQueueIndex(randomIdx);
      recordRecent(queue[randomIdx]);
      setIsPlaying(true);
      return;
    }

    if (queueIndex + 1 < queue.length) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      recordRecent(queue[nextIdx]);
      setIsPlaying(true);
    } else if (repeat === 'all') {
      setQueueIndex(0);
      recordRecent(queue[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, repeat, shuffle, recordRecent]);

  const handlePrev = useCallback(() => {
    setPlaybackError(null);
    if (queue.length === 0) return;
    if (currentTime > 4) {
      setSeekRequest({ seconds: 0, nonce: Date.now() });
      return;
    }
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      recordRecent(queue[prevIdx]);
      setIsPlaying(true);
    } else {
      setSeekRequest({ seconds: 0, nonce: Date.now() });
    }
  }, [queue, queueIndex, currentTime, recordRecent]);

  const fallbackTriedRef = useRef<Set<string>>(new Set());

  const handlePlaybackError = useCallback(
    (code: number) => {
      if (!currentTrack) {
        setIsPlaying(false);
        setIsBuffering(false);
        return;
      }

      const failedId = currentTrack.id;
      if (!fallbackTriedRef.current.has(failedId)) {
        fallbackTriedRef.current.add(failedId);
        const primaryArtist = currentTrack.artists[0]?.name || '';
        setPlaybackError('Finding playable audio stream...');

        ytMusicApi
          .getFallback(currentTrack.title, primaryArtist, failedId)
          .then((res) => {
            const replacement = res.tracks?.find((t) => !fallbackTriedRef.current.has(t.id));
            if (replacement) {
              setPlaybackError(null);
              setQueue((prev) =>
                prev.map((item, idx) =>
                  idx === queueIndex
                    ? { ...currentTrack, id: replacement.id, duration: replacement.duration || currentTrack.duration }
                    : item
                )
              );
              setIsPlaying(true);
            } else {
              setPlaybackError(
                code === 101 || code === 150
                  ? 'This recording blocks embedded playback.'
                  : 'Track unavailable to stream here.'
              );
              setIsPlaying(false);
              setIsBuffering(false);
            }
          })
          .catch(() => {
            setPlaybackError('Track unavailable to stream here.');
            setIsPlaying(false);
            setIsBuffering(false);
          });
        return;
      }

      setPlaybackError(
        code === 101 || code === 150
          ? 'This recording blocks embedded playback.'
          : 'Track unavailable to stream here.'
      );
      setIsPlaying(false);
      setIsBuffering(false);
    },
    [currentTrack, queueIndex]
  );

  const pageTitle = useMemo(() => {
    switch (route.view) {
      case 'home':
        return 'Home';
      case 'explore':
        return 'Explore';
      case 'charts':
        return 'Trending Charts';
      case 'moods':
        return route.selectedMood ? route.selectedMood.title : 'Moods & Genres';
      case 'library':
        return 'Library';
      case 'search':
        return `Search: ${route.query}`;
      case 'album':
        return 'Album';
      case 'playlist':
        return 'Playlist';
      case 'artist':
        return 'Artist';
    }
  }, [route]);

  const mainScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0 });
  }, [route]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0B0E] text-[#F4F4F6]">
      <div className="flex-1 min-h-0 flex">
        <Sidebar
          route={route}
          onNavigate={navigate}
          userPlaylists={userPlaylists}
          likedCount={likedTracks.length}
          recentCount={recentTracks.length}
          onOpenCreatePlaylist={() => {
            setPlaylistModalTrack(null);
            setPlaylistModalOpen(true);
          }}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            pageTitle={pageTitle}
            canGoBack={historyIndex > 0}
            onGoBack={goBack}
            searchQuery={route.view === 'search' ? route.query : ''}
            onSearchSubmit={(query) => navigate({ view: 'search', query, filter: 'all' })}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            queueOpen={queuePanelOpen}
            onToggleQueue={() => {
              if (queuePanelOpen && activePanelTab === 'queue') {
                setQueuePanelOpen(false);
              } else {
                setActivePanelTab('queue');
                setQueuePanelOpen(true);
              }
            }}
            queueCount={Math.max(0, queue.length - Math.max(0, queueIndex + 1))}
          />

          <div className="flex-1 min-h-0 flex">
            <main
              ref={mainScrollRef}
              className="flex-1 min-w-0 overflow-y-auto px-4 md:px-8 pt-6"
            >
              <div className="max-w-[1280px] mx-auto">
                {route.view === 'home' && (
                  <HomeView
                    data={homeData}
                    loading={homeLoading}
                    error={homeError}
                    onRetry={loadHome}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    userPlaylists={userPlaylists}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                  />
                )}

                {route.view === 'explore' && (
                  <ExploreView
                    data={exploreData}
                    loading={exploreLoading}
                    error={exploreError}
                    onRetry={loadExplore}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    userPlaylists={userPlaylists}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                    onSelectMood={(mood) => navigate({ view: 'moods', selectedMood: mood })}
                  />
                )}

                {route.view === 'charts' && (
                  <ChartsView
                    data={exploreData}
                    loading={exploreLoading}
                    error={exploreError}
                    onRetry={loadExplore}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    userPlaylists={userPlaylists}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                  />
                )}

                {route.view === 'moods' && (
                  <MoodsView
                    moods={exploreData?.moods || []}
                    selectedMood={route.selectedMood}
                    onSelectMood={(mood?: MoodCategory) =>
                      navigate({ view: 'moods', selectedMood: mood })
                    }
                    onNavigate={navigate}
                    onPlayTrack={(track) => playTrack(track)}
                  />
                )}

                {route.view === 'search' && (
                  <SearchView
                    query={route.query}
                    filter={route.filter}
                    onFilterChange={(filter) =>
                      navigate({ view: 'search', query: route.query, filter })
                    }
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    userPlaylists={userPlaylists}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                  />
                )}

                {(route.view === 'album' || route.view === 'playlist' || route.view === 'artist') && (
                  <DetailView
                    mode={route.view}
                    id={route.id}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    userPlaylists={userPlaylists}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                  />
                )}

                {route.view === 'library' && (
                  <LibraryView
                    tab={route.tab || 'liked'}
                    selectedPlaylistId={route.playlistId}
                    likedTracks={likedTracks}
                    recentTracks={recentTracks}
                    userPlaylists={userPlaylists}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedIds={likedIds}
                    onSelectTab={(tab, playlistId) =>
                      navigate({ view: 'library', tab, playlistId })
                    }
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={handleAddToPlaylist}
                    onRemoveFromPlaylist={handleRemoveFromPlaylist}
                    onDeletePlaylist={handleDeletePlaylist}
                    onOpenCreatePlaylist={() => {
                      setPlaylistModalTrack(null);
                      setPlaylistModalOpen(true);
                    }}
                    onCreatePlaylistWithTrack={(track) => {
                      setPlaylistModalTrack(track);
                      setPlaylistModalOpen(true);
                    }}
                    onNavigate={navigate}
                  />
                )}
              </div>
            </main>

            <QueuePanel
              open={queuePanelOpen}
              activeTab={activePanelTab}
              onTabChange={setActivePanelTab}
              onClose={() => setQueuePanelOpen(false)}
              currentTrack={currentTrack}
              queue={queue}
              queueIndex={queueIndex}
              onPlayFromQueue={(idx) => {
                setQueueIndex(idx);
                recordRecent(queue[idx]);
                setIsPlaying(true);
              }}
              onRemoveFromQueue={(idx) => {
                setQueue((prev) => prev.filter((_, i) => i !== idx));
                if (idx < queueIndex) setQueueIndex((i) => i - 1);
              }}
              onClearUpcoming={() => {
                setQueue((prev) => (queueIndex >= 0 ? prev.slice(0, queueIndex + 1) : []));
              }}
              lyricsData={lyricsData}
              lyricsLoading={lyricsLoading}
            />
          </div>
        </div>
      </div>

      <YouTubeAudioEngine
        videoId={currentTrack?.id || null}
        isPlaying={isPlaying}
        volume={volume}
        muted={muted}
        seekRequest={seekRequest}
        showVideoFrame={showVideo}
        onCloseVideoFrame={() => setShowVideo(false)}
        onProgress={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        }}
        onPlaybackStateChange={(playing, buffering) => {
          setIsPlaying(playing);
          setIsBuffering(buffering);
        }}
        onEnded={() => {
          if (sleepEndOfTrack) {
            setSleepEndOfTrack(false);
            setIsPlaying(false);
          } else {
            handleNext();
          }
        }}
        onPlaybackError={handlePlaybackError}
        trackTitle={currentTrack?.title}
      />

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        shuffle={shuffle}
        repeat={repeat}
        isLiked={currentTrack ? likedIds.has(currentTrack.id) : false}
        showVideo={showVideo}
        queueOpen={queuePanelOpen}
        activePanelTab={activePanelTab}
        playbackError={playbackError}
        sleepRemainingSec={sleepRemainingSec}
        sleepEndOfTrack={sleepEndOfTrack}
        onSetSleepTimer={handleSetSleepTimer}
        onToggleSleepEndOfTrack={handleToggleSleepEndOfTrack}
        onCancelSleepTimer={handleCancelSleepTimer}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={(sec) => {
          setCurrentTime(sec);
          setSeekRequest({ seconds: sec, nonce: Date.now() });
        }}
        onVolumeChange={(v) => {
          setVolume(v);
          if (v > 0 && muted) setMuted(false);
        }}
        onToggleMute={() => setMuted((m) => !m)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        onToggleLike={toggleLike}
        onToggleVideo={() => setShowVideo((v) => !v)}
        onOpenPanelTab={(tab) => {
          if (queuePanelOpen && activePanelTab === tab) {
            setQueuePanelOpen(false);
          } else {
            setActivePanelTab(tab);
            setQueuePanelOpen(true);
          }
        }}
        onNavigate={navigate}
      />

      <CreatePlaylistModal
        open={playlistModalOpen}
        initialTrack={playlistModalTrack}
        onClose={() => setPlaylistModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />
    </div>
  );
}
