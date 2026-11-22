import { Play } from 'lucide-react';
import type { MediaCardItem, TrackItem, ViewRoute } from '../types/music';
import { Artwork } from './Artwork';

interface MediaCardProps {
  item: MediaCardItem;
  onNavigate: (route: ViewRoute) => void;
  onPlayTrack?: (track: TrackItem) => void;
}

export function MediaCard({ item, onNavigate, onPlayTrack }: MediaCardProps) {
  const isArtist = item.itemType === 'artist';

  const handleClick = () => {
    if (item.itemType === 'album') {
      onNavigate({ view: 'album', id: item.id });
    } else if (item.itemType === 'playlist') {
      onNavigate({ view: 'playlist', id: item.id });
    } else if (item.itemType === 'artist') {
      onNavigate({ view: 'artist', id: item.id });
    } else if (onPlayTrack) {
      onPlayTrack({
        id: item.id,
        title: item.title,
        artists: item.artists || [{ name: item.subtitle || 'YouTube Music' }],
        thumbnail: item.thumbnail,
        itemType: item.itemType === 'video' ? 'video' : 'song',
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group text-left p-3 rounded-xl bg-[#141418] border border-white/[0.06] hover:bg-[#1B1B21] hover:border-white/[0.12] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D55] flex flex-col"
    >
      <div className="relative w-full aspect-square mb-3 overflow-hidden">
        <Artwork
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full"
          rounded={isArtist ? 'full' : 'lg'}
        />

        <div
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[#FF2D55] text-white flex items-center justify-center shadow-lg transition-all duration-150 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 ${
            isArtist ? 'right-3 bottom-3' : ''
          }`}
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </div>
      </div>

      <div
        className={`text-sm font-semibold text-zinc-100 truncate w-full ${
          isArtist ? 'text-center' : ''
        }`}
      >
        {item.title}
      </div>

      <div
        className={`text-xs text-zinc-400 truncate w-full mt-1 ${
          isArtist ? 'text-center' : ''
        }`}
      >
        {item.subtitle}
      </div>
    </button>
  );
}
