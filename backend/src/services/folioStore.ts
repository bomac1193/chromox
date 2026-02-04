import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { FolioClip } from '../types';

const dataDir = path.join(process.cwd(), 'storage');
const folioFile = path.join(dataDir, 'folio.json');
const uploadsDir = path.join(process.cwd(), 'folio_uploads');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

let clips: FolioClip[] = [];
try {
  if (fs.existsSync(folioFile)) {
    const raw = fs.readFileSync(folioFile, 'utf-8');
    clips = JSON.parse(raw) as FolioClip[];
  }
} catch (error) {
  console.error('[FolioStore] Failed to load folio:', error);
  clips = [];
}

function persist() {
  try {
    fs.writeFileSync(folioFile, JSON.stringify(clips, null, 2));
  } catch (error) {
    console.error('[FolioStore] Failed to persist folio:', error);
  }
}

export function listFolioClips() {
  return [...clips].sort(
    (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
  );
}

export function findFolioClip(id: string) {
  return clips.find((clip) => clip.id === id);
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

export function addFolioClip(input: AddFolioClipInput) {
  const clip: FolioClip = {
    id: uuid(),
    name: input.name,
    audioPath: input.audioPath,
    audioUrl: input.audioUrl,
    source: input.source,
    sourceRenderId: input.sourceRenderId,
    sourcePersonaName: input.sourcePersonaName,
    tags: input.tags,
    duration: input.duration,
    added_at: new Date().toISOString()
  };
  clips.push(clip);
  persist();
  return clip;
}

export function removeFolioClip(id: string) {
  const index = clips.findIndex((clip) => clip.id === id);
  if (index === -1) return false;
  clips.splice(index, 1);
  persist();
  return true;
}
