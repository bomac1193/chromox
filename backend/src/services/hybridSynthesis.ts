/**
 * Hybrid Voice Synthesis Service
 * Blends multiple voice embeddings and routes to optimal provider
 */

import { findPersona } from './personaStore';
import { VoiceProfile } from './voiceAnalysis';
import { AccentCategory, VoiceType, detectVoiceCharacteristics } from './voiceDetection';
import { validateVoiceUsage, fetchVoiceLicense, LicensingTerms } from './provenanceService';
import { recordHybridUsage } from './usageTracking';

/**
 * Voice component for hybrid synthesis
 */
export interface VoiceComponent {
  personaId: string;
  o8IdentityId?: string;
  weight: number; // 0-1, all weights must sum to 1
}

/**
 * Hybrid synthesis request
 */
export interface HybridSynthesisRequest {
  voices: VoiceComponent[];
  text: string;
  accentLock?: AccentCategory; // Lock to specific accent
  routingMode: 'auto' | 'rvc' | 'camb-ai' | 'elevenlabs';
  emotion?: string;
  styleHints?: {
    energy?: number;
    clarity?: number;
    warmth?: number;
  };
}

/**
 * Usage breakdown per voice for royalty tracking
 */
export interface VoiceUsageBreakdown {
  personaId: string;
  o8IdentityId?: string;
  weight: number;
  secondsUsed: number;
  ratePerSecondCents: number;
  totalCents: number;
  licensing?: LicensingTerms;
}

/**
 * Hybrid synthesis result
 */
export interface HybridSynthesisResult {
  audioUrl: string;
  audioPath: string;
  durationSeconds: number;
  provider: string;
  usageBreakdown: VoiceUsageBreakdown[];
  totalCostCents: number;
  provenance: {
    hybridFingerprint: string;
    voiceIds: string[];
    weights: number[];
  };
}

/**
 * Blended voice profile from multiple sources
 */
interface BlendedVoiceProfile {
  embedding: number[];
  characteristics: {
    pitchRange: { min: number; max: number; mean: number };
    brightness: number;
    breathiness: number;
    vibratoRate: number;
  };
  dominantAccent?: AccentCategory;
  dominantVoiceType: VoiceType;
  sourceProfiles: Array<{
    personaId: string;
    weight: number;
    profile: VoiceProfile;
  }>;
}

/**
 * Validates all voices in the hybrid request have proper licensing
 */
export async function validateHybridLicenses(
  voices: VoiceComponent[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const voice of voices) {
    if (voice.o8IdentityId) {
      const result = await validateVoiceUsage(voice.o8IdentityId, 'create_hybrid');
      if (!result.allowed) {
        errors.push(`Voice ${voice.personaId}: ${result.reason}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Blends multiple voice embeddings with weights
 */
function blendEmbeddings(
  profiles: Array<{ embedding: number[]; weight: number }>
): number[] {
  if (profiles.length === 0) {
    throw new Error('No profiles to blend');
  }

  if (profiles.length === 1) {
    return profiles[0].embedding;
  }

  const embeddingLength = profiles[0].embedding.length;
  const blended = new Array(embeddingLength).fill(0);

  for (const { embedding, weight } of profiles) {
    for (let i = 0; i < embeddingLength; i++) {
      blended[i] += embedding[i] * weight;
    }
  }

  // Normalize the blended embedding
  const magnitude = Math.sqrt(blended.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embeddingLength; i++) {
      blended[i] /= magnitude;
    }
  }

  return blended;
}

/**
 * Blends voice characteristics with weights
 */
function blendCharacteristics(
  profiles: Array<{
    characteristics: VoiceProfile['characteristics'];
    weight: number;
  }>
): BlendedVoiceProfile['characteristics'] {
  let pitchMin = 0, pitchMax = 0, pitchMean = 0;
  let brightness = 0, breathiness = 0, vibratoRate = 0;

  for (const { characteristics, weight } of profiles) {
    pitchMin += characteristics.pitchRange.min * weight;
    pitchMax += characteristics.pitchRange.max * weight;
    pitchMean += characteristics.pitchRange.mean * weight;
    brightness += characteristics.brightness * weight;
    breathiness += characteristics.breathiness * weight;
    vibratoRate += characteristics.vibratoRate * weight;
  }

  return {
    pitchRange: { min: pitchMin, max: pitchMax, mean: pitchMean },
    brightness,
    breathiness,
    vibratoRate,
  };
}

/**
 * Creates a blended voice profile from multiple personas
 */
export async function createBlendedProfile(
  voices: VoiceComponent[],
  accentLock?: AccentCategory
): Promise<BlendedVoiceProfile> {
  // Normalize weights to sum to 1
  const totalWeight = voices.reduce((sum, v) => sum + v.weight, 0);
  const normalizedVoices = voices.map(v => ({
    ...v,
    weight: v.weight / totalWeight,
  }));

  // Fetch all persona profiles
  const sourceProfiles: BlendedVoiceProfile['sourceProfiles'] = [];
  const embeddingProfiles: Array<{ embedding: number[]; weight: number }> = [];
  const characteristicProfiles: Array<{
    characteristics: VoiceProfile['characteristics'];
    weight: number;
  }> = [];

  let dominantAccent: AccentCategory | undefined;
  let dominantWeight = 0;
  let singingWeight = 0;
  let speechWeight = 0;

  for (const voice of normalizedVoices) {
    const persona = findPersona(voice.personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${voice.personaId}`);
    }

    if (!persona.voice_profile) {
      throw new Error(`Persona has no voice profile: ${voice.personaId}`);
    }

    sourceProfiles.push({
      personaId: voice.personaId,
      weight: voice.weight,
      profile: persona.voice_profile,
    });

    embeddingProfiles.push({
      embedding: persona.voice_profile.embedding.embedding,
      weight: voice.weight,
    });

    characteristicProfiles.push({
      characteristics: persona.voice_profile.characteristics,
      weight: voice.weight,
    });

    // Track dominant accent
    const detection = persona.clone_detection;
    if (detection?.accent && voice.weight > dominantWeight) {
      dominantAccent = detection.accent as AccentCategory;
      dominantWeight = voice.weight;
    }

    // Track voice type weights
    if (detection?.voiceType === 'singing') {
      singingWeight += voice.weight;
    } else {
      speechWeight += voice.weight;
    }
  }

  // Use accent lock if specified
  if (accentLock) {
    dominantAccent = accentLock;
  }

  // Determine dominant voice type
  const dominantVoiceType: VoiceType = singingWeight > speechWeight ? 'singing' : 'speech';

  return {
    embedding: blendEmbeddings(embeddingProfiles),
    characteristics: blendCharacteristics(characteristicProfiles),
    dominantAccent,
    dominantVoiceType,
    sourceProfiles,
  };
}

/**
 * Determines optimal provider based on blended profile
 */
export function determineOptimalProvider(
  blendedProfile: BlendedVoiceProfile,
  routingMode: HybridSynthesisRequest['routingMode']
): string {
  if (routingMode !== 'auto') {
    return routingMode;
  }

  // Singing-dominant → RVC for best vocal fidelity
  if (blendedProfile.dominantVoiceType === 'singing') {
    return 'rvc';
  }

  // Diaspora accent → CAMB.AI with accent preservation
  const diasporaAccents: AccentCategory[] = [
    'jamaican-patois',
    'nigerian-pidgin',
    'trinidadian',
    'ghanaian',
    'south-african',
    'british-caribbean',
    'haitian-creole',
    'african-american',
    'other-diaspora',
  ];

  if (blendedProfile.dominantAccent && diasporaAccents.includes(blendedProfile.dominantAccent)) {
    return 'camb-ai';
  }

  // Default to CAMB.AI for general speech
  return 'camb-ai';
}

/**
 * Calculates usage breakdown for royalty tracking
 */
export async function calculateUsageBreakdown(
  voices: VoiceComponent[],
  durationSeconds: number
): Promise<VoiceUsageBreakdown[]> {
  const breakdown: VoiceUsageBreakdown[] = [];

  // Normalize weights
  const totalWeight = voices.reduce((sum, v) => sum + v.weight, 0);

  for (const voice of voices) {
    const normalizedWeight = voice.weight / totalWeight;
    const secondsUsed = durationSeconds * normalizedWeight;

    // Fetch licensing terms if available
    let licensing: LicensingTerms | undefined;
    let ratePerSecondCents = 2; // Default rate: $0.02/second

    if (voice.o8IdentityId) {
      licensing = await fetchVoiceLicense(voice.o8IdentityId) || undefined;
      if (licensing?.rate_per_second_cents) {
        ratePerSecondCents = licensing.rate_per_second_cents;
      }
    }

    breakdown.push({
      personaId: voice.personaId,
      o8IdentityId: voice.o8IdentityId,
      weight: normalizedWeight,
      secondsUsed,
      ratePerSecondCents,
      totalCents: Math.ceil(secondsUsed * ratePerSecondCents),
      licensing,
    });
  }

  return breakdown;
}

/**
 * Generates a fingerprint for the hybrid voice
 */
function generateHybridFingerprint(
  blendedEmbedding: number[],
  voiceIds: string[]
): string {
  const crypto = require('crypto');
  const data = JSON.stringify({ embedding: blendedEmbedding.slice(0, 32), voiceIds });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Synthesizes audio using the hybrid voice profile
 * This is a placeholder - actual synthesis would call the provider APIs
 */
export async function synthesizeHybrid(
  request: HybridSynthesisRequest
): Promise<HybridSynthesisResult> {
  console.log(`[HybridSynthesis] Starting synthesis with ${request.voices.length} voices`);

  // Validate licenses
  const licenseValidation = await validateHybridLicenses(request.voices);
  if (!licenseValidation.valid) {
    throw new Error(`License validation failed: ${licenseValidation.errors.join(', ')}`);
  }

  // Create blended profile
  const blendedProfile = await createBlendedProfile(request.voices, request.accentLock);

  // Determine provider
  const provider = determineOptimalProvider(blendedProfile, request.routingMode);
  console.log(`[HybridSynthesis] Using provider: ${provider}`);

  // Estimate duration based on text length
  const words = request.text.split(/\s+/).length;
  const wordsPerMinute = 150;
  const durationSeconds = Math.ceil((words / wordsPerMinute) * 60);

  // Calculate usage breakdown
  const usageBreakdown = await calculateUsageBreakdown(request.voices, durationSeconds);
  const totalCostCents = usageBreakdown.reduce((sum, u) => sum + u.totalCents, 0);

  // Generate provenance data
  const voiceIds = request.voices.map(v => v.personaId);
  const weights = request.voices.map(v => v.weight);
  const hybridFingerprint = generateHybridFingerprint(blendedProfile.embedding, voiceIds);

  // TODO: Actually call provider API with blended profile
  // For now, return placeholder result
  const timestamp = Date.now();
  const audioPath = `/tmp/hybrid_${timestamp}.mp3`;
  const audioUrl = `/api/audio/hybrid_${timestamp}.mp3`;

  // Record usage for royalty tracking
  await recordHybridUsage({
    hybridFingerprint,
    provider,
    totalDurationSeconds: durationSeconds,
    voices: usageBreakdown.map(u => ({
      personaId: u.personaId,
      o8IdentityId: u.o8IdentityId,
      weight: u.weight,
      ratePerSecondCents: u.ratePerSecondCents,
      revenueSplit: u.licensing?.revenue_split,
    })),
    text: request.text,
  });

  console.log(`[HybridSynthesis] Complete. Duration: ${durationSeconds}s, Cost: ${totalCostCents}¢`);

  return {
    audioUrl,
    audioPath,
    durationSeconds,
    provider,
    usageBreakdown,
    totalCostCents,
    provenance: {
      hybridFingerprint,
      voiceIds,
      weights,
    },
  };
}
