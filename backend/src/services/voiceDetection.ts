import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Voice Detection Service
 * Auto-detects voice type, accent, quality to route to optimal provider
 */

export type VoiceType = 'speech' | 'singing' | 'mixed';

export type AccentCategory =
  | 'neutral'
  | 'african-american'
  | 'jamaican-patois'
  | 'nigerian-pidgin'
  | 'trinidadian'
  | 'ghanaian'
  | 'south-african'
  | 'british-caribbean'
  | 'haitian-creole'
  | 'other-diaspora'
  | 'other';

export type AudioQuality = 'studio' | 'good' | 'acceptable' | 'poor';

export type CloneMode = 'quick' | 'studio' | 'diaspora';

export type DetectionResult = {
  voiceType: VoiceType;
  voiceTypeConfidence: number;
  accent: AccentCategory;
  accentConfidence: number;
  audioQuality: AudioQuality;
  qualityScore: number;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  hasBackgroundNoise: boolean;
  recommendedMode: CloneMode;
  recommendedProvider: string;
  providerSettings: Record<string, any>;
  explanation: string;
};

/**
 * Analyzes audio to detect voice type, accent, and quality
 * Routes to optimal provider based on detection
 */
export async function detectVoiceCharacteristics(audioPath: string): Promise<DetectionResult> {
  console.log(`[VoiceDetection] Analyzing: ${audioPath}`);

  // Run all analyses in parallel
  const [
    audioInfo,
    pitchAnalysis,
    qualityAnalysis
  ] = await Promise.all([
    getAudioInfo(audioPath),
    analyzePitchPatterns(audioPath),
    analyzeAudioQuality(audioPath)
  ]);

  // Detect voice type (speech vs singing)
  const voiceType = detectVoiceType(pitchAnalysis);

  // Detect accent (focus on diaspora accents)
  const accent = await detectAccent(audioPath, pitchAnalysis);

  // Determine recommended mode and provider
  const routing = determineRouting({
    voiceType: voiceType.type,
    accent: accent.category,
    quality: qualityAnalysis.quality,
    duration: audioInfo.duration
  });

  const result: DetectionResult = {
    voiceType: voiceType.type,
    voiceTypeConfidence: voiceType.confidence,
    accent: accent.category,
    accentConfidence: accent.confidence,
    audioQuality: qualityAnalysis.quality,
    qualityScore: qualityAnalysis.score,
    duration: audioInfo.duration,
    sampleRate: audioInfo.sampleRate,
    bitDepth: audioInfo.bitDepth,
    hasBackgroundNoise: qualityAnalysis.hasNoise,
    recommendedMode: routing.mode,
    recommendedProvider: routing.provider,
    providerSettings: routing.settings,
    explanation: routing.explanation
  };

  console.log(`[VoiceDetection] Result:`, {
    voiceType: result.voiceType,
    accent: result.accent,
    quality: result.audioQuality,
    mode: result.recommendedMode,
    provider: result.recommendedProvider
  });

  return result;
}

/**
 * Get basic audio file info
 */
async function getAudioInfo(audioPath: string): Promise<{
  duration: number;
  sampleRate: number;
  bitDepth: number;
}> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,bits_per_sample,duration -of json "${audioPath}"`
    );
    const data = JSON.parse(stdout);
    const stream = data.streams?.[0] || {};

    return {
      duration: parseFloat(stream.duration) || 0,
      sampleRate: parseInt(stream.sample_rate) || 44100,
      bitDepth: parseInt(stream.bits_per_sample) || 16
    };
  } catch (error) {
    console.error('[VoiceDetection] Error getting audio info:', error);
    return { duration: 0, sampleRate: 44100, bitDepth: 16 };
  }
}

/**
 * Analyze pitch patterns to detect speech vs singing
 */
async function analyzePitchPatterns(audioPath: string): Promise<{
  pitchVariance: number;
  sustainedNotes: number;
  pitchRange: number;
  rhythmicRegularity: number;
  averagePitch: number;
}> {
  try {
    // Use FFmpeg to extract audio stats that can indicate singing
    // In production, would use CREPE, YIN, or librosa for proper pitch tracking
    const { stdout } = await execAsync(
      `ffmpeg -i "${audioPath}" -af "asetnsamples=n=1024,astats=metadata=1:reset=1" -f null - 2>&1 | grep -E "(RMS|Peak|Flat)" | head -20`
    );

    // Analyze spectral flatness and dynamics
    // Higher variance and sustained energy patterns indicate singing
    const hasWideRange = stdout.includes('Peak') && !stdout.includes('-inf');

    // Placeholder analysis - in production use ML pitch tracker
    const pitchVariance = hasWideRange ? 0.7 : 0.3;
    const sustainedNotes = hasWideRange ? 5 : 0;
    const pitchRange = hasWideRange ? 300 : 100; // Hz
    const rhythmicRegularity = 0.5;
    const averagePitch = 200; // Hz

    return {
      pitchVariance,
      sustainedNotes,
      pitchRange,
      rhythmicRegularity,
      averagePitch
    };
  } catch (error) {
    console.error('[VoiceDetection] Pitch analysis error:', error);
    return {
      pitchVariance: 0.5,
      sustainedNotes: 0,
      pitchRange: 150,
      rhythmicRegularity: 0.5,
      averagePitch: 200
    };
  }
}

/**
 * Detect voice type based on pitch patterns
 */
function detectVoiceType(pitchAnalysis: {
  pitchVariance: number;
  sustainedNotes: number;
  pitchRange: number;
  rhythmicRegularity: number;
}): { type: VoiceType; confidence: number } {
  const { pitchVariance, sustainedNotes, pitchRange, rhythmicRegularity } = pitchAnalysis;

  // Singing indicators:
  // - High pitch variance with sustained notes
  // - Wide pitch range (> 200Hz typically)
  // - Regular rhythmic patterns

  const singingScore = (
    (pitchRange > 200 ? 0.3 : 0.1) +
    (sustainedNotes > 3 ? 0.3 : 0.1) +
    (pitchVariance > 0.5 ? 0.2 : 0.1) +
    (rhythmicRegularity > 0.6 ? 0.2 : 0.1)
  );

  if (singingScore > 0.7) {
    return { type: 'singing', confidence: singingScore };
  } else if (singingScore > 0.4) {
    return { type: 'mixed', confidence: 0.6 };
  } else {
    return { type: 'speech', confidence: 1 - singingScore };
  }
}

/**
 * Detect accent with focus on African diaspora
 */
async function detectAccent(
  audioPath: string,
  pitchAnalysis: { averagePitch: number; rhythmicRegularity: number }
): Promise<{ category: AccentCategory; confidence: number }> {
  // In production, this would use:
  // - Wav2Vec2 or similar for accent classification
  // - Fine-tuned model on diaspora accents
  // - Prosodic feature analysis (rhythm, stress patterns, tonal features)

  // For now, use heuristics based on prosodic features
  // Diaspora accents often have:
  // - Distinct rhythmic patterns (syllable-timed vs stress-timed)
  // - Tonal features (especially West African influenced)
  // - Specific intonation contours

  // Placeholder - would need ML model for real detection
  // Return neutral with low confidence to indicate detection not yet available
  return {
    category: 'neutral',
    confidence: 0.3
  };
}

/**
 * Analyze audio quality
 */
async function analyzeAudioQuality(audioPath: string): Promise<{
  quality: AudioQuality;
  score: number;
  hasNoise: boolean;
}> {
  try {
    // Analyze signal-to-noise ratio and dynamic range
    const { stdout } = await execAsync(
      `ffmpeg -i "${audioPath}" -af "astats=metadata=1:reset=1" -f null - 2>&1 | grep -E "(RMS|Peak|Noise)" | head -10`
    );

    // Check for common quality indicators
    const hasClipping = stdout.includes('-0.') || stdout.includes('0.0');
    const isQuiet = stdout.includes('-40') || stdout.includes('-50');

    // Estimate quality based on analysis
    let score = 0.7; // Default to "good"
    let hasNoise = false;

    if (hasClipping) {
      score -= 0.3;
    }
    if (isQuiet) {
      score -= 0.2;
      hasNoise = true;
    }

    // Determine quality tier
    let quality: AudioQuality;
    if (score >= 0.8) {
      quality = 'studio';
    } else if (score >= 0.6) {
      quality = 'good';
    } else if (score >= 0.4) {
      quality = 'acceptable';
    } else {
      quality = 'poor';
    }

    return { quality, score, hasNoise };
  } catch (error) {
    console.error('[VoiceDetection] Quality analysis error:', error);
    return { quality: 'acceptable', score: 0.5, hasNoise: false };
  }
}

/**
 * Determine optimal provider and settings based on detection
 */
function determineRouting(params: {
  voiceType: VoiceType;
  accent: AccentCategory;
  quality: AudioQuality;
  duration: number;
}): {
  mode: CloneMode;
  provider: string;
  settings: Record<string, any>;
  explanation: string;
} {
  const { voiceType, accent, quality, duration } = params;

  // Check for diaspora accent - prioritize accent preservation
  const isDiasporaAccent = [
    'jamaican-patois',
    'nigerian-pidgin',
    'trinidadian',
    'ghanaian',
    'south-african',
    'british-caribbean',
    'haitian-creole',
    'african-american',
    'other-diaspora'
  ].includes(accent);

  // Singing with good quality + enough duration -> RVC for best results
  if (voiceType === 'singing' && quality !== 'poor' && duration >= 60) {
    return {
      mode: 'studio',
      provider: 'rvc',
      settings: {
        trainingEpochs: duration >= 300 ? 500 : 200,
        sampleRate: 48000,
        fZeroMethod: 'crepe',
        indexRatio: 0.75
      },
      explanation: `Singing detected with ${Math.round(duration)}s of audio. Using RVC for highest fidelity vocal cloning.`
    };
  }

  // Diaspora accent -> CAMB.AI with accent lock
  if (isDiasporaAccent) {
    return {
      mode: 'diaspora',
      provider: 'camb-ai',
      settings: {
        accentPreserve: true,
        accentBlend: 0, // Keep original accent completely
        similarity: 0.95,
        dialect: accent
      },
      explanation: `Diaspora accent detected (${accent.replace('-', ' ')}). Using accent-preservation mode to maintain authentic voice characteristics.`
    };
  }

  // Short audio or speech -> Quick clone with CAMB.AI
  if (duration < 30 || voiceType === 'speech') {
    return {
      mode: 'quick',
      provider: 'camb-ai',
      settings: {
        model: 'mars8',
        similarity: 0.9,
        speed: 1.0
      },
      explanation: duration < 10
        ? `Quick clone mode - ${Math.round(duration)}s sample detected. CAMB.AI MARS8 can clone from as little as 2.3s.`
        : `Speech detected. Using CAMB.AI for fast, accurate voice cloning.`
    };
  }

  // Mixed content with good duration -> Use ElevenLabs for balanced results
  if (voiceType === 'mixed' && duration >= 30) {
    return {
      mode: 'studio',
      provider: 'elevenlabs',
      settings: {
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5
      },
      explanation: `Mixed speech/singing content detected. Using ElevenLabs for balanced voice reproduction.`
    };
  }

  // Default fallback
  return {
    mode: 'quick',
    provider: 'camb-ai',
    settings: {
      model: 'mars8',
      similarity: 0.85
    },
    explanation: 'Using CAMB.AI MARS8 for voice cloning.'
  };
}

/**
 * Get human-readable label for accent category
 */
export function getAccentLabel(accent: AccentCategory): string {
  const labels: Record<AccentCategory, string> = {
    'neutral': 'Neutral/Standard',
    'african-american': 'African American',
    'jamaican-patois': 'Jamaican Patois',
    'nigerian-pidgin': 'Nigerian Pidgin',
    'trinidadian': 'Trinidadian',
    'ghanaian': 'Ghanaian',
    'south-african': 'South African',
    'british-caribbean': 'British Caribbean',
    'haitian-creole': 'Haitian Creole',
    'other-diaspora': 'Other Diaspora',
    'other': 'Other'
  };
  return labels[accent] || accent;
}

/**
 * Get human-readable label for clone mode
 */
export function getModeLabel(mode: CloneMode): string {
  const labels: Record<CloneMode, string> = {
    'quick': 'Quick Clone',
    'studio': 'Studio Vocal',
    'diaspora': 'Diaspora Voice'
  };
  return labels[mode] || mode;
}
