import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ytMusicApi } from '../lib/api';
import type { MoodCategory, MoodDetailResponse, TrackItem, ViewRoute } from '../types/music';
import { MediaCard } from '../components/MediaCard';

interface MoodsViewProps {
  moods: MoodCategory[];
  selectedMood?: MoodCategory;
  onSelectMood: (mood?: MoodCategory) => void;
  onNavigate: (route: ViewRoute) => void;
  onPlayTrack: (track: TrackItem) => void;
}

export function MoodsView({
  moods,
  selectedMood,
  onSelectMood,
  onNavigate,
  onPlayTrack,
}: MoodsViewProps) {
  const [detail, setDetail] = useState<MoodDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMood) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    ytMusicApi
      .getMood(selectedMood.browseId, selectedMood.params)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load mood');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMood]);

  if (selectedMood) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectMood(undefined)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Moods & Genres</span>
          </button>
        </div>

        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">
            {detail?.title || selectedMood.title}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Curated YouTube Music playlists and stations.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-[#141418]" />
            ))}
          </div>
        )}

        {error && <div className="text-sm text-[#FF2D55]">{error}</div>}

        {!loading &&
          detail?.sections.map((sec, idx) => (
            <section key={`${sec.title}-${idx}`} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-white">{sec.title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(sec.cards || []).map((card) => (
                  <MediaCard
                    key={card.id}
                    item={card}
                    onNavigate={onNavigate}
                    onPlayTrack={onPlayTrack}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Moods & Genres</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Select a mood or genre to browse curated YouTube Music playlists.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {moods.map((mood) => (
          <button
            key={`${mood.title}-${mood.params}`}
            type="button"
            onClick={() => onSelectMood(mood)}
            className="p-4 rounded-xl bg-[#141418] border border-white/[0.08] hover:bg-[#1C1C23] hover:border-[#FF2D55]/60 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-white truncate">{mood.title}</div>
            <div className="text-xs text-zinc-500 mt-1">Explore playlists</div>
          </button>
        ))}
      </div>
    </div>
  );
}
