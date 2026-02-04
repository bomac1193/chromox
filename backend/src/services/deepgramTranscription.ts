import { createClient } from '@deepgram/sdk';
import fs from 'fs';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export type AccentMetadata = {
  detected: string;
  confidence: number;
  language: string;
  dialect?: string;
};

export type TranscriptionResult = {
  text: string;
  accent?: AccentMetadata;
  confidence: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  channels?: number; // Audio channels detected
};

/**
 * Transcribes audio using Deepgram with music-optimized settings.
 * Deepgram is specifically trained on music/rap vocals and handles:
 * - Background beats/instrumentals
 * - Ad-libs and vocal effects
 * - Autotune and pitch-shifted vocals
 * - Real-time streaming (though we use batch here)
 */
export async function transcribeWithDeepgram(
  filePath: string,
  options?: {
    language?: string;
    detectAccent?: boolean;
    model?: 'nova-2' | 'nova' | 'enhanced' | 'base';
  }
): Promise<TranscriptionResult | null> {
  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
    console.warn('[Deepgram] API key not configured, skipping Deepgram transcription');
    return null;
  }

  try {
    const deepgram = createClient(DEEPGRAM_API_KEY);

    console.log(`[Deepgram] Starting transcription for: ${filePath}`);

    // Read audio file
    const audioBuffer = fs.readFileSync(filePath);

    // Use Nova-2 model (best for music/vocals, released 2024)
    const model = options?.model ?? 'nova-2';

    console.log(`[Deepgram] Using model: ${model} (optimized for music)`);

    // Configure for music/rap vocals
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: model,
        language: options?.language ?? 'en',

        // Music-specific settings
        punctuate: true,
        paragraphs: false,
        utterances: false,

        // Word-level timestamps and confidence
        smart_format: true, // Auto-format for readability
        diarize: false, // Usually single vocal

        // Accuracy boosters
        keywords: [
          // Jamaican Patois
          'gwaan', 'ting', 'dem', 'seh', 'nuh', 'mi', 'yuh', 'wah',
          'likkle', 'bredda', 'sistren', 'irie', 'badman', 'gyal',
          // Nigerian/African
          'abi', 'oga', 'wahala', 'shege', 'ehn', 'chale', 'sawa',
          // Adlibs/slang
          'skrrt', 'ayy', 'yeah', 'brr', 'woo', 'uh',
          // UK
          'innit', 'bruv', 'mandem', 'wagwan'
        ],

        // Metadata
        detect_language: options?.detectAccent ?? false,

        // Audio processing (helps with music backing)
        filler_words: false, // Keep um/uh in rap
        profanity_filter: false, // Keep authentic lyrics
      }
    );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    if (!result || !result.results) {
      throw new Error('Deepgram returned no results');
    }

    // Extract transcript
    const channel = result.results.channels[0];
    if (!channel || !channel.alternatives || channel.alternatives.length === 0) {
      throw new Error('No transcription alternatives found');
    }

    const alternative = channel.alternatives[0];
    const text = alternative.transcript || '';
    const confidence = alternative.confidence || 0.8;

    console.log(`[Deepgram] Transcription completed with ${(confidence * 100).toFixed(1)}% confidence`);

    // Extract word-level data
    const words = (alternative.words || []).map((word: any) => ({
      text: word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence || 0.8
    }));

    // Extract accent metadata if language detection was enabled
    let accentData: AccentMetadata | undefined;
    if (options?.detectAccent && result.results.channels[0].detected_language) {
      const detectedLang = result.results.channels[0].detected_language;
      accentData = {
        detected: detectedLang,
        confidence: 0.85, // Deepgram doesn't provide language confidence
        language: detectedLang
      };
      console.log(`[Deepgram] Detected language: ${detectedLang}`);
    }

    // Audio metadata
    const channels = result.results.channels.length;

    return {
      text,
      accent: accentData,
      confidence,
      words,
      channels
    };
  } catch (error) {
    console.error('[Deepgram] Transcription error:', error);
    return null;
  }
}

/**
 * Quick accent detection without full transcription
 */
export async function detectAccentOnly(filePath: string): Promise<AccentMetadata | null> {
  const result = await transcribeWithDeepgram(filePath, {
    detectAccent: true,
    model: 'base' // Use faster base model for quick detection
  });

  return result?.accent ?? null;
}

/**
 * Checks if audio has multiple channels (stereo, etc.)
 * Useful for determining if source is mastered/mixed
 */
export async function detectAudioChannels(filePath: string): Promise<number> {
  const result = await transcribeWithDeepgram(filePath, {
    model: 'base'
  });

  return result?.channels ?? 1;
}
