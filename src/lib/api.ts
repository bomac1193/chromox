import axios from 'axios';
import { Persona, StyleControls, EffectSettings, RenderHistoryItem } from '../types';

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

  const { data } = await client.post<Persona>('/personas', formData, {
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
