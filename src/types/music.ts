export interface ArtistRef {
  name: string;
  id?: string;
}

export interface AlbumRef {
  name: string;
  id?: string;
}

export interface TrackItem {
  id: string;
  title: string;
  artists: ArtistRef[];
  album?: AlbumRef;
  duration?: string;
  durationSeconds?: number;
  thumbnail: string;
  subtitle?: string;
  itemType: 'song' | 'video';
  views?: string;
}

export interface MediaCardItem {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  itemType: 'album' | 'playlist' | 'artist' | 'song' | 'video';
  year?: string;
  artists?: ArtistRef[];
}

export interface MoodCategory {
  title: string;
  browseId: string;
  params: string;
  color?: string;
}

export interface ShelfSection {
  title: string;
  kind: 'tracks' | 'cards' | 'moods';
  tracks?: TrackItem[];
  cards?: MediaCardItem[];
  moods?: MoodCategory[];
}

export interface HomeFeedResponse {
  sections: ShelfSection[];
}

export interface ExploreResponse {
  newReleases: MediaCardItem[];
  trending: TrackItem[];
  moods: MoodCategory[];
  sections: ShelfSection[];
}

export interface MoodDetailResponse {
  title: string;
  sections: ShelfSection[];
}

export interface SearchResponse {
  query: string;
  type: SearchFilterType;
  topResult: MediaCardItem | TrackItem | null;
  tracks: TrackItem[];
  albums: MediaCardItem[];
  artists: MediaCardItem[];
  playlists: MediaCardItem[];
  nextToken?: string;
}

export interface SearchMoreResponse {
  tracks: TrackItem[];
  albums: MediaCardItem[];
  artists: MediaCardItem[];
  playlists: MediaCardItem[];
  nextToken?: string;
}

export interface GenreFeedResponse {
  slug: string;
  title: string;
  tracks: TrackItem[];
  playlists: MediaCardItem[];
  albums: MediaCardItem[];
  nextToken?: string;
}

export type SearchFilterType = 'all' | 'song' | 'video' | 'album' | 'artist' | 'playlist';

export interface AlbumDetailResponse {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  thumbnail: string;
  year?: string;
  trackCount?: string;
  duration?: string;
  artists: ArtistRef[];
  tracks: TrackItem[];
}

export interface PlaylistDetailResponse {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  thumbnail: string;
  author?: string;
  trackCount?: string;
  tracks: TrackItem[];
}

export interface ArtistDetailResponse {
  id: string;
  name: string;
  description?: string;
  subscribers?: string;
  thumbnail: string;
  topSongs: TrackItem[];
  albums: MediaCardItem[];
  singles: MediaCardItem[];
  relatedArtists: MediaCardItem[];
}

export interface LyricsResponse {
  videoId: string;
  lyrics: string | null;
  source?: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  createdAt: string;
  tracks: TrackItem[];
}

export type ViewRoute =
  | { view: 'home' }
  | { view: 'explore' }
  | { view: 'charts' }
  | { view: 'moods'; selectedMood?: MoodCategory }
  | { view: 'library'; tab?: 'liked' | 'playlists' | 'recent'; playlistId?: string }
  | { view: 'search'; query: string; filter: SearchFilterType }
  | { view: 'album'; id: string }
  | { view: 'playlist'; id: string }
  | { view: 'artist'; id: string };
