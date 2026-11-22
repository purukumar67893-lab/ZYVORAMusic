import { Play, Trash2, X } from 'lucide-react';
import type { LyricsResponse, TrackItem } from '../types/music';
import { Artwork } from './Artwork';

interface QueuePanelProps {
  open: boolean;
  activeTab: 'queue' | 'lyrics';
  onTabChange: (tab: 'queue' | 'lyrics') => void;
  onClose: () => void;
  currentTrack: TrackItem | null;
  queue: TrackItem[];
  queueIndex: number;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearUpcoming: () => void;
  lyricsData: LyricsResponse | null;
  lyricsLoading: boolean;
}

export function QueuePanel({
  open,
  activeTab,
  onTabChange,
  onClose,
  currentTrack,
  queue,
  queueIndex,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearUpcoming,
  lyricsData,
  lyricsLoading,
}: QueuePanelProps) {
  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 bottom-[84px] lg:static lg:h-full w-full sm:w-[360px] bg-[#0E0E12] border-l border-white/[0.08] flex flex-col shrink-0 z-30">
      {/* Header Tabs */}
      <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#16161C]">
          <button
            type="button"
            onClick={() => onTabChange('queue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'queue' ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Up Next
          </button>
          <button
            type="button"
            onClick={() => onTabChange('lyrics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'lyrics' ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lyrics
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close side panel"
          className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {activeTab === 'queue' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {currentTrack && (
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-2">Now Playing</div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <Artwork src={currentTrack.thumbnail} alt={currentTrack.title} className="w-11 h-11" rounded="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{currentTrack.title}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {currentTrack.artists.map((a) => a.name).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500">
                Queue ({Math.max(0, queue.length - (queueIndex + 1))} upcoming)
              </span>
              {queue.length > queueIndex + 1 && (
                <button
                  type="button"
                  onClick={onClearUpcoming}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Clear upcoming
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                Play a track to generate a live YouTube Music Up Next radio queue.
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((item, idx) => {
                  const isCurrent = idx === queueIndex;
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`group flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                        isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onPlayFromQueue(idx)}
                        className="relative w-10 h-10 rounded overflow-hidden shrink-0"
                      >
                        <Artwork src={item.thumbnail} alt={item.title} className="w-10 h-10" rounded="sm" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayFromQueue(idx)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div
                          className={`text-xs font-medium truncate ${
                            isCurrent ? 'text-[#FF2D55]' : 'text-zinc-200'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {item.artists.map((a) => a.name).join(', ')}
                        </div>
                      </button>

                      {item.duration && (
                        <span className="font-mono text-[11px] tabular-nums text-zinc-500 shrink-0">
                          {item.duration}
                        </span>
                      )}

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onRemoveFromQueue(idx)}
                          aria-label={`Remove ${item.title} from queue`}
                          className="p-1 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          {!currentTrack ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              Start playing a track to view synced YouTube Music lyrics.
            </div>
          ) : lyricsLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-white/[0.06] rounded w-3/4" />
              <div className="h-4 bg-white/[0.06] rounded w-2/3" />
              <div className="h-4 bg-white/[0.06] rounded w-5/6" />
              <div className="h-4 bg-white/[0.06] rounded w-1/2" />
            </div>
          ) : lyricsData?.lyrics ? (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-white">{currentTrack.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentTrack.artists.map((a) => a.name).join(', ')}
                </p>
              </div>
              <pre className="font-sans text-sm leading-7 text-zinc-200 whitespace-pre-wrap break-words">
                {lyricsData.lyrics}
              </pre>
              {lyricsData.source && (
                <p className="text-xs text-zinc-500 pt-3 border-t border-white/[0.08]">
                  {lyricsData.source}
                </p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-300">Lyrics unavailable</p>
              <p className="text-xs text-zinc-500">
                YouTube Music has not published lyrics for this track.
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
