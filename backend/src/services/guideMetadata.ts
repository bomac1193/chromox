import crypto from 'crypto';
import { embedAudioWithClap, embedTextWithOpenAI, transcribeGuideWithWhisper, transcribeGuideWithAccentSupport, type AccentMetadataAssembly } from './audioAnalysis.js';
import { detectBPM } from './beatDetection.js';
import type { BeatGrid } from '../types.js';

const moods: Array<'hype' | 'dream' | 'anthem' | 'ambient'> = ['hype', 'dream', 'anthem', 'ambient'];

function pseudoRandom(seed: string, min = 0, max = 1) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const val = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  return min + (max - min) * val;
}

function buildEmbedding(seed: string, dimensions = 12) {
  const buffer = crypto.createHash('sha256').update(seed).digest();
  const values: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    const normalized = buffer[i] / 255;
    values.push(Number((normalized * 2 - 1).toFixed(4)));
  }
  return values;
}

function fallbackTranscript(name: string, mood: string) {
  const base = name.replace(/[_-]/g, ' ');
  switch (mood) {
    case 'dream':
      return `breathy, echoes of "${base}" with floaty falsetto phrases`;
    case 'anthem':
      return `anthemic chant loops built from ${base}, stacked in octaves`;
    case 'ambient':
      return `slow vocoder bed whispering fragments of ${base}`;
    default:
      return `glitchy hype chop repeating ${base} with adlib responses`;
  }
}

function deriveMood(input: { path: string; mode?: 'glitch' | 'dream' | 'anthem' }) {
  if (input.mode === 'dream') return 'dream';
  if (input.mode === 'anthem') return 'anthem';
  return moods[Math.floor(pseudoRandom(input.path) * moods.length)];
}

function deriveRecommendedUse(mood: string) {
  switch (mood) {
    case 'hype':
      return 'Intros + drops';
    case 'dream':
      return 'Bridges + breakdowns';
    case 'anthem':
      return 'Hooks + gang chants';
    default:
      return 'Pads + textures';
  }
}

export function buildHeuristicGuideMetadata(input: {
  name: string;
  path: string;
  mode?: 'glitch' | 'dream' | 'anthem';
  tags?: string[];
  source?: 'user' | 'ai-lab';
}) {
  const mood = deriveMood(input);
  const tempo = Number((0.7 + pseudoRandom(`${input.path}-tempo`, 0, 0.8)).toFixed(2));
  const tags = new Set<string>([mood, ...(input.tags ?? [])]);
  const transcript = fallbackTranscript(input.name, mood);
  const embedding = buildEmbedding(`${input.path}:${input.name}`);
  const recommendedUse = deriveRecommendedUse(mood);
  const aiModel = input.source === 'ai-lab' ? `Chromox-${input.mode ?? 'glitch'}` : undefined;

  return {
    transcript,
    tempo,
    embedding,
    mood,
    recommendedUse,
    aiModel,
    tags: Array.from(tags)
  };
}

export async function generateGuideMetadata(input: {
  name: string;
  path: string;
  mode?: 'glitch' | 'dream' | 'anthem';
  tags?: string[];
  source?: 'user' | 'ai-lab';
}) {
  const heuristics = buildHeuristicGuideMetadata(input);
  let transcript = heuristics.transcript;
  let embedding: number[] | null = null;
  let accentMetadata: AccentMetadataAssembly | undefined;
  let transcriptionConfidence: number | undefined;
  let transcriptionProvider: 'assemblyai' | 'deepgram' | 'revai' | 'whisper' | 'ensemble' | 'fallback' = 'fallback';
  let ensembleDetails: {
    primary: { provider: string; confidence: number };
    secondary?: { provider: string; confidence: number };
    agreement: number;
    method: 'single' | 'dual' | 'consensus';
  } | undefined;
  let phoneticTranscript: string | undefined;
  let pronunciationHints: Record<string, string> | undefined;
  let prosodyHints: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  } | undefined;
  let beatGrid: BeatGrid | undefined;
  let realTempo: number | undefined;

  // Detect BPM and beat grid
  try {
    const beatAnalysis = await detectBPM(input.path);
    beatGrid = {
      bpm: beatAnalysis.bpm,
      confidence: beatAnalysis.confidence,
      beats: beatAnalysis.beats,
      downbeats: beatAnalysis.downbeats,
      duration: beatAnalysis.duration
    };
    realTempo = beatAnalysis.bpm;
    console.log(`[GuideMetadata] 🥁 BPM detected: ${beatAnalysis.bpm} (confidence: ${beatAnalysis.confidence.toFixed(2)})`);
  } catch (error) {
    console.warn('[GuideMetadata] Beat detection failed, using heuristic tempo:', (error as Error).message);
  }

  // Use enhanced transcription with accent detection (AssemblyAI → Rev.ai → Whisper fallback chain)
  try {
    const transcriptionResult = await transcribeGuideWithAccentSupport(input.path);
    if (transcriptionResult.text) {
      transcript = transcriptionResult.text.trim();
      accentMetadata = transcriptionResult.accent;
      transcriptionConfidence = transcriptionResult.confidence;
      transcriptionProvider = transcriptionResult.provider;
      phoneticTranscript = transcriptionResult.phoneticTranscript;
      pronunciationHints = transcriptionResult.pronunciationHints;
      prosodyHints = transcriptionResult.prosodyHints;
      ensembleDetails = transcriptionResult.ensembleDetails;

      console.log(`[GuideMetadata] ✅ Transcription via ${transcriptionProvider}: "${transcript.slice(0, 60)}..."`);
      if (accentMetadata) {
        console.log(`[GuideMetadata] 🎤 Detected accent: ${accentMetadata.detected} (confidence: ${accentMetadata.confidence})`);
        if (accentMetadata.dialect) {
          console.log(`[GuideMetadata] 🗣️  Dialect: ${accentMetadata.dialect}`);
        }
      }
      if (pronunciationHints && Object.keys(pronunciationHints).length > 0) {
        console.log(`[GuideMetadata] 🔤 Pronunciation hints available: ${Object.keys(pronunciationHints).length} words`);
      }
      if (ensembleDetails && ensembleDetails.method !== 'single') {
        console.log(`[GuideMetadata] 🤝 Ensemble: ${ensembleDetails.method} (agreement: ${(ensembleDetails.agreement * 100).toFixed(0)}%)`);
        console.log(`[GuideMetadata] 📊 Primary: ${ensembleDetails.primary.provider} (${ensembleDetails.primary.confidence.toFixed(2)})`);
        if (ensembleDetails.secondary) {
          console.log(`[GuideMetadata] 📊 Secondary: ${ensembleDetails.secondary.provider} (${ensembleDetails.secondary.confidence.toFixed(2)})`);
        }
      }
    }
  } catch (error) {
    console.warn('[GuideMetadata] Enhanced transcription failed, using fallback:', (error as Error).message);
  }

  // Generate embedding from audio or text
  try {
    embedding =
      (await embedAudioWithClap(input.path)) ||
      (transcript ? await embedTextWithOpenAI(transcript) : null);
  } catch (error) {
    console.warn('[GuideMetadata] Embedding generation failed, falling back:', (error as Error).message);
  }

  return {
    ...heuristics,
    transcript,
    tempo: realTempo ?? heuristics.tempo,  // Use real BPM if available
    embedding: embedding ?? heuristics.embedding,
    accentMetadata,
    transcriptionConfidence,
    transcriptionProvider,
    phoneticTranscript,
    pronunciationHints,
    prosodyHints,
    ensembleDetails,
    beatGrid
  };
}
