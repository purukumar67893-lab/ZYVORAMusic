import type {
  AlbumDetailResponse,
  ArtistDetailResponse,
  ExploreResponse,
  GenreFeedResponse,
  HomeFeedResponse,
  LyricsResponse,
  MoodDetailResponse,
  PlaylistDetailResponse,
  SearchFilterType,
  SearchMoreResponse,
  SearchResponse,
  TrackItem,
} from '../types/music';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const ytMusicApi = {
  getHome: () => fetchJson<HomeFeedResponse>('/api/ytmusic/home'),
  getGenre: (slug: string) =>
    fetchJson<GenreFeedResponse>(`/api/ytmusic/genre/${encodeURIComponent(slug)}`),
  getExplore: () => fetchJson<ExploreResponse>('/api/ytmusic/explore'),
  getMood: (browseId: string, params: string) =>
    fetchJson<MoodDetailResponse>(
      `/api/ytmusic/mood?browseId=${encodeURIComponent(browseId)}&params=${encodeURIComponent(params)}`
    ),
  getSuggestions: (q: string) =>
    fetchJson<{ suggestions: string[] }>(`/api/ytmusic/suggestions?q=${encodeURIComponent(q)}`),
  search: (q: string, type: SearchFilterType = 'all') =>
    fetchJson<SearchResponse>(`/api/ytmusic/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`),
  searchMore: (token: string, type: SearchFilterType) =>
    fetchJson<SearchMoreResponse>(
      `/api/ytmusic/search-more?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}`
    ),
  getFallback: (title: string, artist: string, excludeId: string) =>
    fetchJson<{ tracks: TrackItem[] }>(
      `/api/ytmusic/fallback?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&excludeId=${encodeURIComponent(excludeId)}`
    ),
  getAlbum: (id: string) => fetchJson<AlbumDetailResponse>(`/api/ytmusic/album/${encodeURIComponent(id)}`),
  getPlaylist: (id: string) => fetchJson<PlaylistDetailResponse>(`/api/ytmusic/playlist/${encodeURIComponent(id)}`),
  getArtist: (id: string) => fetchJson<ArtistDetailResponse>(`/api/ytmusic/artist/${encodeURIComponent(id)}`),
  getUpNext: (videoId: string) =>
    fetchJson<{ tracks: TrackItem[] }>(`/api/ytmusic/up-next/${encodeURIComponent(videoId)}`),
  getLyrics: (videoId: string) => fetchJson<LyricsResponse>(`/api/ytmusic/lyrics/${encodeURIComponent(videoId)}`),
};
