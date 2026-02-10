import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { extractBeatGrid } from './beatDetection.js';
import type { BeatGrid } from '../types.js';

const OPENAI_TRANSCRIBE_URL =
  process.env.OPENAI_TRANSCRIBE_URL ?? 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1';

export async function extractVocalStem(filePath: string) {
  // Placeholder for Nebula Tone Network chromatical separation.
  return { stemPath: filePath, quality: 0.92 };
}

export async function extractPitchAndTiming(stemPath: string): Promise<{
  midi: string | null;
  timing: number[];
  beatGrid: BeatGrid;
  stemPath: string;
}> {
  try {
    const beatGrid = await extractBeatGrid(stemPath);
    return {
      midi: null,  // Pitch extraction TODO - future feature
      timing: beatGrid.beats,
      beatGrid,
      stemPath
    };
  } catch (error) {
    console.warn('[DSP] Beat extraction failed, using fallback:', (error as Error).message);
    // Return minimal fallback data
    return {
      midi: null,
      timing: [0, 1, 2, 3],
      beatGrid: {
        bpm: 120,
        confidence: 0.1,
        beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
        downbeats: [0, 2],
        duration: 4
      },
      stemPath
    };
  }
}

export async function transcribeLyrics(stemPath: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { transcript: 'auto-transcribed lyrics', confidence: 0.5 };
  }

  try {
    const formData = new FormData();
    formData.append('model', OPENAI_TRANSCRIBE_MODEL);
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    formData.append('file', fs.createReadStream(stemPath));

    const response = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData as unknown as FormData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed (${response.status})`);
    }

    const data = (await response.json()) as { text?: string };
    return {
      transcript: data.text ?? '',
      confidence: data.text ? 0.97 : 0.5
    };
  } catch (error) {
    console.error('[DSP] Transcription fallback triggered:', error);
    return {
      transcript: 'auto-transcribed lyrics',
      confidence: 0.5
    };
  }
}
