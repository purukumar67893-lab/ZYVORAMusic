import {
  FileText,
  Heart,
  ListMusic,
  MonitorPlay,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TrackItem, ViewRoute } from '../types/music';
import { Artwork } from './Artwork';

interface PlayerBarProps {
  track: TrackItem | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isLiked: boolean;
  showVideo: boolean;
  queueOpen: boolean;
  activePanelTab: 'queue' | 'lyrics';
  playbackError: string | null;
  sleepRemainingSec: number | null;
  sleepEndOfTrack: boolean;
  onSetSleepTimer: (minutes: number) => void;
  onToggleSleepEndOfTrack: () => void;
  onCancelSleepTimer: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (track: TrackItem) => void;
  onToggleVideo: () => void;
  onOpenPanelTab: (tab: 'queue' | 'lyrics') => void;
  onNavigate: (route: ViewRoute) => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function PlayerBar({
  track,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  volume,
  muted,
  shuffle,
  repeat,
  isLiked,
  showVideo,
  queueOpen,
  activePanelTab,
  playbackError,
  sleepRemainingSec,
  sleepEndOfTrack,
  onSetSleepTimer,
  onToggleSleepEndOfTrack,
  onCancelSleepTimer,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onToggleVideo,
  onOpenPanelTab,
  onNavigate,
}: PlayerBarProps) {
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const sleepMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sleepMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target as Node)) {
        setSleepMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [sleepMenuOpen]);

  const sleepActive = sleepRemainingSec !== null || sleepEndOfTrack;

  const effectiveDuration = duration > 0 ? duration : track?.durationSeconds || 0;
  const progressPct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <footer className="h-[84px] bg-[#111116] border-t border-white/[0.09] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-40 relative">
      {/* Inline playback error banner when a video blocks third-party embedding */}
      {playbackError && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-t-lg bg-[#1F171A] border border-[#FF2D55]/40 text-xs text-zinc-200 flex items-center gap-3 shadow-lg whitespace-nowrap">
          <span>{playbackError}</span>
          <button
            type="button"
            onClick={onNext}
            className="text-[#FF2D55] font-semibold hover:underline"
          >
            Skip Track
          </button>
        </div>
      )}

      {/* Left: Track Info */}
      <div className="flex items-center gap-3 min-w-0 w-1/3 max-w-[320px]">
        {track ? (
          <>
            <Artwork src={track.thumbnail} alt={track.title} className="w-12 h-12 shrink-0" rounded="md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{track.title}</div>
              <div className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                {track.artists.map((a, idx) => (
                  <span key={`${a.name}-${idx}`} className="inline-flex items-center">
                    {idx > 0 && <span className="mr-1">,</span>}
                    {a.id ? (
                      <button
                        type="button"
                        onClick={() => onNavigate({ view: 'artist', id: a.id! })}
                        className="hover:text-white hover:underline truncate"
                      >
                        {a.name}
                      </button>
                    ) : (
                      <span>{a.name}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleLike(track)}
              aria-label={isLiked ? 'Unlike track' : 'Like track'}
              className={`p-2 rounded-md transition-colors shrink-0 ${
                isLiked ? 'text-[#FF2D55]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF2D55]' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-xs text-zinc-500">Select any song to start streaming</div>
        )}
      </div>

      {/* Center: Transport & Scrubber */}
      <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1.5">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
              shuffle ? 'text-[#FF2D55]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!track}
            aria-label="Previous track"
            className="p-1.5 text-zinc-300 hover:text-white disabled:opacity-35 transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!track}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-9 h-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 disabled:opacity-40 transition-transform flex items-center justify-center shrink-0"
          >
            {isBuffering ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!track}
            aria-label="Next track"
            className="p-1.5 text-zinc-300 hover:text-white disabled:opacity-35 transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Repeat mode: ${repeat}`}
            className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
              repeat !== 'off' ? 'text-[#FF2D55]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full flex items-center gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-zinc-400 w-10 text-right shrink-0">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 h-4 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className="h-full bg-[#FF2D55] transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={effectiveDuration || 100}
              step={1}
              value={Math.min(currentTime, effectiveDuration || 100)}
              disabled={!track || effectiveDuration === 0}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Seek track position"
              className="studio-range absolute inset-0 w-full h-full opacity-0 hover:opacity-100 focus:opacity-100"
            />
          </div>

          <span className="font-mono text-[11px] tabular-nums text-zinc-400 w-10 shrink-0">
            {effectiveDuration > 0 ? formatTime(effectiveDuration) : track?.duration || '0:00'}
          </span>
        </div>
      </div>

      {/* Right: Sleep Timer, Lyrics, Video, Queue, Volume */}
      <div className="flex items-center justify-end gap-1.5 md:gap-2 md:w-1/3 md:max-w-[340px]">
        {/* Sleep Timer Popover Trigger */}
        <div ref={sleepMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setSleepMenuOpen((prev) => !prev)}
            title="Sleep timer"
            aria-label="Sleep timer"
            className={`h-8 px-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              sleepActive || sleepMenuOpen
                ? 'text-[#FF2D55] bg-white/[0.08]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            {sleepRemainingSec !== null && (
              <span className="font-mono text-[11px] tabular-nums font-medium">
                {formatTime(sleepRemainingSec)}
              </span>
            )}
            {sleepEndOfTrack && sleepRemainingSec === null && (
              <span className="text-[11px] font-medium hidden sm:inline">End of track</span>
            )}
          </button>

          {sleepMenuOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-64 rounded-xl bg-[#16161C] border border-white/[0.1] shadow-2xl p-3.5 z-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Sleep Timer</span>
                {sleepActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCancelSleepTimer();
                      setSleepMenuOpen(false);
                    }}
                    className="text-xs font-medium text-[#FF2D55] hover:underline"
                  >
                    Turn off
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSleepMenuOpen(false)}
                    aria-label="Close sleep timer menu"
                    className="p-0.5 text-zinc-400 hover:text-white rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {sleepRemainingSec !== null && (
                <div className="px-3 py-2 rounded-lg bg-white/[0.05] flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Stopping in</span>
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {formatTime(sleepRemainingSec)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      onSetSleepTimer(mins);
                      setSleepMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-[#1E1E26] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition-colors text-left font-mono tabular-nums"
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!track}
                onClick={() => {
                  onToggleSleepEndOfTrack();
                  setSleepMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors disabled:opacity-40 ${
                  sleepEndOfTrack
                    ? 'bg-[#FF2D55]/20 text-[#FF2D55] border border-[#FF2D55]/40'
                    : 'bg-[#1E1E26] hover:bg-white/[0.12] text-zinc-200'
                }`}
              >
                Stop after current track
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number.parseInt(customMinutes, 10);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    onSetSleepTimer(Math.min(480, parsed));
                    setCustomMinutes('');
                    setSleepMenuOpen(false);
                  }
                }}
                className="flex items-center gap-1.5 pt-1 border-t border-white/[0.08]"
              >
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Custom min"
                  aria-label="Custom sleep timer minutes"
                  className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-[#0E0E12] border border-white/[0.1] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2D55] font-mono tabular-nums"
                />
                <button
                  type="submit"
                  className="h-8 px-3 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Set
                </button>
              </form>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenPanelTab('lyrics')}
          title="Lyrics"
          aria-label="Toggle lyrics"
          className={`hidden md:inline-flex p-2 rounded-lg transition-colors ${
            queueOpen && activePanelTab === 'lyrics'
              ? 'text-[#FF2D55] bg-white/[0.08]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleVideo}
          title="Toggle video frame"
          aria-label="Toggle music video"
          disabled={!track}
          className={`hidden md:inline-flex p-2 rounded-lg transition-colors disabled:opacity-40 ${
            showVideo
              ? 'text-[#FF2D55] bg-white/[0.08]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <MonitorPlay className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenPanelTab('queue')}
          title="Up Next Queue"
          aria-label="Toggle queue"
          className={`hidden md:inline-flex p-2 rounded-lg transition-colors ${
            queueOpen && activePanelTab === 'queue'
              ? 'text-[#FF2D55] bg-white/[0.08]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="hidden md:flex items-center gap-2 ml-1 pl-2 border-l border-white/[0.08]">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="relative w-20 h-4 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className="h-full bg-zinc-200"
                style={{ width: `${muted ? 0 : volume}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="studio-range absolute inset-0 w-full h-full opacity-0 hover:opacity-100"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
