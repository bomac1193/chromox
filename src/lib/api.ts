import axios from 'axios';
import { Persona, StyleControls } from '../types';

const client = axios.create({
  baseURL: 'http://localhost:4414/api'
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
}) {
  const { data } = await client.post<Persona>('/personas', input);
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
  guide?: File;
}) {
  const formData = new FormData();
  formData.append('personaId', payload.personaId);
  formData.append('lyrics', payload.lyrics);
  formData.append('stylePrompt', payload.stylePrompt);
  formData.append('controls', JSON.stringify(payload.controls));
  if (payload.guide) {
    formData.append('guide', payload.guide);
  }
  const { data } = await client.post<{ audioUrl: string }>('/render', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
