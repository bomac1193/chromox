import { transcribeWithAssemblyAI, type TranscriptionResult as AssemblyResult, type PhoneticWord } from './assemblyaiTranscription';
import { transcribeWithDeepgram, type TranscriptionResult as DeepgramResult } from './deepgramTranscription';
import { transcribeWithRevAi, type TranscriptionResult as RevResult } from './revaiTranscription';
import { transcribeGuideWithWhisper } from './audioAnalysis';

const ENSEMBLE_CONFIDENCE_THRESHOLD = parseFloat(process.env.ENSEMBLE_CONFIDENCE_THRESHOLD || '0.75');
const ENSEMBLE_MODE = process.env.ENSEMBLE_MODE || 'smart'; // 'smart' | 'always' | 'disabled'

export type EnsembleResult = {
  text: string;
  confidence: number;
  provider: 'assemblyai' | 'deepgram' | 'revai' | 'whisper' | 'ensemble';
  accent?: {
    detected: string;
    confidence: number;
    language: string;
    dialect?: string;
    languageCode?: string;
  };
  phoneticTranscript?: string;
  pronunciationHints?: Record<string, string>;
  prosodyHints?: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  };
  words?: PhoneticWord[];
  ensembleDetails?: {
    primary: { provider: string; confidence: number; text: string };
    secondary?: { provider: string; confidence: number; text: string };
    agreement: number; // 0-1, how much they agree
    method: 'single' | 'dual' | 'consensus';
  };
};

/**
 * Smart Ensemble Transcription System
 *
 * Strategy:
 * 1. Always try AssemblyAI first (best for accents + phonetics)
 * 2. If confidence < threshold, get second opinion from Deepgram (best for music)
 * 3. Compare results and choose best (or combine if they agree)
 * 4. Only fallback to Rev.ai/Whisper if both primary methods fail
 */
export async function transcribeWithEnsemble(
  filePath: string,
  options?: {
    forceEnsemble?: boolean; // Force dual transcription even if confidence is high
  }
): Promise<EnsembleResult> {
  console.log(`[Ensemble] Starting smart ensemble transcription (mode: ${ENSEMBLE_MODE})`);
  console.log(`[Ensemble] Confidence threshold: ${ENSEMBLE_CONFIDENCE_THRESHOLD}`);

  // STEP 1: Try AssemblyAI (primary - best for accents)
  let assemblyResult: AssemblyResult | null = null;
  try {
    console.log('[Ensemble] → Attempting AssemblyAI (primary)...');
    assemblyResult = await transcribeWithAssemblyAI(filePath, {
      detectAccent: true,
      enablePhonetics: true
    });

    if (assemblyResult && assemblyResult.text) {
      console.log(`[Ensemble] ✅ AssemblyAI succeeded: confidence ${assemblyResult.confidence.toFixed(2)}`);

      // Check if we need a second opinion
      const needsSecondOpinion =
        ENSEMBLE_MODE === 'always' ||
        options?.forceEnsemble ||
        (ENSEMBLE_MODE === 'smart' && assemblyResult.confidence < ENSEMBLE_CONFIDENCE_THRESHOLD);

      if (!needsSecondOpinion) {
        console.log('[Ensemble] ✅ Confidence above threshold, using AssemblyAI result');
        return {
          text: assemblyResult.text,
          confidence: assemblyResult.confidence,
          provider: 'assemblyai',
          accent: assemblyResult.accent,
          phoneticTranscript: assemblyResult.phoneticTranscript,
          pronunciationHints: assemblyResult.pronunciationHints,
          words: assemblyResult.words,
          ensembleDetails: {
            primary: {
              provider: 'assemblyai',
              confidence: assemblyResult.confidence,
              text: assemblyResult.text
            },
            agreement: 1.0,
            method: 'single'
          }
        };
      }

      console.log('[Ensemble] ⚠️  Confidence below threshold, getting second opinion from Deepgram...');
    }
  } catch (error) {
    console.warn('[Ensemble] ⚠️  AssemblyAI failed:', (error as Error).message);
  }

  // STEP 2: Try Deepgram (secondary - best for music vocals)
  let deepgramResult: DeepgramResult | null = null;
  try {
    console.log('[Ensemble] → Attempting Deepgram (secondary)...');
    deepgramResult = await transcribeWithDeepgram(filePath, {
      detectAccent: true,
      model: 'nova-2' // Best model for music
    });

    if (deepgramResult && deepgramResult.text) {
      console.log(`[Ensemble] ✅ Deepgram succeeded: confidence ${deepgramResult.confidence.toFixed(2)}`);
    }
  } catch (error) {
    console.warn('[Ensemble] ⚠️  Deepgram failed:', (error as Error).message);
  }

  // STEP 3: Compare and combine results
  if (assemblyResult && deepgramResult) {
    console.log('[Ensemble] 🤝 Comparing AssemblyAI vs Deepgram results...');
    const combined = compareAndCombine(assemblyResult, deepgramResult);
    console.log(`[Ensemble] ✅ Ensemble result: ${combined.ensembleDetails?.method} (agreement: ${(combined.ensembleDetails?.agreement || 0) * 100}%)`);
    return combined;
  }

  // STEP 4: Use whichever succeeded (if only one did)
  if (assemblyResult) {
    console.log('[Ensemble] ✅ Using AssemblyAI result (Deepgram unavailable)');
    return {
      text: assemblyResult.text,
      confidence: assemblyResult.confidence,
      provider: 'assemblyai',
      accent: assemblyResult.accent,
      phoneticTranscript: assemblyResult.phoneticTranscript,
      pronunciationHints: assemblyResult.pronunciationHints,
      words: assemblyResult.words,
      ensembleDetails: {
        primary: {
          provider: 'assemblyai',
          confidence: assemblyResult.confidence,
          text: assemblyResult.text
        },
        agreement: 1.0,
        method: 'single'
      }
    };
  }

  if (deepgramResult) {
    console.log('[Ensemble] ✅ Using Deepgram result (AssemblyAI unavailable)');
    return {
      text: deepgramResult.text,
      confidence: deepgramResult.confidence,
      provider: 'deepgram',
      accent: deepgramResult.accent,
      ensembleDetails: {
        primary: {
          provider: 'deepgram',
          confidence: deepgramResult.confidence,
          text: deepgramResult.text
        },
        agreement: 1.0,
        method: 'single'
      }
    };
  }

  // STEP 5: Fallback to Rev.ai
  console.log('[Ensemble] ⚠️  Both primary methods failed, trying Rev.ai fallback...');
  try {
    const revResult = await transcribeWithRevAi(filePath, {
      detectAccent: true,
      metadata: true
    });

    if (revResult && revResult.text) {
      console.log('[Ensemble] ✅ Rev.ai fallback succeeded');
      return {
        text: revResult.text,
        confidence: revResult.confidence,
        provider: 'revai',
        accent: revResult.accent as any,
        ensembleDetails: {
          primary: {
            provider: 'revai',
            confidence: revResult.confidence,
            text: revResult.text
          },
          agreement: 1.0,
          method: 'single'
        }
      };
    }
  } catch (error) {
    console.warn('[Ensemble] ⚠️  Rev.ai failed:', (error as Error).message);
  }

  // STEP 6: Final fallback to Whisper
  console.log('[Ensemble] ⚠️  All specialized methods failed, using Whisper final fallback...');
  const whisperText = await transcribeGuideWithWhisper(filePath);
  if (whisperText) {
    console.log('[Ensemble] ✅ Whisper fallback succeeded');
    return {
      text: whisperText,
      confidence: 0.85,
      provider: 'whisper',
      ensembleDetails: {
        primary: {
          provider: 'whisper',
          confidence: 0.85,
          text: whisperText
        },
        agreement: 1.0,
        method: 'single'
      }
    };
  }

  // Complete failure
  console.error('[Ensemble] ❌ All transcription methods failed');
  return {
    text: '',
    confidence: 0,
    provider: 'ensemble',
    ensembleDetails: {
      primary: {
        provider: 'none',
        confidence: 0,
        text: ''
      },
      agreement: 0,
      method: 'single'
    }
  };
}

/**
 * Compares AssemblyAI and Deepgram results and intelligently combines them
 */
function compareAndCombine(
  assembly: AssemblyResult,
  deepgram: DeepgramResult
): EnsembleResult {
  // Calculate text similarity (Levenshtein-based)
  const agreement = calculateAgreement(assembly.text, deepgram.text);

  console.log(`[Ensemble] Text agreement: ${(agreement * 100).toFixed(1)}%`);
  console.log(`[Ensemble] AssemblyAI: "${assembly.text.slice(0, 60)}..."`);
  console.log(`[Ensemble] Deepgram:   "${deepgram.text.slice(0, 60)}..."`);

  // HIGH AGREEMENT (>80%): They basically agree
  if (agreement > 0.8) {
    console.log('[Ensemble] 🤝 High agreement - using higher confidence result');

    // Use result with higher confidence
    const useAssembly = assembly.confidence >= deepgram.confidence;

    return {
      text: useAssembly ? assembly.text : deepgram.text,
      confidence: Math.max(assembly.confidence, deepgram.confidence),
      provider: 'ensemble',
      // Prefer AssemblyAI's rich metadata (phonetics, prosody)
      accent: assembly.accent,
      phoneticTranscript: assembly.phoneticTranscript,
      pronunciationHints: assembly.pronunciationHints,
      words: assembly.words,
      ensembleDetails: {
        primary: {
          provider: useAssembly ? 'assemblyai' : 'deepgram',
          confidence: useAssembly ? assembly.confidence : deepgram.confidence,
          text: useAssembly ? assembly.text : deepgram.text
        },
        secondary: {
          provider: useAssembly ? 'deepgram' : 'assemblyai',
          confidence: useAssembly ? deepgram.confidence : assembly.confidence,
          text: useAssembly ? deepgram.text : assembly.text
        },
        agreement,
        method: 'consensus'
      }
    };
  }

  // MEDIUM AGREEMENT (50-80%): Some disagreement
  if (agreement > 0.5) {
    console.log('[Ensemble] ⚠️  Medium agreement - using AssemblyAI (better accent handling)');

    return {
      text: assembly.text,
      confidence: assembly.confidence * 0.95, // Slight confidence penalty
      provider: 'ensemble',
      accent: assembly.accent,
      phoneticTranscript: assembly.phoneticTranscript,
      pronunciationHints: assembly.pronunciationHints,
      words: assembly.words,
      ensembleDetails: {
        primary: {
          provider: 'assemblyai',
          confidence: assembly.confidence,
          text: assembly.text
        },
        secondary: {
          provider: 'deepgram',
          confidence: deepgram.confidence,
          text: deepgram.text
        },
        agreement,
        method: 'dual'
      }
    };
  }

  // LOW AGREEMENT (<50%): Significant disagreement
  console.log('[Ensemble] ❌ Low agreement - possible difficult audio');

  // When they disagree significantly, trust the more confident one
  if (assembly.confidence > deepgram.confidence + 0.1) {
    console.log('[Ensemble] → Trusting AssemblyAI (higher confidence)');
    return {
      text: assembly.text,
      confidence: assembly.confidence * 0.9, // Confidence penalty for disagreement
      provider: 'ensemble',
      accent: assembly.accent,
      phoneticTranscript: assembly.phoneticTranscript,
      pronunciationHints: assembly.pronunciationHints,
      words: assembly.words,
      ensembleDetails: {
        primary: {
          provider: 'assemblyai',
          confidence: assembly.confidence,
          text: assembly.text
        },
        secondary: {
          provider: 'deepgram',
          confidence: deepgram.confidence,
          text: deepgram.text
        },
        agreement,
        method: 'dual'
      }
    };
  } else {
    console.log('[Ensemble] → Trusting Deepgram (higher confidence or music context)');
    return {
      text: deepgram.text,
      confidence: deepgram.confidence * 0.9,
      provider: 'ensemble',
      accent: deepgram.accent,
      ensembleDetails: {
        primary: {
          provider: 'deepgram',
          confidence: deepgram.confidence,
          text: deepgram.text
        },
        secondary: {
          provider: 'assemblyai',
          confidence: assembly.confidence,
          text: assembly.text
        },
        agreement,
        method: 'dual'
      }
    };
  }
}

/**
 * Calculates text agreement using normalized Levenshtein distance
 * Returns 0-1 where 1 = identical, 0 = completely different
 */
function calculateAgreement(text1: string, text2: string): number {
  const s1 = text1.toLowerCase().trim();
  const s2 = text2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Simple word-level Jaccard similarity (faster than Levenshtein)
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
