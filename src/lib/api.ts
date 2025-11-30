import axios from 'axios';
import { Persona, StyleControls, EffectSettings, RenderHistoryItem, GuideSample } from '../types';

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

export async function generatePersonaIdea(options?: { seed?: string; mononym?: boolean }) {
  const { data } = await client.post<{ name: string; description: string }>('/llm/persona-idea', options ?? {});
  return data;
}
