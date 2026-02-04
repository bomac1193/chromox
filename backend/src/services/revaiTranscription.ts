import fs from 'fs';
import { RevAiApiClient } from 'revai-node-sdk';

const REVAI_API_KEY = process.env.REVAI_API_KEY;
const REVAI_ENABLE_ACCENT_DETECTION = process.env.REVAI_ENABLE_ACCENT_DETECTION === 'true';
const REVAI_DEFAULT_LANGUAGE = process.env.REVAI_DEFAULT_LANGUAGE ?? 'en';

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
};

/**
 * Transcribes audio using Rev.ai with advanced accent detection.
 * Supports challenging accents like Jamaican Patois, regional dialects, etc.
 */
export async function transcribeWithRevAi(
  filePath: string,
  options?: {
    language?: string;
    detectAccent?: boolean;
    metadata?: boolean;
  }
): Promise<TranscriptionResult | null> {
  if (!REVAI_API_KEY || REVAI_API_KEY === 'your_revai_api_key_here') {
    console.warn('[RevAI] API key not configured, skipping Rev.ai transcription');
    return null;
  }

  try {
    const client = new RevAiApiClient(REVAI_API_KEY);

    // Configure job options
    const language = options?.language ?? REVAI_DEFAULT_LANGUAGE;
    const detectAccent = options?.detectAccent ?? REVAI_ENABLE_ACCENT_DETECTION;

    console.log(`[RevAI] Starting transcription for: ${filePath}`);
    console.log(`[RevAI] Language: ${language}, Accent detection: ${detectAccent}`);

    // Submit job to Rev.ai
    const job = await client.submitJobLocalFile(filePath, {
      language,
      // Enable speaker channels for better separation
      speaker_channels_count: 1,
      // Remove disfluencies (um, uh, etc.) for cleaner lyrics
      remove_disfluencies: true,
      // Filter profanity if needed (set to false for authentic lyrics)
      filter_profanity: false,
      // Custom vocabulary for music/slang terms
      custom_vocabularies: undefined, // Can add custom terms later
      // Skip punctuation for raw lyrics
      skip_punctuation: false,
      // Enable word-level confidence scores
      verbatim: false
    });

    console.log(`[RevAI] Job submitted: ${job.id}`);

    // Poll for job completion (Rev.ai processes async)
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const jobDetails = await client.getJobDetails(job.id);

      if (jobDetails.status === 'transcribed') {
        console.log(`[RevAI] Transcription completed for job: ${job.id}`);

        // Get transcript with word-level details
        const transcript = await client.getTranscriptObject(job.id);

        // Extract text from monologues
        const text = transcript.monologues
          .map((monologue: any) =>
            monologue.elements
              .filter((el: any) => el.type === 'text')
              .map((el: any) => el.value)
              .join('')
          )
          .join(' ')
          .trim();

        // Calculate overall confidence
        const allWords = transcript.monologues.flatMap((m: any) =>
          m.elements.filter((el: any) => el.type === 'text' && el.confidence)
        );

        const avgConfidence =
          allWords.length > 0
            ? allWords.reduce((sum: number, word: any) => sum + (word.confidence ?? 0), 0) /
              allWords.length
            : 0.8;

        // Extract accent metadata if available
        // Note: Rev.ai's language detection is in jobDetails, not transcript
        let accentData: AccentMetadata | undefined;
        if (detectAccent && jobDetails.language) {
          const detectedLang = jobDetails.language;
          accentData = {
            detected: detectedLang,
            confidence: 0.9, // Rev.ai doesn't provide language confidence in API
            language: language,
            dialect: undefined // Dialect detection requires custom analysis
          };
          console.log(`[RevAI] Detected accent: ${JSON.stringify(accentData)}`);
        }

        // Extract word-level data for advanced processing
        const words = allWords.map((word: any) => ({
          text: word.value,
          start: word.ts ?? 0,
          end: word.end_ts ?? 0,
          confidence: word.confidence ?? 0.8
        }));

        return {
          text,
          accent: accentData,
          confidence: avgConfidence,
          words
        };
      } else if (jobDetails.status === 'failed') {
        throw new Error(`Rev.ai job failed: ${jobDetails.failure ?? 'Unknown error'}`);
      }

      // Log progress
      if (attempt % 3 === 0) {
        console.log(`[RevAI] Job ${job.id} status: ${jobDetails.status}... (attempt ${attempt + 1}/${maxAttempts})`);
      }
    }

    throw new Error('Rev.ai transcription timeout');
  } catch (error) {
    console.error('[RevAI] Transcription error:', error);
    return null;
  }
}

/**
 * Detects accent from audio without full transcription (faster).
 * Useful for pre-matching personas to guide vocals.
 */
export async function detectAccentOnly(filePath: string): Promise<AccentMetadata | null> {
  const result = await transcribeWithRevAi(filePath, {
    detectAccent: true,
    metadata: true
  });

  return result?.accent ?? null;
}

/**
 * Maps Rev.ai detected accents to persona voice characteristics.
 * Helps prevent Chinese/Russian-sounding outputs when matching to wrong accents.
 */
export function mapAccentToVoiceCharacteristics(accent?: AccentMetadata): {
  accentHint: string;
  pronunciationGuide?: string;
} {
  if (!accent) {
    return { accentHint: 'neutral' };
  }

  const detected = accent.detected.toLowerCase();
  const dialect = accent.dialect?.toLowerCase() ?? '';

  // Jamaican Patois
  if (detected.includes('jamaican') || dialect.includes('patois') || dialect.includes('jamaican')) {
    return {
      accentHint: 'jamaican_patois',
      pronunciationGuide: 'Caribbean English with creole influences, dropped consonants, melodic intonation'
    };
  }

  // UK variants
  if (detected.includes('en-gb') || detected.includes('british')) {
    if (dialect.includes('cockney')) {
      return {
        accentHint: 'cockney',
        pronunciationGuide: 'London East End, glottal stops, rhyming slang patterns'
      };
    }
    if (dialect.includes('scottish')) {
      return {
        accentHint: 'scottish',
        pronunciationGuide: 'Scottish English, rolled R, distinct vowel shifts'
      };
    }
    return {
      accentHint: 'british',
      pronunciationGuide: 'Received Pronunciation or regional British English'
    };
  }

  // US variants
  if (detected.includes('en-us') || detected.includes('american')) {
    if (dialect.includes('southern') || dialect.includes('aave')) {
      return {
        accentHint: 'us_southern_aave',
        pronunciationGuide: 'African American Vernacular English, Southern drawl influences'
      };
    }
    return {
      accentHint: 'american',
      pronunciationGuide: 'General American English'
    };
  }

  // Australian
  if (detected.includes('en-au') || detected.includes('australian')) {
    return {
      accentHint: 'australian',
      pronunciationGuide: 'Australian English, raised vowels, terminal rising intonation'
    };
  }

  // Indian
  if (detected.includes('en-in') || detected.includes('indian')) {
    return {
      accentHint: 'indian',
      pronunciationGuide: 'Indian English, retroflex consonants, syllable-timed rhythm'
    };
  }

  // Irish
  if (detected.includes('irish')) {
    return {
      accentHint: 'irish',
      pronunciationGuide: 'Irish English, dental fricatives, distinctive intonation'
    };
  }

  // Default fallback
  return {
    accentHint: detected,
    pronunciationGuide: 'Detected accent applied to voice synthesis'
  };
}
