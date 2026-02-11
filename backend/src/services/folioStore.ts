import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { FolioClip } from '../types';
import { config } from '../config';

const FOLIO_API = config.folio.apiUrl;
const FOLIO_KEY = config.folio.apiKey;
const cacheDir = path.join(process.cwd(), 'folio_cache');
fs.mkdirSync(cacheDir, { recursive: true });

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${FOLIO_KEY}`,
  };
}

// Map a Folio Collection object to the FolioClip shape Chromox expects
function collectionToClip(c: Record<string, unknown>): FolioClip {
  return {
    id: c.id as string,
    name: c.title as string,
    audioPath: (c.audioPath as string) || '',
    audioUrl: c.audioUrl
      ? `${FOLIO_API}${c.audioUrl}`
      : '',
    source: (c.platform as string) === 'CHROMOX' ? 'render' : 'upload',
    sourceRenderId: undefined,
    sourcePersonaName: undefined,
    tags: c.tags ? (c.tags as string).split(',').filter(Boolean) : undefined,
    duration: undefined,
    added_at: (c.savedAt as string) || new Date().toISOString(),
  };
}

export async function listFolioClips(): Promise<FolioClip[]> {
  const res = await fetch(
    `${FOLIO_API}/api/collections?contentType=AUDIO_CLIP`,
    { headers: headers() }
  );
  if (!res.ok) {
    console.error('[FolioStore] Failed to list clips:', res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { collections: Record<string, unknown>[] };
  return data.collections.map(collectionToClip);
}

export async function findFolioClip(id: string): Promise<FolioClip | undefined> {
  const res = await fetch(`${FOLIO_API}/api/collections/${id}`, {
    headers: headers(),
  });
  if (!res.ok) return undefined;
  const c = (await res.json()) as Record<string, unknown>;
  return collectionToClip(c);
}

type AddFolioClipInput = {
  name: string;
  audioPath: string;
  audioUrl: string;
  source: 'render' | 'upload';
  sourceRenderId?: string;
  sourcePersonaName?: string;
  tags?: string[];
  duration?: number;
};

export async function addFolioClip(input: AddFolioClipInput): Promise<FolioClip> {
  const form = new FormData();
  form.append('audio', fs.createReadStream(input.audioPath));
  form.append('title', input.name);
  form.append('platform', 'CHROMOX');
  form.append('contentType', 'AUDIO_CLIP');
  if (input.tags?.length) {
    form.append('tags', input.tags.join(','));
  }

  const res = await fetch(`${FOLIO_API}/api/collections/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FOLIO_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[FolioStore] Upload failed (${res.status}): ${text}`);
  }

  const c = (await res.json()) as Record<string, unknown>;
  return collectionToClip(c);
}

export async function removeFolioClip(id: string): Promise<boolean> {
  const res = await fetch(`${FOLIO_API}/api/collections/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

/**
 * Fetch video collections from Folio (YouTube, TikTok, etc.)
 * These can be imported as voice reference samples.
 */
export async function listFolioVideos(tag?: string): Promise<FolioVideo[]> {
  try {
    const url = new URL(`${FOLIO_API}/api/collections`);
    // Exclude audio clips - we want videos
    url.searchParams.set('excludeContentType', 'AUDIO_CLIP');
    if (tag) {
      url.searchParams.set('tag', tag);
    }

    const res = await fetch(url.toString(), { headers: headers() });
    if (!res.ok) {
      console.error('[FolioStore] Failed to list videos:', res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { collections: Record<string, unknown>[] };
    return data.collections.map((c) => ({
      id: c.id as string,
      title: c.title as string,
      url: c.url as string,
      platform: c.platform as string,
      thumbnail: c.thumbnail as string | undefined,
      tags: c.tags ? (c.tags as string).split(',').filter(Boolean) : [],
      savedAt: c.savedAt as string,
    }));
  } catch (error) {
    console.error('[FolioStore] Error listing videos:', error);
    return [];
  }
}

export type FolioVideo = {
  id: string;
  title: string;
  url: string;
  platform: string;
  thumbnail?: string;
  tags: string[];
  savedAt: string;
};

/**
 * Fetch a single video collection from Folio by ID.
 */
export async function findFolioVideo(id: string): Promise<FolioVideo | undefined> {
  try {
    const res = await fetch(`${FOLIO_API}/api/collections/${id}`, {
      headers: headers(),
    });
    if (!res.ok) return undefined;

    const c = (await res.json()) as Record<string, unknown>;
    return {
      id: c.id as string,
      title: c.title as string,
      url: c.url as string,
      platform: c.platform as string,
      thumbnail: c.thumbnail as string | undefined,
      tags: c.tags ? (c.tags as string).split(',').filter(Boolean) : [],
      savedAt: c.savedAt as string,
    };
  } catch (error) {
    console.error('[FolioStore] Error finding video:', error);
    return undefined;
  }
}

/**
 * Download audio from the Folio app and cache it locally for the render pipeline.
 * Returns the local file path.
 */
export async function ensureLocalAudio(clipId: string): Promise<string | undefined> {
  const clip = await findFolioClip(clipId);
  if (!clip || !clip.audioUrl) return undefined;

  // Determine file extension from URL
  const urlPath = new URL(clip.audioUrl).pathname;
  const ext = path.extname(urlPath) || '.wav';
  const localPath = path.join(cacheDir, `${clipId}${ext}`);

  // Return cached version if it exists
  if (fs.existsSync(localPath)) return localPath;

  // Download the audio file
  const res = await fetch(clip.audioUrl);
  if (!res.ok) {
    console.error('[FolioStore] Failed to download audio:', res.status);
    return undefined;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
  return localPath;
}
