import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * ElevenLabs Pronunciation Dictionary Manager
 *
 * Creates and manages pronunciation dictionaries for accurate accent rendering.
 * Maps phonetic hints from AssemblyAI/Deepgram to ElevenLabs pronunciation rules.
 */

type PronunciationRule = {
  word: string;           // Original word (e.g., "mi")
  phonetic: string;       // Phonetic spelling (e.g., "mee")
  alphabet?: 'ipa' | 'cmu'; // Phonetic alphabet (optional)
};

type PronunciationDictionary = {
  id: string;
  name: string;
  description: string;
  version_id: string;
  rules: PronunciationRule[];
};

/**
 * Creates a pronunciation dictionary in ElevenLabs for a specific accent
 */
export async function createPronunciationDictionary(
  name: string,
  rules: Record<string, string>, // word → phonetic
  description?: string
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'demo-key') {
    console.warn('[ElevenLabs] Cannot create pronunciation dictionary without API key');
    return null;
  }

  try {
    console.log(`[ElevenLabs] Creating pronunciation dictionary: ${name}`);
    console.log(`[ElevenLabs] Rules: ${Object.keys(rules).length} words`);

    // Check if dictionary already exists
    const existing = await getPronunciationDictionary(name);
    if (existing) {
      console.log(`[ElevenLabs] Dictionary "${name}" already exists, updating...`);
      return await updatePronunciationDictionary(existing.id, rules);
    }

    // Format rules for ElevenLabs API
    const formattedRules = Object.entries(rules).map(([word, phonetic]) => ({
      string_to_replace: word,
      phoneme: phonetic,
      alphabet: 'cmu' as const // CMU pronunciation dictionary format
    }));

    const response = await fetch(`${ELEVENLABS_BASE_URL}/pronunciation-dictionaries/add-from-file`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description: description || `Chromox pronunciation dictionary for ${name}`,
        rules: formattedRules
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] Failed to create pronunciation dictionary:', error);
      return null;
    }

    const data: any = await response.json();
    console.log(`[ElevenLabs] ✅ Pronunciation dictionary created: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('[ElevenLabs] Error creating pronunciation dictionary:', error);
    return null;
  }
}

/**
 * Gets existing pronunciation dictionary by name
 */
export async function getPronunciationDictionary(name: string): Promise<PronunciationDictionary | null> {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'demo-key') {
    return null;
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/pronunciation-dictionaries`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    const dictionaries = data.pronunciation_dictionaries || [];

    return dictionaries.find((d: any) => d.name === name) || null;
  } catch (error) {
    console.error('[ElevenLabs] Error fetching pronunciation dictionaries:', error);
    return null;
  }
}

/**
 * Updates an existing pronunciation dictionary with new rules
 */
export async function updatePronunciationDictionary(
  dictionaryId: string,
  rules: Record<string, string>
): Promise<string> {
  try {
    const formattedRules = Object.entries(rules).map(([word, phonetic]) => ({
      string_to_replace: word,
      phoneme: phonetic,
      alphabet: 'cmu' as const
    }));

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/pronunciation-dictionaries/${dictionaryId}/add-rules`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rules: formattedRules })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] Failed to update pronunciation dictionary:', error);
      return dictionaryId;
    }

    console.log(`[ElevenLabs] ✅ Pronunciation dictionary updated: ${dictionaryId}`);
    return dictionaryId;
  } catch (error) {
    console.error('[ElevenLabs] Error updating pronunciation dictionary:', error);
    return dictionaryId;
  }
}

/**
 * Builds Patois-specific pronunciation dictionary
 */
export async function getOrCreatePatoisDictionary(): Promise<string | null> {
  const patoisRules: Record<string, string> = {
    // Common Patois words
    'mi': 'M IY1',           // "I/me"
    'nuh': 'N AH1',          // "don't"
    'dem': 'D EH1 M',        // "them/they"
    'seh': 'S EH1',          // "say"
    'yuh': 'Y UH1',          // "you"
    'wah': 'W AA1',          // "what"
    'gwaan': 'G W AA1 N',    // "going on"
    'ting': 'T IH1 NG',      // "thing"
    'likkle': 'L IH1 K AH0 L', // "little"
    'bredda': 'B R EH1 D AH0', // "brother"
    'irie': 'AY1 R IY0',     // "good/great"
    'badman': 'B AE1 D M AE2 N', // "badman"
    'gyal': 'G Y AE1 L',     // "girl"
    'cyaa': 'K Y AA1',       // "can't"
    'deh': 'D EH1',          // "there"
    'fi': 'F IY1',           // "to/for"
    'pon': 'P AA1 N',        // "on/upon"
  };

  return createPronunciationDictionary(
    'chromox_patois',
    patoisRules,
    'Jamaican Patois pronunciation rules'
  );
}

/**
 * Builds Nigerian English pronunciation dictionary
 */
export async function getOrCreateNigerianDictionary(): Promise<string | null> {
  const nigerianRules: Record<string, string> = {
    'abi': 'AH1 B IY0',      // "isn't it"
    'oga': 'OW1 G AH0',      // "boss"
    'wahala': 'W AA1 HH AH0 L AH0', // "trouble"
    'shege': 'SH EH1 G EH0', // "problem"
    'ehn': 'EH1 N',          // affirmation
    'sawa': 'S AA1 W AH0',   // "okay"
  };

  return createPronunciationDictionary(
    'chromox_nigerian',
    nigerianRules,
    'Nigerian English pronunciation rules'
  );
}

/**
 * Creates a custom dictionary from phonetic hints
 */
export async function createCustomDictionary(
  accentType: string,
  pronunciationHints: Record<string, string>
): Promise<string | null> {
  if (!pronunciationHints || Object.keys(pronunciationHints).length === 0) {
    return null;
  }

  // Convert simple phonetic hints to CMU format (best effort)
  const cmuRules: Record<string, string> = {};

  for (const [word, hint] of Object.entries(pronunciationHints)) {
    // Simple conversion - you may need to enhance this
    cmuRules[word] = convertToCMU(hint);
  }

  return createPronunciationDictionary(
    `chromox_custom_${accentType}`,
    cmuRules,
    `Custom pronunciation for ${accentType} accent`
  );
}

/**
 * Converts simple phonetic notation to CMU pronunciation format
 * This is a simplified conversion - proper implementation would use a full phonetic engine
 */
function convertToCMU(phonetic: string): string {
  // Simple syllable-based conversion
  const syllables = phonetic.toLowerCase().split('-');

  const cmuMap: Record<string, string> = {
    'mee': 'M IY1',
    'noh': 'N OW1',
    'deh': 'D EH1',
    'ah': 'AH1',
    'oh': 'OW1',
    'ee': 'IY1',
    'oo': 'UW1',
    'ay': 'EY1',
    'eye': 'AY1',
  };

  // Try direct mapping
  if (cmuMap[phonetic.toLowerCase()]) {
    return cmuMap[phonetic.toLowerCase()];
  }

  // Fallback: construct from syllables
  const cmuSyllables = syllables.map((syl, idx) => {
    const stress = idx === 0 ? '1' : '0';
    if (cmuMap[syl]) return cmuMap[syl].replace('1', stress);

    // Very basic fallback
    const vowels = 'aeiou';
    const cmu = syl.toUpperCase().split('').map(char => {
      if (vowels.includes(char.toLowerCase())) {
        return `${char}H${stress}`;
      }
      return char;
    }).join(' ');

    return cmu;
  });

  return cmuSyllables.join(' ');
}

/**
 * Gets appropriate pronunciation dictionary ID based on detected accent
 */
export async function getDictionaryForAccent(
  accentType?: string,
  pronunciationHints?: Record<string, string>
): Promise<string | null> {
  if (!accentType) {
    return null;
  }

  const accent = accentType.toLowerCase();

  // Check for specific accent dictionaries
  if (accent.includes('jamaican') || accent.includes('patois')) {
    return getOrCreatePatoisDictionary();
  }

  if (accent.includes('nigerian')) {
    return getOrCreateNigerianDictionary();
  }

  // Create custom dictionary from hints
  if (pronunciationHints && Object.keys(pronunciationHints).length > 0) {
    return createCustomDictionary(accentType, pronunciationHints);
  }

  return null;
}
