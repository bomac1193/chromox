import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type VoiceCharacteristics = {
  pitchRange: { min: number; max: number; mean: number };
  formants: number[]; // F1, F2, F3 formant frequencies
  spectralCentroid: number;
  spectralRolloff: number;
  breathiness: number;
  brightness: number;
  timbre: number[];
  vibratoRate: number;
  vibratoDepth: number;
  energyMean: number;
};

export type VoiceEmbedding = {
  embedding: number[]; // 256-dim voice embedding vector
  provider: 'openai' | 'rvc' | 'elevenlabs' | 'chromox';
  modelVersion: string;
};

export type VoiceProfile = {
  characteristics: VoiceCharacteristics;
  embedding: VoiceEmbedding;
  samplePath: string; // Reference audio sample for cloning
  sampleDuration: number;
  analysisTimestamp: string;
};

/**
 * Analyzes a vocal stem and extracts voice characteristics and embeddings.
 * Uses a combination of DSP analysis and ML-based voice embedding extraction.
 */
export async function analyzeVoiceFromStem(stemPath: string): Promise<VoiceProfile> {
  console.log(`[VoiceAnalysis] Analyzing vocal stem: ${stemPath}`);

  // Extract audio features using FFmpeg and custom DSP
  const characteristics = await extractVoiceCharacteristics(stemPath);

  // Generate voice embedding using the best available provider
  const embedding = await generateVoiceEmbedding(stemPath);

  // Get audio duration
  const duration = await getAudioDuration(stemPath);

  // Copy sample to voice profiles directory
  const profilesDir = path.join(process.cwd(), 'voice_profiles');
  fs.mkdirSync(profilesDir, { recursive: true });

  const sampleFileName = `sample_${Date.now()}.wav`;
  const samplePath = path.join(profilesDir, sampleFileName);
  fs.copyFileSync(stemPath, samplePath);

  return {
    characteristics,
    embedding,
    samplePath,
    sampleDuration: duration,
    analysisTimestamp: new Date().toISOString()
  };
}

/**
 * Extracts voice characteristics using DSP and spectral analysis.
 */
async function extractVoiceCharacteristics(stemPath: string): Promise<VoiceCharacteristics> {
  // For now, we'll use FFmpeg for basic analysis
  // In production, this would use librosa, praat, or custom DSP

  try {
    // Extract spectral stats using FFmpeg's astats and metadata
    const { stdout } = await execAsync(
      `ffmpeg -i "${stemPath}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1`
    );

    // Parse pitch range (placeholder - would use CREPE or YIN algorithm)
    const pitchRange = { min: 80, max: 400, mean: 200 };

    // Estimate formants (placeholder - would use LPC analysis)
    const formants = [700, 1220, 2600]; // Typical formants for vowel 'a'

    // Calculate spectral features (placeholder)
    const spectralCentroid = 2500;
    const spectralRolloff = 6000;

    // Estimate voice qualities from energy and spectral shape
    const breathiness = 0.3;
    const brightness = 0.6;

    // Timbre vector (placeholder - would use MFCCs or spectral envelope)
    const timbre = Array.from({ length: 13 }, () => Math.random());

    // Vibrato analysis (placeholder - would use autocorrelation)
    const vibratoRate = 5.5; // Hz
    const vibratoDepth = 0.3;

    // Energy analysis
    const energyMean = 0.5;

    return {
      pitchRange,
      formants,
      spectralCentroid,
      spectralRolloff,
      breathiness,
      brightness,
      timbre,
      vibratoRate,
      vibratoDepth,
      energyMean
    };
  } catch (error) {
    console.error('[VoiceAnalysis] Error extracting characteristics:', error);
    // Return default characteristics if analysis fails
    return {
      pitchRange: { min: 80, max: 400, mean: 200 },
      formants: [700, 1220, 2600],
      spectralCentroid: 2500,
      spectralRolloff: 6000,
      breathiness: 0.5,
      brightness: 0.5,
      timbre: Array.from({ length: 13 }, () => 0.5),
      vibratoRate: 5.5,
      vibratoDepth: 0.3,
      energyMean: 0.5
    };
  }
}

/**
 * Generates a voice embedding vector for voice cloning.
 * This is the core "persona lock" that captures the unique voice signature.
 */
async function generateVoiceEmbedding(stemPath: string): Promise<VoiceEmbedding> {
  // In production, this would call:
  // - OpenAI's speech API for voice analysis
  // - RVC training to create voice model
  // - ElevenLabs voice cloning API
  // - Or a local embedding model like Resemblyzer

  console.log('[VoiceAnalysis] Generating voice embedding...');

  // Placeholder: Generate a random 256-dim embedding
  // In production, this would be a neural network that extracts voice features
  const embedding = Array.from({ length: 256 }, () => Math.random() * 2 - 1);

  return {
    embedding,
    provider: 'chromox',
    modelVersion: '1.0.0'
  };
}

/**
 * Gets the duration of an audio file in seconds.
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('[VoiceAnalysis] Error getting duration:', error);
    return 0;
  }
}

/**
 * Converts voice characteristics to StyleControls for rendering.
 */
export function characteristicsToStyleControls(characteristics: VoiceCharacteristics) {
  return {
    brightness: Math.min(1, characteristics.brightness),
    breathiness: Math.min(1, characteristics.breathiness),
    energy: Math.min(1, characteristics.energyMean),
    formant: (characteristics.formants[0] - 500) / 1000, // Normalize around 500-1500Hz
    vibratoDepth: Math.min(1, characteristics.vibratoDepth),
    vibratoRate: Math.min(1, characteristics.vibratoRate / 10),
    roboticism: 0.0,
    glitch: 0.0,
    stereoWidth: 0.5
  };
}

/**
 * Saves a voice profile to disk for persistence.
 */
export function saveVoiceProfile(personaId: string, profile: VoiceProfile): void {
  const profilesDir = path.join(process.cwd(), 'voice_profiles');
  fs.mkdirSync(profilesDir, { recursive: true });

  const profilePath = path.join(profilesDir, `${personaId}.json`);
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

  console.log(`[VoiceAnalysis] Saved voice profile: ${profilePath}`);
}

/**
 * Loads a voice profile from disk.
 */
export function loadVoiceProfile(personaId: string): VoiceProfile | null {
  const profilePath = path.join(process.cwd(), 'voice_profiles', `${personaId}.json`);

  if (!fs.existsSync(profilePath)) {
    return null;
  }

  const data = fs.readFileSync(profilePath, 'utf-8');
  return JSON.parse(data) as VoiceProfile;
}
