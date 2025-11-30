import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { EffectSettings, RenderJobRecord, StyleControls } from '../types';

const dataDir = path.join(process.cwd(), 'storage');
const rendersFile = path.join(dataDir, 'renders.json');

fs.mkdirSync(dataDir, { recursive: true });

let renders: RenderJobRecord[] = [];
try {
  if (fs.existsSync(rendersFile)) {
    const raw = fs.readFileSync(rendersFile, 'utf-8');
    renders = JSON.parse(raw) as RenderJobRecord[];
  }
} catch (error) {
  console.error('[RenderStore] Failed to load render history:', error);
  renders = [];
}

function persist() {
  try {
    fs.writeFileSync(rendersFile, JSON.stringify(renders, null, 2));
  } catch (error) {
    console.error('[RenderStore] Failed to persist render history:', error);
  }
}

export function listRenderJobs() {
  return [...renders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function findRenderJob(id: string) {
  return renders.find((job) => job.id === id);
}

type CreateRenderJobInput = {
  personaId: string;
  personaName: string;
  lyrics: string;
  stylePrompt: string;
  controls: StyleControls;
  effects: EffectSettings;
  audioPath: string;
  audioUrl: string;
  label?: string;
  guideFilePath?: string;
  personaImage?: string;
  accent?: string;
  accentLocked?: boolean;
  guideSampleId?: string;
  guideMatchIntensity?: number;
  guideUseLyrics?: boolean;
  guideTempo?: number;
};

export function createRenderJob(input: CreateRenderJobInput) {
  const record: RenderJobRecord = {
    id: uuid(),
    personaId: input.personaId,
    personaName: input.personaName,
    lyrics: input.lyrics,
    stylePrompt: input.stylePrompt,
    controls: input.controls,
    effects: input.effects,
    audioPath: input.audioPath,
    audioUrl: input.audioUrl,
    label: input.label,
    created_at: new Date().toISOString(),
    guideFilePath: input.guideFilePath,
    personaImage: input.personaImage,
    accent: input.accent,
    accentLocked: input.accentLocked,
    guideSampleId: input.guideSampleId,
    guideMatchIntensity: input.guideMatchIntensity,
    guideUseLyrics: input.guideUseLyrics,
    guideTempo: input.guideTempo
  };
  renders.push(record);
  persist();
  return record;
}
