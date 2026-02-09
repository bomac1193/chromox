/**
 * Provenance Service
 * Handles voice registration with o8 protocol for cryptographic provenance
 */

import crypto from 'crypto';
import fs from 'fs';
import { VoiceProfile } from './voiceAnalysis';
import { AccentCategory, CloneMode, VoiceType } from './voiceDetection';

// o8 API configuration
const O8_API_URL = process.env.O8_API_URL || 'http://localhost:3002/api';

/**
 * Licensing terms for voice usage
 */
export interface LicensingTerms {
  training_rights: boolean;      // Allow AI training on this voice
  derivative_rights: boolean;    // Allow hybrid/blended voices
  commercial_rights: boolean;    // Allow commercial use
  attribution_required: boolean; // Require attribution
  revenue_split: number;         // 0-1 (e.g., 0.4 = 40% to voice actor)
  rate_per_second_cents?: number; // Optional fixed rate per synthesis second
}

/**
 * Voice DNA format for o8 protocol
 */
export interface VoiceDNA {
  source: 'chromox';
  embedding: number[];
  pitch: {
    range: 'bass' | 'baritone' | 'tenor' | 'alto' | 'soprano';
    average_hz: number;
    variance: number;
  };
  timbre: {
    qualities: string[];
    formant_signature: number[];
  };
  speech_patterns: string[];
  rhythmic_quality: string;
  emotional_resonance: string;
  accent_category?: AccentCategory;
  voice_type: VoiceType;
  provider_ids: {
    chromox: string;
    rvc?: string;
    elevenlabs?: string;
    camb_ai?: string;
  };
}

/**
 * o8 CreatorIdentity creation request
 */
export interface CreateIdentityRequest {
  creator: {
    name: string;
    wallet?: string;
    signature?: string;
    verification_level: 'none' | 'basic' | 'enhanced' | 'verified';
  };
  dna: {
    voice: VoiceDNA;
  };
  licensing: LicensingTerms;
  provenance: {
    audio_fingerprint: {
      sha256: string;
      duration_ms: number;
      format: string;
    };
  };
}

/**
 * o8 registration response
 */
export interface ProvenanceRegistration {
  o8_identity_id: string;
  ipfs_cid: string;
  voice_fingerprint: string;
  created_at: string;
}

/**
 * Converts Vòxā pitch range to o8 pitch category
 */
function pitchRangeToCategory(meanHz: number): VoiceDNA['pitch']['range'] {
  if (meanHz < 130) return 'bass';
  if (meanHz < 180) return 'baritone';
  if (meanHz < 260) return 'tenor';
  if (meanHz < 350) return 'alto';
  return 'soprano';
}

/**
 * Converts voice characteristics to timbre qualities
 */
function characteristicsToQualities(characteristics: VoiceProfile['characteristics']): string[] {
  const qualities: string[] = [];

  if (characteristics.brightness > 0.6) qualities.push('bright');
  else if (characteristics.brightness < 0.4) qualities.push('dark');

  if (characteristics.breathiness > 0.5) qualities.push('breathy');
  if (characteristics.breathiness < 0.2) qualities.push('clear');

  if (characteristics.vibratoDepth > 0.4) qualities.push('vibrant');
  if (characteristics.energyMean > 0.7) qualities.push('powerful');
  if (characteristics.energyMean < 0.3) qualities.push('soft');

  // Infer from spectral characteristics
  if (characteristics.spectralCentroid > 3000) qualities.push('crisp');
  if (characteristics.spectralCentroid < 2000) qualities.push('warm');

  return qualities.length > 0 ? qualities : ['neutral'];
}

/**
 * Generates SHA-256 fingerprint of audio file
 */
export async function generateAudioFingerprint(audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(audioPath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Maps Vòxā voice profile to o8 VoiceDNA format
 */
export function mapToVoiceDNA(
  personaId: string,
  voiceProfile: VoiceProfile,
  detection: {
    voiceType: VoiceType;
    accent: AccentCategory;
  }
): VoiceDNA {
  const { characteristics, embedding } = voiceProfile;

  return {
    source: 'chromox',
    embedding: embedding.embedding,
    pitch: {
      range: pitchRangeToCategory(characteristics.pitchRange.mean),
      average_hz: characteristics.pitchRange.mean,
      variance: characteristics.pitchRange.max - characteristics.pitchRange.min,
    },
    timbre: {
      qualities: characteristicsToQualities(characteristics),
      formant_signature: characteristics.formants,
    },
    speech_patterns: detection.accent !== 'neutral' ? [detection.accent] : [],
    rhythmic_quality: characteristics.vibratoRate > 5 ? 'flowing' : 'measured',
    emotional_resonance: characteristics.energyMean > 0.5 ? 'expressive' : 'reserved',
    accent_category: detection.accent,
    voice_type: detection.voiceType,
    provider_ids: {
      chromox: personaId,
    },
  };
}

/**
 * Registers a voice with o8 protocol for cryptographic provenance
 */
export async function registerVoiceProvenance(params: {
  personaId: string;
  personaName: string;
  voiceProfile: VoiceProfile;
  detection: {
    voiceType: VoiceType;
    accent: AccentCategory;
  };
  ownerWallet?: string;
  ownerSignature?: string;
  licensingTerms: LicensingTerms;
}): Promise<ProvenanceRegistration> {
  const {
    personaId,
    personaName,
    voiceProfile,
    detection,
    ownerWallet,
    ownerSignature,
    licensingTerms,
  } = params;

  console.log(`[Provenance] Registering voice: ${personaName} (${personaId})`);

  // Generate audio fingerprint
  const fingerprint = await generateAudioFingerprint(voiceProfile.samplePath);
  console.log(`[Provenance] Audio fingerprint: ${fingerprint.substring(0, 16)}...`);

  // Map to o8 VoiceDNA format
  const voiceDNA = mapToVoiceDNA(personaId, voiceProfile, detection);

  // Build o8 identity request
  const identityRequest: CreateIdentityRequest = {
    creator: {
      name: personaName,
      wallet: ownerWallet,
      signature: ownerSignature,
      verification_level: ownerWallet ? 'basic' : 'none',
    },
    dna: {
      voice: voiceDNA,
    },
    licensing: licensingTerms,
    provenance: {
      audio_fingerprint: {
        sha256: fingerprint,
        duration_ms: Math.round(voiceProfile.sampleDuration * 1000),
        format: 'wav',
      },
    },
  };

  try {
    // Call o8 API to create identity
    const response = await fetch(`${O8_API_URL}/identity/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(identityRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`o8 API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    console.log(`[Provenance] Registered with o8: ${result.identity.identity_id}`);

    return {
      o8_identity_id: result.identity.identity_id,
      ipfs_cid: result.ipfs_cid || '',
      voice_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    // If o8 is not available, create local provenance record
    console.warn(`[Provenance] o8 API unavailable, creating local record:`, error);

    const localId = `o8-local-${crypto.randomBytes(16).toString('hex')}`;

    return {
      o8_identity_id: localId,
      ipfs_cid: '', // Will be populated when o8 syncs
      voice_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
    };
  }
}

/**
 * Fetches license terms from o8 for a registered voice
 */
export async function fetchVoiceLicense(o8IdentityId: string): Promise<LicensingTerms | null> {
  try {
    const response = await fetch(`${O8_API_URL}/identity/${o8IdentityId}`);

    if (!response.ok) {
      console.warn(`[Provenance] Failed to fetch license: ${response.status}`);
      return null;
    }

    const identity = await response.json();
    return identity.licensing as LicensingTerms;
  } catch (error) {
    console.warn(`[Provenance] Error fetching license:`, error);
    return null;
  }
}

/**
 * Validates that a voice can be used for synthesis
 */
export async function validateVoiceUsage(
  o8IdentityId: string,
  action: 'synthesize' | 'train' | 'create_hybrid'
): Promise<{ allowed: boolean; reason: string }> {
  const license = await fetchVoiceLicense(o8IdentityId);

  if (!license) {
    return {
      allowed: false,
      reason: 'No license found for this voice',
    };
  }

  switch (action) {
    case 'synthesize':
      return {
        allowed: license.commercial_rights,
        reason: license.commercial_rights
          ? 'Voice synthesis permitted'
          : 'Commercial use not permitted by license',
      };

    case 'train':
      return {
        allowed: license.training_rights,
        reason: license.training_rights
          ? 'Voice training permitted'
          : 'Training not permitted by license',
      };

    case 'create_hybrid':
      return {
        allowed: license.derivative_rights,
        reason: license.derivative_rights
          ? 'Hybrid voice creation permitted'
          : 'Derivative works not permitted by license',
      };

    default:
      return {
        allowed: false,
        reason: `Unknown action: ${action}`,
      };
  }
}
