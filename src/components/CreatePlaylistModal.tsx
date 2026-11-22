import { useState } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_COVERS } from '../lib/storage';
import type { TrackItem } from '../types/music';

interface CreatePlaylistModalProps {
  open: boolean;
  initialTrack: TrackItem | null;
  onClose: () => void;
  onCreate: (name: string, description: string, coverUrl: string, initialTrack: TrackItem | null) => void;
}

export function CreatePlaylistModal({
  open,
  initialTrack,
  onClose,
  onCreate,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(DEFAULT_COVERS[0]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, description.trim(), coverUrl, initialTrack);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#15151B] border border-white/[0.1] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-white">Create Playlist</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-400 hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playlist-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Playlist Title
            </label>
            <input
              id="playlist-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Late Night Sessions"
              className="w-full h-10 px-3.5 rounded-lg bg-[#0E0E12] border border-white/[0.1] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF2D55]"
            />
          </div>

          <div>
            <label htmlFor="playlist-desc" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Description (optional)
            </label>
            <input
              id="playlist-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Curated favorites from YouTube Music"
              className="w-full h-10 px-3.5 rounded-lg bg-[#0E0E12] border border-white/[0.1] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF2D55]"
            />
          </div>

          <div>
            <div className="block text-xs font-medium text-zinc-400 mb-2">Cover Artwork</div>
            <div className="flex items-center gap-3">
              {DEFAULT_COVERS.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCoverUrl(url)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    coverUrl === url ? 'border-[#FF2D55]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Cover option ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {initialTrack && (
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300">
              Adding <span className="font-semibold text-white">{initialTrack.title}</span> to this playlist.
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#FF2D55] hover:bg-[#E12248] rounded-lg transition-colors"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
