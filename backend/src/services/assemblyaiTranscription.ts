import { AssemblyAI } from 'assemblyai';
import fs from 'fs';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_ENABLE_DIARIZATION = process.env.ASSEMBLYAI_ENABLE_DIARIZATION === 'true';

export type AccentMetadata = {
  detected: string;
  confidence: number;
  language: string;
  dialect?: string;
  languageCode?: string;
};

export type PhoneticWord = {
  text: string;
  phonetic?: string; // IPA or X-SAMPA pronunciation
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
};

export type TranscriptionResult = {
  text: string;
  accent?: AccentMetadata;
  confidence: number;
  words?: PhoneticWord[];
  phoneticTranscript?: string; // Full IPA transcription
  pronunciationHints?: Record<string, string>; // Word → pronunciation mapping
};

/**
 * Jamaican Patois pronunciation dictionary
 * Maps common Patois words to their phonetic equivalents for TTS engines
 */
const PATOIS_PRONUNCIATION_DICT: Record<string, string> = {
  // Common Patois words
  'mi': 'mee',           // "I/me"
  'nuh': 'noh',          // "don't"
  'seh': 'seh',          // "say"
  'dem': 'dem',          // "them/they"
  'yuh': 'yuh',          // "you"
  'wah': 'wah',          // "what"
  'gwaan': 'gwaan',      // "going on"
  'ting': 'ting',        // "thing"
  'likkle': 'lee-kl',    // "little"
  'pickney': 'pick-nee', // "child"
  'duppy': 'dup-ee',     // "ghost"
  'bredda': 'bred-ah',   // "brother"
  'sistren': 'sis-tren', // "sister/sisters"
  'irie': 'eye-ree',     // "good/great"
  'weh': 'weh',          // "where"
  'deh': 'deh',          // "there/is"
  'fi': 'fee',           // "to/for"
  'pon': 'pon',          // "on/upon"
  'nyam': 'nyam',        // "eat"
  'dawta': 'daw-tah',    // "daughter"
  'yout': 'yoot',        // "youth"
  'naa': 'nah',          // "not"
  'cyaa': 'kyah',        // "can't"
  'caan': 'kahn',        // "can't"
};

/**
 * African English pronunciation adjustments
 * Common pronunciation patterns in Nigerian, Ghanaian, Kenyan English
 */
const AFRICAN_ENGLISH_PATTERNS: Record<string, string> = {
  // Nigerian English patterns
  'actually': 'ak-shoo-lee',
  'pastor': 'pas-tor', // Different stress
  'bottle': 'bot-tel',

  // Common slang
  'abi': 'ah-bee',       // "isn't it" (Nigerian)
  'ehn': 'ehn',          // affirmation (Nigerian)
  'oga': 'oh-gah',       // "boss" (Nigerian)
  'wahala': 'wah-hah-lah', // "trouble" (Nigerian)
  'shege': 'sheh-geh',   // problem (Nigerian)

  // Ghanaian
  'wah': 'wah',          // "what"
  'chale': 'cha-leh',    // "friend" (Ghanaian)

  // Kenyan/East African
  'sawa': 'sah-wah',     // "okay"
  'vibes': 'vaibz',      // Often pronounced distinctly
};

/**
 * Transcribes audio using AssemblyAI with advanced accent detection and phonetics.
 * Superior for Jamaican Patois, African accents, and music vocals.
 */
export async function transcribeWithAssemblyAI(
  filePath: string,
  options?: {
    language?: string;
    detectAccent?: boolean;
    enablePhonetics?: boolean;
    customVocabulary?: string[];
  }
): Promise<TranscriptionResult | null> {
  if (!ASSEMBLYAI_API_KEY || ASSEMBLYAI_API_KEY === 'your_assemblyai_api_key_here') {
    console.warn('[AssemblyAI] API key not configured, skipping AssemblyAI transcription');
    return null;
  }

  try {
    const client = new AssemblyAI({
      apiKey: ASSEMBLYAI_API_KEY
    });

    console.log(`[AssemblyAI] Starting transcription for: ${filePath}`);

    // Music-specific vocabulary (slang, adlibs, common terms)
    const musicVocabulary = [
      'skrrt', 'yeah', 'ayy', 'uh', 'woo', 'brr',
      'gwaan', 'ting', 'bredda', 'dawta', 'irie',
      'wagwan', 'mandem', 'gyal', 'badman',
      'abi', 'oga', 'wahala', 'chale', 'sawa',
      ...(options?.customVocabulary ?? [])
    ];

    // Upload file to AssemblyAI
    console.log('[AssemblyAI] Uploading audio file...');
    const uploadUrl = await client.files.upload(fs.createReadStream(filePath));

    // Configure transcription parameters
    const params = {
      audio: uploadUrl,
      language_code: (options?.language as any) ?? 'en',

      // Enable speaker diarization for better accuracy
      speaker_labels: ASSEMBLYAI_ENABLE_DIARIZATION,
      speakers_expected: 1, // Usually single vocal

      // Language detection (helps with accent identification)
      language_detection: options?.detectAccent ?? true,

      // Word-level timestamps and confidence
      word_boost: musicVocabulary, // Boost recognition of music terms
      boost_param: 'high' as any, // Aggressively boost custom vocabulary

      // Audio intelligence features
      filter_profanity: false, // Keep authentic lyrics
      redact_pii: false, // Don't redact personal info

      // Punctuation and formatting
      punctuate: true,
      format_text: false, // Keep raw text for music

      // Speech model (use best model for accents)
      speech_model: 'best' as any // Use the most accurate model
    };

    console.log('[AssemblyAI] Submitting transcription job...');
    const transcript = await client.transcripts.transcribe(params);

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    console.log(`[AssemblyAI] Transcription completed with ${(transcript.confidence ?? 0.85) * 100}% confidence`);

    // Extract text
    const text = transcript.text ?? '';

    // Extract accent metadata from language detection
    let accentData: AccentMetadata | undefined;
    if (options?.detectAccent && transcript.language_code) {
      const langCode = transcript.language_code;
      accentData = {
        detected: detectAccentFromLanguageCode(langCode),
        confidence: transcript.language_confidence ?? 0.9,
        language: langCode,
        languageCode: langCode,
        dialect: detectDialectFromTranscript(text)
      };
      console.log(`[AssemblyAI] Detected accent: ${JSON.stringify(accentData)}`);
    }

    // Extract word-level data with phonetics
    const words: PhoneticWord[] = (transcript.words ?? []).map((word: any) => ({
      text: word.text,
      start: word.start / 1000, // Convert ms to seconds
      end: word.end / 1000,
      confidence: word.confidence,
      speaker: word.speaker ? `Speaker ${word.speaker}` : undefined,
      phonetic: generatePhoneticHint(word.text, accentData?.detected)
    }));

    // Generate pronunciation hints for TTS
    const pronunciationHints = generatePronunciationHints(text, accentData?.detected);

    // Generate full phonetic transcript
    const phoneticTranscript = words
      .map(w => w.phonetic ?? w.text)
      .join(' ');

    return {
      text,
      accent: accentData,
      confidence: transcript.confidence ?? 0.85,
      words,
      phoneticTranscript,
      pronunciationHints
    };
  } catch (error) {
    console.error('[AssemblyAI] Transcription error:', error);
    return null;
  }
}

/**
 * Detects accent from AssemblyAI language code
 */
function detectAccentFromLanguageCode(langCode: string): string {
  // AssemblyAI returns codes like "en_us", "en_uk", "en_au"
  const code = langCode.toLowerCase();

  if (code.includes('en')) {
    if (code.includes('us')) return 'american';
    if (code.includes('uk') || code.includes('gb')) return 'british';
    if (code.includes('au')) return 'australian';
    if (code.includes('in')) return 'indian';
    if (code.includes('za')) return 'south_african';
    if (code.includes('ng')) return 'nigerian';
    if (code.includes('gh')) return 'ghanaian';
    if (code.includes('ke')) return 'kenyan';
    if (code.includes('jm')) return 'jamaican';
  }

  return code;
}

/**
 * Detects dialect from transcript content
 * Uses linguistic markers to identify Patois, AAVE, Cockney, etc.
 */
function detectDialectFromTranscript(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // Jamaican Patois markers
  const patoisMarkers = ['mi nuh', 'dem seh', 'wah gwaan', 'ting', 'yuh', 'naa', 'fi'];
  if (patoisMarkers.some(marker => lowerText.includes(marker))) {
    return 'patois';
  }

  // AAVE markers
  const aaveMarkers = ['finna', 'gonna', 'wanna', 'ima', 'ion'];
  if (aaveMarkers.some(marker => lowerText.includes(marker))) {
    return 'aave';
  }

  // Nigerian English markers
  const nigerianMarkers = ['abi', 'oga', 'wahala', 'shege', 'ehn'];
  if (nigerianMarkers.some(marker => lowerText.includes(marker))) {
    return 'nigerian';
  }

  // Cockney markers (though rare in music)
  const cockneyMarkers = ['innit', 'bruv', 'mate'];
  if (cockneyMarkers.some(marker => lowerText.includes(marker))) {
    return 'cockney';
  }

  return undefined;
}

/**
 * Generates phonetic pronunciation hint for a word based on accent
 */
function generatePhoneticHint(word: string, accent?: string): string | undefined {
  const lowerWord = word.toLowerCase();

  // Check Patois dictionary
  if (accent === 'jamaican' || accent === 'patois') {
    if (PATOIS_PRONUNCIATION_DICT[lowerWord]) {
      return PATOIS_PRONUNCIATION_DICT[lowerWord];
    }
  }

  // Check African English patterns
  if (accent?.includes('nigerian') || accent?.includes('ghanaian') || accent?.includes('african')) {
    if (AFRICAN_ENGLISH_PATTERNS[lowerWord]) {
      return AFRICAN_ENGLISH_PATTERNS[lowerWord];
    }
  }

  return undefined;
}

/**
 * Generates pronunciation hints dictionary for TTS
 * Maps words in transcript to their phonetic pronunciations
 */
function generatePronunciationHints(text: string, accent?: string): Record<string, string> {
  const hints: Record<string, string> = {};
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    const cleaned = word.replace(/[.,!?;:'"]/g, '');
    const hint = generatePhoneticHint(cleaned, accent);
    if (hint) {
      hints[cleaned] = hint;
    }
  }

  return hints;
}

/**
 * Maps AssemblyAI detected accents to voice characteristics for persona matching
 */
export function mapAccentToVoiceCharacteristics(accent?: AccentMetadata): {
  accentHint: string;
  pronunciationGuide?: string;
  prosodyHints?: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  };
} {
  if (!accent) {
    return { accentHint: 'neutral' };
  }

  const detected = accent.detected.toLowerCase();
  const dialect = accent.dialect?.toLowerCase() ?? '';

  // Jamaican Patois
  if (detected.includes('jamaican') || dialect === 'patois') {
    return {
      accentHint: 'jamaican_patois',
      pronunciationGuide: 'Caribbean English with creole influences, dropped consonants, melodic intonation, high-low tone patterns',
      prosodyHints: {
        rhythm: 'syllable-timed',
        intonation: 'melodic',
        tempo: 'moderate'
      }
    };
  }

  // Nigerian English
  if (detected.includes('nigerian') || dialect === 'nigerian') {
    return {
      accentHint: 'nigerian_english',
      pronunciationGuide: 'West African English, syllable-timed rhythm, distinct vowel pronunciation, rising terminal intonation',
      prosodyHints: {
        rhythm: 'syllable-timed',
        intonation: 'rising',
        tempo: 'moderate'
      }
    };
  }

  // Ghanaian English
  if (detected.includes('ghanaian')) {
    return {
      accentHint: 'ghanaian_english',
      pronunciationGuide: 'West African English, clear articulation, British English influence with African prosody',
      prosodyHints: {
        rhythm: 'syllable-timed',
        intonation: 'rising',
        tempo: 'moderate'
      }
    };
  }

  // South African English
  if (detected.includes('south_african') || detected.includes('za')) {
    return {
      accentHint: 'south_african_english',
      pronunciationGuide: 'South African English, distinct vowel shifts, Afrikaans influence',
      prosodyHints: {
        rhythm: 'stress-timed',
        intonation: 'rising',
        tempo: 'moderate'
      }
    };
  }

  // Kenyan/East African English
  if (detected.includes('kenyan') || detected.includes('east_african')) {
    return {
      accentHint: 'kenyan_english',
      pronunciationGuide: 'East African English, British English base with Swahili prosody',
      prosodyHints: {
        rhythm: 'syllable-timed',
        intonation: 'flat',
        tempo: 'moderate'
      }
    };
  }

  // AAVE
  if (dialect === 'aave') {
    return {
      accentHint: 'aave',
      pronunciationGuide: 'African American Vernacular English, distinctive phonology, tonal patterns',
      prosodyHints: {
        rhythm: 'stress-timed',
        intonation: 'melodic',
        tempo: 'moderate'
      }
    };
  }

  // UK variants
  if (detected.includes('british') || detected.includes('uk')) {
    if (dialect === 'cockney') {
      return {
        accentHint: 'cockney',
        pronunciationGuide: 'London East End, glottal stops, th-fronting, rhyming slang patterns',
        prosodyHints: {
          rhythm: 'stress-timed',
          intonation: 'rising',
          tempo: 'fast'
        }
      };
    }
    return {
      accentHint: 'british',
      pronunciationGuide: 'British English, Received Pronunciation or regional variant',
      prosodyHints: {
        rhythm: 'stress-timed',
        intonation: 'falling',
        tempo: 'moderate'
      }
    };
  }

  // American
  if (detected.includes('american') || detected.includes('us')) {
    return {
      accentHint: 'american',
      pronunciationGuide: 'General American English',
      prosodyHints: {
        rhythm: 'stress-timed',
        intonation: 'falling',
        tempo: 'moderate'
      }
    };
  }

  // Australian
  if (detected.includes('australian')) {
    return {
      accentHint: 'australian',
      pronunciationGuide: 'Australian English, raised vowels, terminal rising intonation',
      prosodyHints: {
        rhythm: 'stress-timed',
        intonation: 'rising',
        tempo: 'moderate'
      }
    };
  }

  // Default
  return {
    accentHint: detected,
    pronunciationGuide: 'Detected accent applied to voice synthesis'
  };
}

/**
 * Quick accent detection without full transcription
 */
export async function detectAccentOnly(filePath: string): Promise<AccentMetadata | null> {
  const result = await transcribeWithAssemblyAI(filePath, {
    detectAccent: true,
    enablePhonetics: false
  });

  return result?.accent ?? null;
}
