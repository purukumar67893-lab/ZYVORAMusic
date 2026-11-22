import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ListVideo, Menu, Search, X } from 'lucide-react';
import { ytMusicApi } from '../lib/api';

interface TopBarProps {
  pageTitle: string;
  canGoBack: boolean;
  onGoBack: () => void;
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
  onOpenMobileNav: () => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
  queueCount: number;
}

export function TopBar({
  pageTitle,
  canGoBack,
  onGoBack,
  searchQuery,
  onSearchSubmit,
  onOpenMobileNav,
  queueOpen,
  onToggleQueue,
  queueCount,
}: TopBarProps) {
  const [input, setInput] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      ytMusicApi
        .getSuggestions(trimmed)
        .then((res) => setSuggestions(res.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitQuery = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    onSearchSubmit(trimmed);
  };

  return (
    <header className="h-16 px-4 md:px-8 border-b border-white/[0.08] bg-[#0B0B0E]/90 backdrop-blur-md flex items-center justify-between gap-4 md:gap-8 shrink-0 z-30">
      {/* Zone 1: Menu / Back + View Context */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {canGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            aria-label="Go back"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <span className="hidden sm:block text-sm font-medium text-zinc-300 truncate max-w-[180px]">
          {pageTitle}
        </span>
      </div>

      {/* Zone 2: Live YouTube Music Search */}
      <div ref={containerRef} className="relative flex-1 max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(input);
          }}
          className="relative flex items-center"
        >
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={input}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            placeholder="Search songs, albums, artists, playlists on YouTube Music..."
            aria-label="Search YouTube Music"
            className="w-full h-10 pl-10 pr-9 rounded-lg bg-[#141418] border border-white/[0.09] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2D55] transition-colors"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                setSuggestions([]);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-[#16161C] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50 py-1.5">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setInput(item);
                  submitQuery(item);
                }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06] flex items-center gap-3 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zone 3: Primary Action (Up Next Queue Drawer) */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onToggleQueue}
          className={`h-9 px-3.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 border ${
            queueOpen
              ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
              : 'bg-[#141418] text-zinc-200 border-white/[0.09] hover:bg-white/[0.06]'
          }`}
        >
          <ListVideo className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Up Next</span>
          {queueCount > 0 && (
            <span className="font-mono tabular-nums opacity-80">{queueCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
