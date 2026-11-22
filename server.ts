import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Innertube, Log, Parser } from 'youtubei.js';
import type {
  AlbumDetailResponse,
  ArtistDetailResponse,
  ArtistRef,
  ExploreResponse,
  GenreFeedResponse,
  HomeFeedResponse,
  LyricsResponse,
  MediaCardItem,
  MoodCategory,
  MoodDetailResponse,
  PlaylistDetailResponse,
  SearchFilterType,
  SearchMoreResponse,
  SearchResponse,
  ShelfSection,
  TrackItem,
} from './src/types/music.ts';

dotenv.config();

// Suppress benign YouTube InnerTube JIT node schema warnings (e.g. TextBadge / LiveBadge)
Log.setLevel(Log.Level.NONE);
Parser.setParserErrorHandler(() => {
  // Handled silently; youtubei.js automatically JIT-generates unknown nodes
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Simple TTL Cache for live YouTube Music API responses
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number): T {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

// Continuation store for unlimited Search / Genre scrolling
interface ContinuationEntry {
  result: unknown;
  expiresAt: number;
}

const continuations = new Map<string, ContinuationEntry>();
let continuationSeq = 0;

function saveContinuation(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const obj = result as Record<string, unknown>;
  if (!obj.has_continuation || typeof obj.getContinuation !== 'function') return undefined;

  if (continuations.size > 150) {
    const firstKey = continuations.keys().next().value;
    if (firstKey) continuations.delete(firstKey);
  }

  const token = `cont_${++continuationSeq}_${Date.now()}`;
  continuations.set(token, {
    result,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  return token;
}

function getContinuationEntry(token: string): unknown | null {
  const entry = continuations.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    continuations.delete(token);
    return null;
  }
  return entry.result;
}

const GENRE_CONFIG: Record<string, { title: string; query: string }> = {
  phonk: { title: 'Phonk & Drift', query: 'phonk drift brazilian phonk' },
  'hip-hop': { title: 'Hip-Hop & Trap', query: 'hip hop trap hits' },
  electronic: { title: 'Electronic & Dance', query: 'electronic edm dance music' },
  pop: { title: 'Pop Hits', query: 'top pop hits' },
  lofi: { title: 'Lo-Fi & Chill', query: 'lofi hip hop chill beats' },
  workout: { title: 'Workout & Gym', query: 'workout gym motivation music' },
  desi: { title: 'Bollywood & Desi', query: 'hindi bollywood punjabi hits' },
  rock: { title: 'Rock & Alt', query: 'rock alternative hits' },
  rnb: { title: 'R&B & Soul', query: 'r&b soul hits' },
};

let ytPromise: Promise<Innertube> | null = null;

async function getYouTubeClient(): Promise<Innertube> {
  if (!ytPromise) {
    ytPromise = Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    }).catch((err) => {
      ytPromise = null;
      throw err;
    });
  }
  return ytPromise;
}

function extractText(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (Array.isArray(obj.runs)) {
      return obj.runs
        .map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).text ?? '') : ''))
        .join('');
    }
    if (typeof obj.simpleText === 'string') return obj.simpleText;
  }
  return '';
}

function upgradeThumbnailUrl(url: string, size = 544): string {
  if (!url) return '';
  if (url.startsWith('//')) url = `https:${url}`;
  // Upgrade Googleusercontent square sizes for sharp album art
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    return url.replace(/=w\d+-h\d+([^&]*)/, `=w${size}-h${size}$1`);
  }
  return url;
}

function extractThumbnail(item: unknown, size = 544): string {
  if (!item || typeof item !== 'object') return '';
  const obj = item as Record<string, unknown>;

  const candidates: Array<Array<{ url?: string; width?: number }>> = [];

  if (Array.isArray(obj.thumbnails)) {
    candidates.push(obj.thumbnails as Array<{ url?: string; width?: number }>);
  }
  if (obj.thumbnail && typeof obj.thumbnail === 'object') {
    const t = obj.thumbnail as Record<string, unknown>;
    if (Array.isArray(t.contents)) candidates.push(t.contents as Array<{ url?: string; width?: number }>);
    if (Array.isArray(t.thumbnails)) candidates.push(t.thumbnails as Array<{ url?: string; width?: number }>);
  }
  if (Array.isArray(obj.thumbnail)) {
    candidates.push(obj.thumbnail as Array<{ url?: string; width?: number }>);
  }
  if (obj.thumbnailRenderer && typeof obj.thumbnailRenderer === 'object') {
    const tr = obj.thumbnailRenderer as Record<string, unknown>;
    const mtr = tr.musicThumbnailRenderer as Record<string, unknown> | undefined;
    const thumbs = (mtr?.thumbnail as Record<string, unknown> | undefined)?.thumbnails;
    if (Array.isArray(thumbs)) candidates.push(thumbs as Array<{ url?: string; width?: number }>);
  }

  for (const list of candidates) {
    if (list.length > 0) {
      const sorted = [...list].sort((a, b) => (b.width || 0) - (a.width || 0));
      const best = sorted[0]?.url || list[0]?.url;
      if (best) return upgradeThumbnailUrl(best, size);
    }
  }
  return '';
}

function extractArtists(item: Record<string, unknown>): ArtistRef[] {
  const rawList = Array.isArray(item.artists)
    ? item.artists
    : Array.isArray(item.authors)
      ? item.authors
      : [];

  const parsed: ArtistRef[] = [];
  for (const a of rawList) {
    if (!a || typeof a !== 'object') continue;
    const artistObj = a as Record<string, unknown>;
    const name = extractText(artistObj.name || artistObj.text);
    const channelId =
      typeof artistObj.channel_id === 'string'
        ? artistObj.channel_id
        : typeof (artistObj.endpoint as Record<string, unknown> | undefined)?.payload === 'object'
          ? String(
              ((artistObj.endpoint as Record<string, unknown>).payload as Record<string, unknown>)?.browseId || ''
            )
          : undefined;
    if (name) {
      parsed.push({ name, id: channelId || undefined });
    }
  }

  if (parsed.length > 0) return parsed;

  if (item.author && typeof item.author === 'object') {
    const auth = item.author as Record<string, unknown>;
    const name = extractText(auth.name);
    if (name) {
      return [
        {
          name,
          id: typeof auth.channel_id === 'string' ? auth.channel_id : undefined,
        },
      ];
    }
  }

  const subtitle = extractText(item.subtitle);
  if (subtitle) {
    const firstPart = subtitle.split('•')[0]?.trim();
    if (firstPart && !/^\d+:\d+$/.test(firstPart) && !['Song', 'Video', 'Album', 'Single'].includes(firstPart)) {
      return [{ name: firstPart }];
    }
  }

  // Fallback to flex_columns[1]
  if (Array.isArray(item.flex_columns) && item.flex_columns[1]) {
    const col1 = item.flex_columns[1] as Record<string, unknown>;
    const colTitle = col1.title as Record<string, unknown> | undefined;
    if (colTitle && Array.isArray(colTitle.runs)) {
      const artistRuns: ArtistRef[] = [];
      for (const run of colTitle.runs as Array<Record<string, unknown>>) {
        const browseId = String(
          ((run.endpoint as Record<string, unknown> | undefined)?.payload as Record<string, unknown> | undefined)
            ?.browseId || ''
        );
        const text = extractText(run.text).trim();
        if (text && text !== '•' && text !== ',' && text !== '&' && browseId.startsWith('UC')) {
          artistRuns.push({ name: text, id: browseId });
        }
      }
      if (artistRuns.length > 0) return artistRuns;
    }
    const rawSub = extractText(col1.title);
    if (rawSub) {
      const parts = rawSub.split('•').map((s) => s.trim()).filter(Boolean);
      const candidate = parts.find((p) => !['Song', 'Video'].includes(p) && !/^\d+:\d+$/.test(p));
      if (candidate) return [{ name: candidate }];
    }
  }

  return [{ name: 'YouTube Music' }];
}

function normalizeTrack(raw: unknown, fallbackThumb = '', fallbackAlbum?: { id?: string; name: string }): TrackItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const videoId =
    (typeof item.id === 'string' ? item.id : '') ||
    (typeof item.video_id === 'string' ? item.video_id : '') ||
    String(
      ((item.endpoint as Record<string, unknown> | undefined)?.payload as Record<string, unknown> | undefined)
        ?.videoId || ''
    );

  if (!videoId || videoId.length < 6) return null;

  const title = extractText(item.title || item.name) || 'Untitled Track';
  const artists = extractArtists(item);

  let album: { id?: string; name: string } | undefined = fallbackAlbum;
  if (item.album && typeof item.album === 'object') {
    const alb = item.album as Record<string, unknown>;
    const albName = extractText(alb.name || alb.title);
    if (albName) {
      album = {
        name: albName,
        id: typeof alb.id === 'string' ? alb.id : undefined,
      };
    }
  }

  let duration = '';
  let durationSeconds: number | undefined;
  if (item.duration && typeof item.duration === 'object') {
    const dur = item.duration as Record<string, unknown>;
    duration = extractText(dur.text);
    if (typeof dur.seconds === 'number') durationSeconds = dur.seconds;
  } else if (typeof item.duration === 'string') {
    duration = item.duration;
  }

  const thumbnail = extractThumbnail(item, 544) || fallbackThumb;
  const itemType = item.item_type === 'video' ? 'video' : 'song';
  const views = extractText(item.views);
  const subtitle = extractText(item.subtitle);

  return {
    id: videoId,
    title,
    artists,
    album,
    duration: duration || undefined,
    durationSeconds,
    thumbnail,
    subtitle: subtitle || undefined,
    itemType,
    views: views || undefined,
  };
}

function normalizeCard(raw: unknown): MediaCardItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const endpointPayload = (item.endpoint as Record<string, unknown> | undefined)?.payload as
    | Record<string, unknown>
    | undefined;

  const id =
    (typeof item.id === 'string' && item.id) ||
    (typeof endpointPayload?.browseId === 'string' && endpointPayload.browseId) ||
    (typeof endpointPayload?.videoId === 'string' && endpointPayload.videoId) ||
    '';

  if (!id) return null;

  const title = extractText(item.title || item.name);
  if (!title) return null;

  const rawType = String(item.item_type || '').toLowerCase();
  let itemType: MediaCardItem['itemType'] = 'playlist';
  if (rawType === 'album' || id.startsWith('MPRE')) itemType = 'album';
  else if (rawType === 'artist' || id.startsWith('UC')) itemType = 'artist';
  else if (rawType === 'video') itemType = 'video';
  else if (rawType === 'song' || (!id.startsWith('VL') && !id.startsWith('PL') && !id.startsWith('RD') && !id.startsWith('UC') && !id.startsWith('MPRE') && id.length === 11)) {
    itemType = rawType === 'video' ? 'video' : 'song';
  }

  const artists = extractArtists(item);
  const subtitleText = extractText(item.subtitle);
  const authorText = item.author && typeof item.author === 'object' ? extractText((item.author as Record<string, unknown>).name) : '';
  const year = extractText(item.year);

  let subtitle = subtitleText;
  if (!subtitle) {
    if (itemType === 'album') {
      subtitle = [artists.map((a) => a.name).join(', '), year].filter(Boolean).join(' · ') || 'Album';
    } else if (itemType === 'artist') {
      subtitle = extractText(item.subscribers) || 'Artist';
    } else if (itemType === 'playlist') {
      subtitle = authorText || extractText(item.item_count) || 'Playlist';
    } else {
      subtitle = artists.map((a) => a.name).join(', ');
    }
  }

  const thumbnail = extractThumbnail(item, 544);

  return {
    id,
    title,
    subtitle,
    thumbnail,
    itemType,
    year: year || undefined,
    artists,
  };
}

function normalizeSectionList(sections: unknown[]): ShelfSection[] {
  const result: ShelfSection[] = [];

  for (const sec of sections) {
    if (!sec || typeof sec !== 'object') continue;
    const s = sec as Record<string, unknown>;
    if (s.type === 'MusicTasteBuilderShelf') continue;

    const title = extractText((s.header as Record<string, unknown> | undefined)?.title || s.title);
    const contents = Array.isArray(s.contents) ? s.contents : [];
    if (!title || contents.length === 0) continue;

    // Check if Moods & genres navigation buttons
    if ((contents[0] as Record<string, unknown> | undefined)?.type === 'MusicNavigationButton') {
      const moods: MoodCategory[] = [];
      for (const btn of contents) {
        const b = btn as Record<string, unknown>;
        const label = extractText(b.button_text);
        const payload = (b.endpoint as Record<string, unknown> | undefined)?.payload as
          | Record<string, unknown>
          | undefined;
        const browseId = String(payload?.browseId || '');
        const params = String(payload?.params || '');
        if (label && browseId) {
          moods.push({ title: label, browseId, params });
        }
      }
      if (moods.length > 0) {
        result.push({ title, kind: 'moods', moods });
      }
      continue;
    }

    const firstType = String((contents[0] as Record<string, unknown> | undefined)?.item_type || '');
    const isTrackShelf =
      firstType === 'song' ||
      firstType === 'video' ||
      (contents[0] as Record<string, unknown> | undefined)?.type === 'MusicResponsiveListItem';

    if (isTrackShelf) {
      const tracks = contents
        .map((c) => normalizeTrack(c))
        .filter((t): t is TrackItem => t !== null);
      if (tracks.length > 0) {
        result.push({ title, kind: 'tracks', tracks });
      }
    } else {
      const cards = contents
        .map((c) => normalizeCard(c))
        .filter((c): c is MediaCardItem => c !== null);
      if (cards.length > 0) {
        result.push({ title, kind: 'cards', cards });
      }
    }
  }

  return result;
}

function normalizeRawBrowseItem(raw: Record<string, unknown>): MediaCardItem | null {
  const twoRow = raw.musicTwoRowItemRenderer as Record<string, unknown> | undefined;
  if (!twoRow) return null;

  const title = extractText(twoRow.title);
  const subtitle = extractText(twoRow.subtitle);
  const nav = twoRow.navigationEndpoint as Record<string, unknown> | undefined;
  const browseId = String((nav?.browseEndpoint as Record<string, unknown> | undefined)?.browseId || '');
  const videoId = String((nav?.watchEndpoint as Record<string, unknown> | undefined)?.videoId || '');
  const id = browseId || videoId;
  if (!id || !title) return null;

  const thumbs = (
    ((twoRow.thumbnailRenderer as Record<string, unknown> | undefined)?.musicThumbnailRenderer as Record<string, unknown> | undefined)
      ?.thumbnail as Record<string, unknown> | undefined
  )?.thumbnails as Array<{ url?: string; width?: number }> | undefined;

  let thumbnail = '';
  if (Array.isArray(thumbs) && thumbs.length > 0) {
    const sorted = [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0));
    thumbnail = upgradeThumbnailUrl(sorted[0]?.url || '', 544);
  }

  let itemType: MediaCardItem['itemType'] = 'playlist';
  if (browseId.startsWith('MPRE')) itemType = 'album';
  else if (browseId.startsWith('UC')) itemType = 'artist';
  else if (videoId) itemType = 'song';

  return {
    id,
    title,
    subtitle: subtitle || (itemType === 'playlist' ? 'Playlist' : ''),
    thumbnail,
    itemType,
  };
}

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'zyvoramusic-ytmusic-api' });
  });

  // 1. Home Feed (enriched with Explore + Phonk & Drift live tracks)
  app.get('/api/ytmusic/home', async (_req, res) => {
    try {
      const cached = getCached<HomeFeedResponse>('home');
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const [home, explore, phonkSongs, phonkPlaylists] = await Promise.all([
        yt.music.getHomeFeed(),
        yt.music.getExplore().catch(() => null),
        yt.music.search('phonk', { type: 'song' }).catch(() => null),
        yt.music.search('phonk', { type: 'playlist' }).catch(() => null),
      ]);

      const sections = normalizeSectionList((home.sections as unknown[]) || []);

      // Inject Phonk & Drift live tracks shelf
      const phonkTrackShelf = (phonkSongs?.contents as Array<Record<string, unknown>> | undefined)?.find(
        (c) => c.type === 'MusicShelf'
      );
      if (Array.isArray(phonkTrackShelf?.contents)) {
        const tracks = phonkTrackShelf.contents
          .map((item) => normalizeTrack(item))
          .filter((t): t is TrackItem => t !== null);
        if (tracks.length > 0) {
          sections.push({
            title: 'Phonk & Drift Beats',
            kind: 'tracks',
            tracks,
          });
        }
      }

      const phonkPlShelf = (phonkPlaylists?.contents as Array<Record<string, unknown>> | undefined)?.find(
        (c) => c.type === 'MusicShelf'
      );
      if (Array.isArray(phonkPlShelf?.contents)) {
        const cards = phonkPlShelf.contents
          .map((item) => normalizeCard(item))
          .filter((c): c is MediaCardItem => c !== null);
        if (cards.length > 0) {
          sections.push({
            title: 'Phonk Mixes & Playlists',
            kind: 'cards',
            cards,
          });
        }
      }

      if (explore?.sections) {
        const exploreSections = normalizeSectionList(explore.sections as unknown[]);
        for (const sec of exploreSections) {
          if (sec.kind !== 'moods' && !sections.some((s) => s.title === sec.title)) {
            sections.push(sec);
          }
        }
      }

      const payload: HomeFeedResponse = { sections };
      return res.json(setCached('home', payload, 5 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching YouTube Music home:', err);
      return res.status(500).json({ error: 'Failed to load YouTube Music home feed' });
    }
  });

  // 1b. Live Genre Feed (Phonk, Hip-Hop, Electronic, etc.)
  app.get('/api/ytmusic/genre/:slug', async (req, res) => {
    try {
      const slug = String(req.params.slug || 'phonk').toLowerCase();
      const config = GENRE_CONFIG[slug] || { title: slug, query: slug };
      const cacheKey = `genre:${slug}`;
      const cached = getCached<GenreFeedResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const [songsRes, playlistsRes, albumsRes] = await Promise.all([
        yt.music.search(config.query, { type: 'song' }).catch(() => null),
        yt.music.search(config.query, { type: 'playlist' }).catch(() => null),
        yt.music.search(config.query, { type: 'album' }).catch(() => null),
      ]);

      const extractItems = (r: typeof songsRes): unknown[] => {
        const shelf = (r?.contents as Array<Record<string, unknown>> | undefined)?.find(
          (c) => c.type === 'MusicShelf'
        );
        return Array.isArray(shelf?.contents) ? shelf.contents : [];
      };

      const tracks = extractItems(songsRes)
        .map((item) => normalizeTrack(item))
        .filter((t): t is TrackItem => t !== null);

      const playlists = extractItems(playlistsRes)
        .map((item) => normalizeCard(item))
        .filter((c): c is MediaCardItem => c !== null);

      const albums = extractItems(albumsRes)
        .map((item) => normalizeCard(item))
        .filter((c): c is MediaCardItem => c !== null);

      const nextToken = saveContinuation(songsRes);

      const payload: GenreFeedResponse = {
        slug,
        title: config.title,
        tracks,
        playlists,
        albums,
        nextToken,
      };
      return res.json(setCached(cacheKey, payload, 3 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching genre feed:', err);
      return res.status(500).json({ error: 'Failed to load genre feed' });
    }
  });

  // 2. Explore (New Releases, Trending / Charts, Moods & Genres)
  app.get('/api/ytmusic/explore', async (_req, res) => {
    try {
      const cached = getCached<ExploreResponse>('explore');
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const explore = await yt.music.getExplore();
      const sections = normalizeSectionList((explore.sections as unknown[]) || []);

      const newReleases = sections.find((s) => s.kind === 'cards')?.cards || [];
      const trending = sections.find((s) => s.kind === 'tracks')?.tracks || [];
      const moods = sections.find((s) => s.kind === 'moods')?.moods || [];

      const payload: ExploreResponse = {
        newReleases,
        trending,
        moods,
        sections,
      };

      return res.json(setCached('explore', payload, 5 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching YouTube Music explore:', err);
      return res.status(500).json({ error: 'Failed to load YouTube Music explore' });
    }
  });

  // 3. Moods & Genres Detail
  app.get('/api/ytmusic/mood', async (req, res) => {
    try {
      const browseId = String(req.query.browseId || 'FEmusic_moods_and_genres_category');
      const params = String(req.query.params || '');
      if (!params) {
        return res.status(400).json({ error: 'Missing params for mood category' });
      }

      const cacheKey = `mood:${browseId}:${params}`;
      const cached = getCached<MoodDetailResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const raw = await yt.actions.execute('/browse', {
        browseId,
        params,
        client: 'YTMUSIC',
      });

      const data = raw.data as Record<string, unknown>;
      const header = data?.header as Record<string, unknown> | undefined;
      const title =
        extractText((header?.musicHeaderRenderer as Record<string, unknown> | undefined)?.title) || 'Mood & Genre';

      const tabs = (
        (data?.contents as Record<string, unknown> | undefined)?.singleColumnBrowseResultsRenderer as
          | Record<string, unknown>
          | undefined
      )?.tabs as Array<Record<string, unknown>> | undefined;

      const sectionContents = (
        ((tabs?.[0]?.tabRenderer as Record<string, unknown> | undefined)?.content as Record<string, unknown> | undefined)
          ?.sectionListRenderer as Record<string, unknown> | undefined
      )?.contents as Array<Record<string, unknown>> | undefined;

      const sections: ShelfSection[] = [];

      for (const sec of sectionContents || []) {
        const shelf = (sec.musicCarouselShelfRenderer || sec.gridRenderer) as Record<string, unknown> | undefined;
        if (!shelf) continue;

        const shelfHeader = shelf.header as Record<string, unknown> | undefined;
        const shelfTitle =
          extractText((shelfHeader?.musicCarouselShelfBasicHeaderRenderer as Record<string, unknown> | undefined)?.title) ||
          extractText((shelfHeader?.gridHeaderRenderer as Record<string, unknown> | undefined)?.title) ||
          'Curated Playlists';

        const rawItems = (shelf.contents || shelf.items) as Array<Record<string, unknown>> | undefined;
        const cards = (rawItems || [])
          .map((item) => normalizeRawBrowseItem(item))
          .filter((c): c is MediaCardItem => c !== null);

        if (cards.length > 0) {
          sections.push({
            title: shelfTitle,
            kind: 'cards',
            cards,
          });
        }
      }

      const payload: MoodDetailResponse = { title, sections };
      return res.json(setCached(cacheKey, payload, 5 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching mood category:', err);
      return res.status(500).json({ error: 'Failed to load mood playlists' });
    }
  });

  // 4. Search Suggestions
  app.get('/api/ytmusic/suggestions', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.json({ suggestions: [] });

      const cacheKey = `sugg:${q.toLowerCase()}`;
      const cached = getCached<{ suggestions: string[] }>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const raw = await yt.music.getSearchSuggestions(q);
      const suggestions: string[] = [];

      if (Array.isArray(raw)) {
        for (const section of raw) {
          const contents = (section as unknown as Record<string, unknown>)?.contents;
          if (Array.isArray(contents)) {
            for (const item of contents) {
              const obj = item as Record<string, unknown>;
              const text = extractText(obj.suggestion || obj.title || obj.query);
              if (text && !suggestions.includes(text)) suggestions.push(text);
            }
          }
        }
      }

      return res.json(setCached(cacheKey, { suggestions: suggestions.slice(0, 8) }, 2 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      return res.json({ suggestions: [] });
    }
  });

  // 5. Search
  app.get('/api/ytmusic/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const type = (String(req.query.type || 'all') as SearchFilterType) || 'all';
      if (!q) {
        return res.json({
          query: '',
          type,
          topResult: null,
          tracks: [],
          albums: [],
          artists: [],
          playlists: [],
        } satisfies SearchResponse);
      }

      const cacheKey = `search:${type}:${q.toLowerCase()}`;
      const cached = getCached<SearchResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();

      if (type === 'all') {
        const [allRes, songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
          yt.music.search(q).catch(() => null),
          yt.music.search(q, { type: 'song' }).catch(() => null),
          yt.music.search(q, { type: 'album' }).catch(() => null),
          yt.music.search(q, { type: 'artist' }).catch(() => null),
          yt.music.search(q, { type: 'playlist' }).catch(() => null),
        ]);

        let topResult: MediaCardItem | TrackItem | null = null;
        const cardShelf = (allRes?.contents as Array<Record<string, unknown>> | undefined)?.find(
          (c) => c.type === 'MusicCardShelf'
        );
        if (cardShelf) {
          const title = extractText(cardShelf.title);
          const subtitle = extractText(cardShelf.subtitle);
          const thumb = extractThumbnail(cardShelf, 544);
          const payload = (cardShelf.on_tap as Record<string, unknown> | undefined)?.payload as
            | Record<string, unknown>
            | undefined;
          const browseId = String(payload?.browseId || '');
          const videoId = String(payload?.videoId || '');

          if (browseId.startsWith('UC')) {
            topResult = { id: browseId, title, subtitle, thumbnail: thumb, itemType: 'artist' };
          } else if (browseId.startsWith('MPRE')) {
            topResult = { id: browseId, title, subtitle, thumbnail: thumb, itemType: 'album' };
          } else if (videoId) {
            topResult = {
              id: videoId,
              title,
              artists: [{ name: subtitle.split('•')[1]?.trim() || 'YouTube Music' }],
              thumbnail: thumb,
              itemType: 'song',
            };
          } else if (title) {
            // Fallback from artists/songs first item
            const artistShelf = (artistsRes?.contents as Array<Record<string, unknown>> | undefined)?.find(
              (c) => c.type === 'MusicShelf'
            );
            const firstArtist = Array.isArray(artistShelf?.contents) ? artistShelf.contents[0] : undefined;
            const firstArtistCard = firstArtist ? normalizeCard(firstArtist) : null;
            if (firstArtistCard && firstArtistCard.title.toLowerCase() === title.toLowerCase()) {
              topResult = firstArtistCard;
            }
          }
        }

        const extractShelfItems = (resObj: typeof songsRes): unknown[] => {
          const shelf = (resObj?.contents as Array<Record<string, unknown>> | undefined)?.find(
            (c) => c.type === 'MusicShelf'
          );
          return Array.isArray(shelf?.contents) ? shelf.contents : [];
        };

        const tracks = extractShelfItems(songsRes)
          .map((item) => normalizeTrack(item))
          .filter((t): t is TrackItem => t !== null);

        const albums = extractShelfItems(albumsRes)
          .map((item) => normalizeCard(item))
          .filter((c): c is MediaCardItem => c !== null);

        const artists = extractShelfItems(artistsRes)
          .map((item) => normalizeCard(item))
          .filter((c): c is MediaCardItem => c !== null);

        const playlists = extractShelfItems(playlistsRes)
          .map((item) => normalizeCard(item))
          .filter((c): c is MediaCardItem => c !== null);

        if (!topResult) {
          topResult = tracks[0] || artists[0] || albums[0] || null;
        }

        const response: SearchResponse = {
          query: q,
          type,
          topResult,
          tracks,
          albums,
          artists,
          playlists,
          nextToken: saveContinuation(songsRes),
        };
        return res.json(setCached(cacheKey, response, 2 * 60 * 1000));
      }

      const typedRes = await yt.music.search(q, { type });
      const shelf = (typedRes.contents as Array<Record<string, unknown>> | undefined)?.find(
        (c) => c.type === 'MusicShelf'
      );
      const rawItems = Array.isArray(shelf?.contents) ? shelf.contents : [];
      const nextToken = saveContinuation(typedRes);

      const response: SearchResponse = {
        query: q,
        type,
        topResult: null,
        tracks:
          type === 'song' || type === 'video'
            ? rawItems.map((i) => normalizeTrack(i)).filter((t): t is TrackItem => t !== null)
            : [],
        albums:
          type === 'album'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        artists:
          type === 'artist'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        playlists:
          type === 'playlist'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        nextToken,
      };

      return res.json(setCached(cacheKey, response, 2 * 60 * 1000));
    } catch (err) {
      console.error('Error searching YouTube Music:', err);
      return res.status(500).json({ error: 'Search failed on YouTube Music' });
    }
  });

  // 5b. Unlimited Search Continuation
  app.get('/api/ytmusic/search-more', async (req, res) => {
    try {
      const token = String(req.query.token || '');
      const type = (String(req.query.type || 'song') as SearchFilterType) || 'song';
      if (!token) {
        return res.status(400).json({ error: 'Missing continuation token' });
      }

      const prev = getContinuationEntry(token) as
        | { getContinuation?: () => Promise<Record<string, unknown>> }
        | null;
      if (!prev || typeof prev.getContinuation !== 'function') {
        return res.json({
          tracks: [],
          albums: [],
          artists: [],
          playlists: [],
        } satisfies SearchMoreResponse);
      }

      const nextRes = await prev.getContinuation();
      const contentsObj = nextRes.contents as Record<string, unknown> | unknown[] | undefined;
      const rawItems: unknown[] = Array.isArray(contentsObj)
        ? contentsObj
        : Array.isArray((contentsObj as Record<string, unknown> | undefined)?.contents)
          ? ((contentsObj as Record<string, unknown>).contents as unknown[])
          : [];

      const nextToken = saveContinuation(nextRes);
      const effectiveType = type === 'all' ? 'song' : type;

      const payload: SearchMoreResponse = {
        tracks:
          effectiveType === 'song' || effectiveType === 'video'
            ? rawItems.map((i) => normalizeTrack(i)).filter((t): t is TrackItem => t !== null)
            : [],
        albums:
          effectiveType === 'album'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        artists:
          effectiveType === 'artist'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        playlists:
          effectiveType === 'playlist'
            ? rawItems.map((i) => normalizeCard(i)).filter((c): c is MediaCardItem => c !== null)
            : [],
        nextToken,
      };

      return res.json(payload);
    } catch (err) {
      console.error('Error loading more search results:', err);
      return res.status(500).json({ error: 'Failed to load more results' });
    }
  });

  // 5c. Playable Fallback Resolver (for tracks whose video ID blocks third-party embedding)
  app.get('/api/ytmusic/fallback', async (req, res) => {
    try {
      const title = String(req.query.title || '').trim();
      const artist = String(req.query.artist || '').trim();
      const excludeId = String(req.query.excludeId || '').trim();
      if (!title) return res.json({ tracks: [] });

      const query = `${title} ${artist} audio`.trim();
      const yt = await getYouTubeClient();
      const [songsRes, videosRes] = await Promise.all([
        yt.music.search(query, { type: 'song' }).catch(() => null),
        yt.music.search(`${title} ${artist} lyrics`, { type: 'video' }).catch(() => null),
      ]);

      const extractShelf = (r: typeof songsRes): TrackItem[] => {
        const shelf = (r?.contents as Array<Record<string, unknown>> | undefined)?.find(
          (c) => c.type === 'MusicShelf'
        );
        return (Array.isArray(shelf?.contents) ? shelf.contents : [])
          .map((i) => normalizeTrack(i))
          .filter((t): t is TrackItem => t !== null && t.id !== excludeId);
      };

      const candidates = [...extractShelf(songsRes), ...extractShelf(videosRes)];
      const seen = new Set<string>();
      const unique = candidates.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      return res.json({ tracks: unique.slice(0, 5) });
    } catch (err) {
      console.error('Error finding playable fallback:', err);
      return res.json({ tracks: [] });
    }
  });

  // 6. Album Detail
  app.get('/api/ytmusic/album/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const cacheKey = `album:${id}`;
      const cached = getCached<AlbumDetailResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const album = await yt.music.getAlbum(id);
      const header = (album.header as unknown as Record<string, unknown>) || {};
      const title = extractText(header.title) || 'Album';
      const subtitle = extractText(header.subtitle);
      const description = extractText(header.description);
      const thumbnail = extractThumbnail(header, 544);
      const artists = extractArtists(header);
      const year = extractText(header.year);
      const secondSubtitle = extractText(header.second_subtitle);

      const tracks = ((album.contents as unknown[]) || [])
        .map((c) => normalizeTrack(c, thumbnail, { id, name: title }))
        .filter((t): t is TrackItem => t !== null)
        .map((t) => ({
          ...t,
          artists: t.artists.length > 0 && t.artists[0].name !== 'YouTube Music' ? t.artists : artists,
        }));

      const payload: AlbumDetailResponse = {
        id,
        title,
        subtitle: subtitle || artists.map((a) => a.name).join(', '),
        description: description || undefined,
        thumbnail,
        year: year || undefined,
        trackCount: secondSubtitle || `${tracks.length} tracks`,
        artists,
        tracks,
      };

      return res.json(setCached(cacheKey, payload, 10 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching album:', err);
      return res.status(500).json({ error: 'Failed to load album' });
    }
  });

  // 7. Playlist Detail
  app.get('/api/ytmusic/playlist/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const cacheKey = `playlist:${id}`;
      const cached = getCached<PlaylistDetailResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const playlist = await yt.music.getPlaylist(id);
      const header = (playlist.header as unknown as Record<string, unknown>) || {};
      const title = extractText(header.title) || 'Playlist';
      const subtitle = extractText(header.subtitle);
      const description = extractText(header.description);
      const thumbnail = extractThumbnail(header, 544);
      const author = extractText((header.author as Record<string, unknown> | undefined)?.name);
      const secondSubtitle = extractText(header.second_subtitle);

      const rawItems = (playlist.contents || playlist.items || []) as unknown[];
      const tracks = rawItems
        .map((c) => normalizeTrack(c, thumbnail))
        .filter((t): t is TrackItem => t !== null);

      const payload: PlaylistDetailResponse = {
        id,
        title,
        subtitle: subtitle || 'Playlist',
        description: description || undefined,
        thumbnail: thumbnail || tracks[0]?.thumbnail || '',
        author: author || undefined,
        trackCount: secondSubtitle || `${tracks.length} tracks`,
        tracks,
      };

      return res.json(setCached(cacheKey, payload, 10 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching playlist:', err);
      return res.status(500).json({ error: 'Failed to load playlist' });
    }
  });

  // 8. Artist Detail
  app.get('/api/ytmusic/artist/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const cacheKey = `artist:${id}`;
      const cached = getCached<ArtistDetailResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const artist = await yt.music.getArtist(id);
      const header = (artist.header as unknown as Record<string, unknown>) || {};
      const name = extractText(header.title) || 'Artist';
      const description = extractText(header.description);
      const subscribers = extractText(
        (header.subscription_button as Record<string, unknown> | undefined)?.subscribe_accessibility_label ||
          header.subscribers ||
          header.subtitle
      );
      const thumbnail = extractThumbnail(header, 800);

      let topSongs: TrackItem[] = [];
      let albums: MediaCardItem[] = [];
      let singles: MediaCardItem[] = [];
      let relatedArtists: MediaCardItem[] = [];

      for (const sec of (artist.sections as unknown[]) || []) {
        const s = sec as Record<string, unknown>;
        const secTitle = extractText(
          (s.header as Record<string, unknown> | undefined)?.title || s.title
        ).toLowerCase();
        const contents = Array.isArray(s.contents) ? s.contents : [];

        if (secTitle.includes('song')) {
          topSongs = contents
            .map((c) => normalizeTrack(c))
            .filter((t): t is TrackItem => t !== null);
        } else if (secTitle.includes('album')) {
          albums = contents
            .map((c) => normalizeCard(c))
            .filter((c): c is MediaCardItem => c !== null)
            .map((c) => ({ ...c, itemType: 'album' }));
        } else if (secTitle.includes('single')) {
          singles = contents
            .map((c) => normalizeCard(c))
            .filter((c): c is MediaCardItem => c !== null)
            .map((c) => ({ ...c, itemType: 'album' }));
        } else if (secTitle.includes('fans might also like') || secTitle.includes('similar')) {
          relatedArtists = contents
            .map((c) => normalizeCard(c))
            .filter((c): c is MediaCardItem => c !== null)
            .map((c) => ({ ...c, itemType: 'artist' }));
        }
      }

      const payload: ArtistDetailResponse = {
        id,
        name,
        description: description || undefined,
        subscribers: subscribers || undefined,
        thumbnail,
        topSongs,
        albums,
        singles,
        relatedArtists,
      };

      return res.json(setCached(cacheKey, payload, 10 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching artist:', err);
      return res.status(500).json({ error: 'Failed to load artist' });
    }
  });

  // 9. Up Next / Radio Queue
  app.get('/api/ytmusic/up-next/:videoId', async (req, res) => {
    try {
      const videoId = req.params.videoId;
      const cacheKey = `upnext:${videoId}`;
      const cached = getCached<{ tracks: TrackItem[] }>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const upNext = await yt.music.getUpNext(videoId);
      const tracks: TrackItem[] = [];

      for (const raw of (upNext.contents as unknown[]) || []) {
        const item = raw as Record<string, unknown>;
        const id = typeof item.video_id === 'string' ? item.video_id : '';
        if (!id) continue;
        const title = extractText(item.title) || 'Untitled';
        const byline = extractText(item.short_byline);
        const duration = extractText(item.length_text);
        const thumbnail = extractThumbnail(item, 544);

        const artists: ArtistRef[] = [];
        const bylineObj = item.short_byline as Record<string, unknown> | undefined;
        if (bylineObj && Array.isArray(bylineObj.runs)) {
          for (const run of bylineObj.runs as Array<Record<string, unknown>>) {
            const runText = extractText(run.text).trim();
            const browseId = String(
              ((run.endpoint as Record<string, unknown> | undefined)?.payload as Record<string, unknown> | undefined)
                ?.browseId || ''
            );
            if (browseId.startsWith('UC') && runText) {
              artists.push({ name: runText, id: browseId });
            }
          }
        }
        if (artists.length === 0) {
          artists.push({ name: byline.split('•')[0]?.trim() || 'YouTube Music' });
        }

        tracks.push({
          id,
          title,
          artists,
          duration: duration || undefined,
          thumbnail,
          itemType: 'song',
        });
      }

      return res.json(setCached(cacheKey, { tracks }, 5 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching up next:', err);
      return res.status(500).json({ error: 'Failed to load Up Next queue' });
    }
  });

  // 10. Lyrics
  app.get('/api/ytmusic/lyrics/:videoId', async (req, res) => {
    try {
      const videoId = req.params.videoId;
      const cacheKey = `lyrics:${videoId}`;
      const cached = getCached<LyricsResponse>(cacheKey);
      if (cached) return res.json(cached);

      const yt = await getYouTubeClient();
      const lyrics = await yt.music.getLyrics(videoId).catch(() => null);

      const payload: LyricsResponse = {
        videoId,
        lyrics: lyrics?.description?.text || null,
        source: lyrics?.footer?.text || undefined,
      };

      return res.json(setCached(cacheKey, payload, 30 * 60 * 1000));
    } catch (err) {
      console.error('Error fetching lyrics:', err);
      return res.json({ videoId: req.params.videoId, lyrics: null } satisfies LyricsResponse);
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZYVORAMusic server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
