import axios from 'axios';
import {
  Persona,
  StyleControls,
  EffectSettings,
  RenderHistoryItem,
  GuideSample,
  GuideSuggestion,
  TasteProfile,
  FolioClip,
  SonicGenomeSummary,
  SonicArchetype,
  Relic,
  RelicPackSummary
} from '../types';

export const API_HOST = 'http://localhost:4414';

const client = axios.create({
  baseURL: `${API_HOST}/api`
});

export async function fetchPersonas() {
  const { data } = await client.get<Persona[]>('/personas');
  return data;
}

export async function createPersona(input: {
  name: string;
  description: string;
  voice_model_key: string;
  provider: string;
  default_style_controls: StyleControls;
  image?: File | null;
  image_focus_x?: number;
  image_focus_y?: number;
}) {
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('description', input.description);
  formData.append('voice_model_key', input.voice_model_key);
  formData.append('provider', input.provider);
  formData.append('default_style_controls', JSON.stringify(input.default_style_controls));
  if (input.image) {
    formData.append('image', input.image);
  }
  if (input.image_focus_x !== undefined) {
    formData.append('image_focus_x', String(input.image_focus_x));
  }
  if (input.image_focus_y !== undefined) {
    formData.append('image_focus_y', String(input.image_focus_y));
  }

  const { data } = await client.post<Persona>('/personas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function updatePersona(
  id: string,
  input: {
    name?: string;
    description?: string;
    voice_model_key?: string;
    provider?: string;
    default_style_controls?: StyleControls;
    image?: File | null;
    image_focus_x?: number;
    image_focus_y?: number;
  }
) {
  const formData = new FormData();
  if (input.name !== undefined) {
    formData.append('name', input.name);
  }
  if (input.description !== undefined) {
    formData.append('description', input.description);
  }
  if (input.voice_model_key !== undefined) {
    formData.append('voice_model_key', input.voice_model_key);
  }
  if (input.provider !== undefined) {
    formData.append('provider', input.provider);
  }
  if (input.default_style_controls) {
    formData.append('default_style_controls', JSON.stringify(input.default_style_controls));
  }
  if (input.image) {
    formData.append('image', input.image);
  }
  if (input.image_focus_x !== undefined) {
    formData.append('image_focus_x', String(input.image_focus_x));
  }
  if (input.image_focus_y !== undefined) {
    formData.append('image_focus_y', String(input.image_focus_y));
  }
  const { data } = await client.put<Persona>(`/personas/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function rewriteLyrics(lyrics: string, personaPrompt: string) {
  const { data } = await client.post<{ lyrics: string }>('/llm/rewrite', {
    lyrics,
    personaPrompt
  });
  return data.lyrics;
}

export async function renderPerformance(payload: {
  personaId: string;
  lyrics: string;
  stylePrompt: string;
  controls: StyleControls;
  effects: EffectSettings;
  label?: string;
  accent?: string;
  accentLocked?: boolean;
  guideSampleId?: string;
  guideMatchIntensity?: number;
  guideUseLyrics?: boolean;
  guideTempo?: number;
  guide?: File;
  folioClipId?: string;
}) {
  const formData = new FormData();
  formData.append('personaId', payload.personaId);
  formData.append('lyrics', payload.lyrics);
  formData.append('stylePrompt', payload.stylePrompt);
  formData.append('controls', JSON.stringify(payload.controls));
  formData.append('effects', JSON.stringify(payload.effects));
  if (payload.label) {
    formData.append('label', payload.label);
  }
  if (payload.accent) {
    formData.append('accent', payload.accent);
  }
  if (payload.accentLocked !== undefined) {
    formData.append('accentLocked', String(payload.accentLocked));
  }
  if (payload.guideSampleId) {
    formData.append('guideSampleId', payload.guideSampleId);
  }
  if (payload.guideMatchIntensity !== undefined) {
    formData.append('guideMatchIntensity', String(payload.guideMatchIntensity));
  }
  if (payload.guideUseLyrics !== undefined) {
    formData.append('guideUseLyrics', String(payload.guideUseLyrics));
  }
  if (payload.guideTempo !== undefined) {
    formData.append('guideTempo', String(payload.guideTempo));
  }
  if (payload.guide) {
    formData.append('guide', payload.guide);
  }
  if (payload.folioClipId) {
    formData.append('folioClipId', payload.folioClipId);
  }
  const { data } = await client.post<{ audioUrl: string; render: RenderHistoryItem }>('/render', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function previewPerformance(payload: {
  personaId: string;
  lyrics: string;
  stylePrompt: string;
  controls: StyleControls;
  effects: EffectSettings;
  guide?: File;
  previewSeconds?: number;
  accent?: string;
  accentLocked?: boolean;
  guideSampleId?: string;
  guideMatchIntensity?: number;
  guideUseLyrics?: boolean;
  guideTempo?: number;
  folioClipId?: string;
}) {
  const formData = new FormData();
  formData.append('personaId', payload.personaId);
  formData.append('lyrics', payload.lyrics);
  formData.append('stylePrompt', payload.stylePrompt);
  formData.append('controls', JSON.stringify(payload.controls));
  formData.append('effects', JSON.stringify(payload.effects));
  if (payload.previewSeconds) {
    formData.append('previewSeconds', String(payload.previewSeconds));
  }
  if (payload.accent) {
    formData.append('accent', payload.accent);
  }
  if (payload.accentLocked !== undefined) {
    formData.append('accentLocked', String(payload.accentLocked));
  }
  if (payload.guideSampleId) {
    formData.append('guideSampleId', payload.guideSampleId);
  }
  if (payload.guideMatchIntensity !== undefined) {
    formData.append('guideMatchIntensity', String(payload.guideMatchIntensity));
  }
  if (payload.guideUseLyrics !== undefined) {
    formData.append('guideUseLyrics', String(payload.guideUseLyrics));
  }
  if (payload.guideTempo !== undefined) {
    formData.append('guideTempo', String(payload.guideTempo));
  }
  if (payload.guide) {
    formData.append('guide', payload.guide);
  }
  if (payload.folioClipId) {
    formData.append('folioClipId', payload.folioClipId);
  }
  const { data } = await client.post<{ audioUrl: string }>('/render/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function fetchRenderHistory() {
  const { data } = await client.get<RenderHistoryItem[]>('/renders');
  return data;
}

export async function replayRender(id: string) {
  const { data } = await client.post<{ audioUrl: string; render: RenderHistoryItem }>(
    `/renders/${id}/replay`
  );
  return data;
}

export async function uploadGuideSample(personaId: string, file: File, name?: string) {
  const formData = new FormData();
  formData.append('guide', file);
  if (name) {
    formData.append('name', name);
  }
  const { data } = await client.post<GuideSample>(`/personas/${personaId}/guide-samples`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function deleteGuideSample(personaId: string, sampleId: string) {
  await client.delete(`/personas/${personaId}/guide-samples/${sampleId}`);
}

export async function generatePersonaIdea(options?: { seed?: string; mononym?: boolean }) {
  const { data } = await client.post<{ name: string; description: string }>('/llm/persona-idea', options ?? {});
  return data;
}

export async function fetchGuideSuggestions(personaId: string) {
  const { data } = await client.get<GuideSuggestion[]>(`/personas/${personaId}/guide-suggestions`);
  return data;
}

export async function mintGuideClip(
  personaId: string,
  mode?: 'glitch' | 'dream' | 'anthem',
  duration?: number,
  dry?: boolean
) {
  const { data } = await client.post<GuideSample>(`/personas/${personaId}/guide-suggestions/mint`, {
    mode,
    duration,
    dry
  });
  return data;
}

export async function rateRenderJob(jobId: string, rating: 'like' | 'dislike' | 'neutral') {
  const { data } = await client.post<RenderHistoryItem>(`/renders/${jobId}/rating`, { rating });
  return data;
}

export async function updateRenderLabel(jobId: string, label: string) {
  const { data } = await client.patch<RenderHistoryItem>(`/renders/${jobId}/label`, { label });
  return data;
}

export async function fetchTasteProfile(personaId: string) {
  const { data } = await client.get<TasteProfile>(`/personas/${personaId}/taste-profile`);
  return data;
}

export async function fetchFolioClips() {
  const { data } = await client.get<FolioClip[]>('/folio');
  return data;
}

export async function addToFolio(
  payload: { renderId: string; name?: string } | { audio: File; name: string }
) {
  if ('audio' in payload) {
    const formData = new FormData();
    formData.append('audio', payload.audio);
    formData.append('name', payload.name);
    const { data } = await client.post<FolioClip>('/folio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }
  const { data } = await client.post<FolioClip>('/folio', {
    renderId: payload.renderId,
    name: payload.name
  });
  return data;
}

export async function removeFromFolio(id: string) {
  await client.delete(`/folio/${id}`);
}

// ── Sonic Genome ───────────────────────────────────────────────────

export async function fetchSonicGenome() {
  const { data } = await client.get<SonicGenomeSummary>('/genome');
  return data;
}

export async function sendSonicSignal(
  type: string,
  value?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await client.post('/genome/signal', { type, value, metadata });
  } catch {
    // fire-and-forget
  }
}

export async function fetchSonicArchetypes() {
  const { data } = await client.get<Record<string, SonicArchetype>>('/genome/archetypes');
  return data;
}

export async function fetchSonicGamification() {
  const { data } = await client.get('/genome/gamification');
  return data;
}

// ── Persona Relics ─────────────────────────────────────────────────

export async function fetchPersonaRelics(personaId: string) {
  const { data } = await client.get<Relic[]>(`/personas/${personaId}/relics`);
  return data;
}

export async function createRelic(personaId: string, relic: {
  name: string;
  description?: string;
  lore?: string;
  tier?: number;
  icon?: string;
  audioUrl?: string;
  sourceRenderId?: string;
}) {
  const { data } = await client.post<Relic>(`/personas/${personaId}/relics`, relic);
  return data;
}

// ── Reliquary ──────────────────────────────────────────────────────

export async function fetchRelicPacks() {
  const { data } = await client.get<RelicPackSummary[]>('/reliquary/packs');
  return data;
}

export async function fetchReliquaryUnlocks() {
  const { data } = await client.get<Record<string, boolean>>('/reliquary/unlocks');
  return data;
}

export async function unlockRelicPack(packId: string, password: string) {
  const { data } = await client.post('/reliquary/unlock', { packId, password });
  return data;
}
