import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { transcribeWithAssemblyAI, detectAccentOnly as detectAccentAssembly, mapAccentToVoiceCharacteristics as mapAccentAssembly, type AccentMetadata as AccentMetadataAssembly, type TranscriptionResult as TranscriptionResultAssembly, type PhoneticWord } from './assemblyaiTranscription';
import { transcribeWithRevAi, detectAccentOnly as detectAccentRev, mapAccentToVoiceCharacteristics as mapAccentRev, type AccentMetadata, type TranscriptionResult } from './revaiTranscription';
import { transcribeWithEnsemble, type EnsembleResult } from './transcriptionEnsemble';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1';
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
const CLAP_API_URL = process.env.CLAP_API_URL;
const CLAP_API_KEY = process.env.CLAP_API_KEY;

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }
  return response.json() as Promise<any>;
}

/**
 * Enhanced transcription with smart ensemble system.
 *
 * How it works:
 * 1. Primary: AssemblyAI (best for Patois/African accents + phonetics)
 * 2. If confidence < 75%, get second opinion from Deepgram (best for music)
 * 3. Compare results and choose best (or combine if they agree)
 * 4. Fallback: Rev.ai → Whisper
 *
 * This ensures maximum accuracy for difficult accents while keeping costs low.
 */
export async function transcribeGuideWithAccentSupport(filePath: string): Promise<{
  text: string;
  accent?: AccentMetadataAssembly;
  confidence?: number;
  provider: 'assemblyai' | 'deepgram' | 'revai' | 'whisper' | 'ensemble' | 'fallback';
  phoneticTranscript?: string;
  pronunciationHints?: Record<string, string>;
  words?: PhoneticWord[];
  prosodyHints?: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  };
  ensembleDetails?: {
    primary: { provider: string; confidence: number; text: string };
    secondary?: { provider: string; confidence: number; text: string };
    agreement: number;
    method: 'single' | 'dual' | 'consensus';
  };
}> {
  // Use smart ensemble system (intelligently combines AssemblyAI + Deepgram)
  const result = await transcribeWithEnsemble(filePath);

  // Add prosody hints if we have accent data
  if (result.accent && !result.prosodyHints) {
    const voiceChar = mapAccentAssembly(result.accent);
    result.prosodyHints = voiceChar.prosodyHints;
  }

  return result;
}

/**
 * LEGACY: Original non-ensemble transcription (kept for compatibility)
 */
export async function transcribeGuideWithAccentSupportLegacy(filePath: string): Promise<{
  text: string;
  accent?: AccentMetadataAssembly;
  confidence?: number;
  provider: 'assemblyai' | 'revai' | 'whisper' | 'fallback';
  phoneticTranscript?: string;
  pronunciationHints?: Record<string, string>;
  words?: PhoneticWord[];
  prosodyHints?: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  };
}> {
  // Try AssemblyAI first for superior Patois/African accent handling + phonetics
  try {
    console.log('[AudioAnalysis] Attempting AssemblyAI transcription (best for Patois/African accents)...');
    const assemblyResult = await transcribeWithAssemblyAI(filePath, {
      detectAccent: true,
      enablePhonetics: true
    });

    if (assemblyResult && assemblyResult.text) {
      console.log(`[AudioAnalysis] ✅ AssemblyAI transcription successful (confidence: ${assemblyResult.confidence})`);

      if (assemblyResult.accent) {
        const voiceCharacteristics = mapAccentAssembly(assemblyResult.accent);
        console.log(`[AudioAnalysis] 🎤 Accent detected: ${voiceCharacteristics.accentHint}`);
        if (voiceCharacteristics.pronunciationGuide) {
          console.log(`[AudioAnalysis] 📝 Pronunciation guide: ${voiceCharacteristics.pronunciationGuide}`);
        }
        if (voiceCharacteristics.prosodyHints) {
          console.log(`[AudioAnalysis] 🎵 Prosody: ${JSON.stringify(voiceCharacteristics.prosodyHints)}`);
        }
      }

      if (assemblyResult.pronunciationHints && Object.keys(assemblyResult.pronunciationHints).length > 0) {
        console.log(`[AudioAnalysis] 🔤 Phonetic hints: ${JSON.stringify(assemblyResult.pronunciationHints)}`);
      }

      return {
        text: assemblyResult.text,
        accent: assemblyResult.accent,
        confidence: assemblyResult.confidence,
        provider: 'assemblyai',
        phoneticTranscript: assemblyResult.phoneticTranscript,
        pronunciationHints: assemblyResult.pronunciationHints,
        words: assemblyResult.words,
        prosodyHints: assemblyResult.accent ? mapAccentAssembly(assemblyResult.accent).prosodyHints : undefined
      };
    }
  } catch (error) {
    console.warn('[AudioAnalysis] AssemblyAI transcription failed, trying Rev.ai fallback:', (error as Error).message);
  }

  // Fallback to Rev.ai
  try {
    const revaiResult = await transcribeWithRevAi(filePath, {
      detectAccent: true,
      metadata: true
    });

    if (revaiResult && revaiResult.text) {
      console.log(`[AudioAnalysis] ✅ Rev.ai transcription successful (confidence: ${revaiResult.confidence})`);

      if (revaiResult.accent) {
        const voiceCharacteristics = mapAccentRev(revaiResult.accent);
        console.log(`[AudioAnalysis] 🎤 Accent detected: ${voiceCharacteristics.accentHint}`);
      }

      return {
        text: revaiResult.text,
        accent: revaiResult.accent as any,
        confidence: revaiResult.confidence,
        provider: 'revai'
      };
    }
  } catch (error) {
    console.warn('[AudioAnalysis] Rev.ai transcription failed, falling back to Whisper:', (error as Error).message);
  }

  // Final fallback to Whisper
  const whisperText = await transcribeGuideWithWhisper(filePath);
  if (whisperText) {
    console.log('[AudioAnalysis] ✅ Whisper transcription successful (no accent detection)');
    return {
      text: whisperText,
      confidence: 0.85,
      provider: 'whisper'
    };
  }

  // Last resort fallback
  console.error('[AudioAnalysis] ❌ All transcription methods failed');
  return {
    text: '',
    provider: 'fallback'
  };
}

/**
 * Legacy Whisper-only transcription (kept for backward compatibility).
 */
export async function transcribeGuideWithWhisper(filePath: string) {
  if (!OPENAI_API_KEY) return null;
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), path.basename(filePath));
  form.append('model', OPENAI_TRANSCRIBE_MODEL);
  form.append('response_format', 'text');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: form as any
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${errorText}`);
  }
  const text = await response.text();
  return text.trim();
}

export async function embedTextWithOpenAI(text: string) {
  if (!OPENAI_API_KEY) return null;
  const data = (await postJson(
    'https://api.openai.com/v1/embeddings',
    { model: OPENAI_EMBED_MODEL, input: text },
    { Authorization: `Bearer ${OPENAI_API_KEY}` }
  )) as any;
  const embedding = data?.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

export async function embedAudioWithClap(filePath: string) {
  if (!CLAP_API_URL) return null;
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), path.basename(filePath));
  const headers: Record<string, string> = {};
  if (CLAP_API_KEY) {
    headers.Authorization = `Bearer ${CLAP_API_KEY}`;
  }
  const response = await fetch(CLAP_API_URL, {
    method: 'POST',
    headers,
    body: form as any
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CLAP embedding failed (${response.status}): ${errorText}`);
  }
  const json = (await response.json()) as any;
  const embedding = json?.embedding ?? json?.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

// Re-export accent detection utilities for use in other services
// Primary exports from AssemblyAI (best for Patois/African accents)
export {
  detectAccentOnly as detectAccentAssembly,
  mapAccentToVoiceCharacteristics as mapAccentAssembly,
  type AccentMetadata as AccentMetadataAssembly,
  type TranscriptionResult as TranscriptionResultAssembly,
  type PhoneticWord
} from './assemblyaiTranscription';

// Legacy exports from Rev.ai (kept for fallback)
export {
  detectAccentOnly as detectAccentRev,
  mapAccentToVoiceCharacteristics as mapAccentRev,
  type AccentMetadata,
  type TranscriptionResult
} from './revaiTranscription';
