import {
  Compass,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  Plus,
  Radio,
  TrendingUp,
  X,
} from 'lucide-react';
import type { UserPlaylist, ViewRoute } from '../types/music';

interface SidebarProps {
  route: ViewRoute;
  onNavigate: (route: ViewRoute) => void;
  userPlaylists: UserPlaylist[];
  likedCount: number;
  recentCount: number;
  onOpenCreatePlaylist: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  route,
  onNavigate,
  userPlaylists,
  likedCount,
  recentCount,
  onOpenCreatePlaylist,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: Array<{ id: ViewRoute['view']; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'charts', label: 'Charts', icon: TrendingUp },
    { id: 'moods', label: 'Moods', icon: Radio },
    { id: 'library', label: 'Library', icon: Library },
  ];

  const handleNav = (nextRoute: ViewRoute) => {
    onNavigate(nextRoute);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0E0E12] border-r border-white/[0.08] w-[240px] select-none">
      {/* Brand Wordmark */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <button
          type="button"
          onClick={() => handleNav({ view: 'home' })}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D55] rounded-md"
        >
          <span className="w-7 h-7 rounded-lg bg-[#FF2D55] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" />
              <polygon points="10,8.5 16,12 10,15.5" fill="white" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            ZYVORAMusic
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 text-zinc-400 hover:text-white rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary navigation" className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            route.view === item.id &&
            !(route.view === 'library' && (route.tab === 'liked' || route.tab === 'recent' || route.playlistId));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav({ view: item.id } as ViewRoute)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D55] ${
                isActive
                  ? 'bg-white/[0.09] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF2D55]' : ''}`} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mx-5 border-t border-white/[0.08]" />

      {/* Quick Collection & Playlists */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-xs font-medium text-zinc-500">Your Collection</div>
          <button
            type="button"
            onClick={() => handleNav({ view: 'library', tab: 'liked' })}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
              route.view === 'library' && route.tab === 'liked'
                ? 'bg-white/[0.09] text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-3 truncate">
              <Heart className="w-4 h-4 text-[#FF2D55] shrink-0" strokeWidth={1.8} />
              <span className="truncate">Liked Songs</span>
            </span>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">{likedCount}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav({ view: 'library', tab: 'recent' })}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
              route.view === 'library' && route.tab === 'recent'
                ? 'bg-white/[0.09] text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-3 truncate">
              <History className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">Recently Played</span>
            </span>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">{recentCount}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="px-3 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Playlists</span>
            <button
              type="button"
              onClick={onOpenCreatePlaylist}
              aria-label="Create new playlist"
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {userPlaylists.length === 0 ? (
            <button
              type="button"
              onClick={onOpenCreatePlaylist}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
            >
              Create your first playlist
            </button>
          ) : (
            userPlaylists.map((pl) => {
              const active = route.view === 'library' && route.playlistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleNav({ view: 'library', tab: 'playlists', playlistId: pl.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-white/[0.09] text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <ListMusic className="w-4 h-4 shrink-0 text-zinc-500" strokeWidth={1.8} />
                    <span className="truncate">{pl.name}</span>
                  </span>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums shrink-0">
                    {pl.tracks.length}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-full">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
