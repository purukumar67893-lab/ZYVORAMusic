import type { TrackItem, UserPlaylist } from '../types/music';
import { STUDIO_ASSETS } from './assets';

const LIKED_KEY = 'sonora_liked_tracks_v1';
const RECENT_KEY = 'sonora_recent_tracks_v1';
const PLAYLISTS_KEY = 'sonora_user_playlists_v1';
const PREFS_KEY = 'sonora_player_prefs_v1';

export const DEFAULT_COVERS = [
  STUDIO_ASSETS.coverLateNightVinyl,
  STUDIO_ASSETS.coverAcousticSession,
];

export interface PlayerPrefs {
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSave<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export const libraryStorage = {
  getLikedTracks: (): TrackItem[] => safeParse<TrackItem[]>(LIKED_KEY, []),
  saveLikedTracks: (tracks: TrackItem[]) => safeSave(LIKED_KEY, tracks),

  getRecentTracks: (): TrackItem[] => safeParse<TrackItem[]>(RECENT_KEY, []),
  saveRecentTracks: (tracks: TrackItem[]) => safeSave(RECENT_KEY, tracks.slice(0, 50)),

  getPlaylists: (): UserPlaylist[] => safeParse<UserPlaylist[]>(PLAYLISTS_KEY, []),
  savePlaylists: (playlists: UserPlaylist[]) => safeSave(PLAYLISTS_KEY, playlists),

  getPrefs: (): PlayerPrefs =>
    safeParse<PlayerPrefs>(PREFS_KEY, {
      volume: 80,
      shuffle: false,
      repeat: 'off',
    }),
  savePrefs: (prefs: PlayerPrefs) => safeSave(PREFS_KEY, prefs),
};
