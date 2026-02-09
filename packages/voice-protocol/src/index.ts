/**
 * @chromox/voice-protocol
 * Shared types for Voice Royalty Protocol
 * Used across Vòxā, o8, Boveda, and Imperium
 */

// ============================================================================
// Voice DNA Types (o8 Protocol)
// ============================================================================

/**
 * Pitch range classification
 */
export type PitchRange = 'bass' | 'baritone' | 'tenor' | 'alto' | 'soprano';

/**
 * Voice type classification
 */
export type VoiceType = 'speech' | 'singing' | 'mixed';

/**
 * Accent categories with diaspora support
 */
export type AccentCategory =
  | 'neutral'
  | 'american'
  | 'british'
  | 'australian'
  | 'jamaican-patois'
  | 'nigerian-pidgin'
  | 'trinidadian'
  | 'ghanaian'
  | 'south-african'
  | 'british-caribbean'
  | 'haitian-creole'
  | 'african-american'
  | 'other-diaspora'
  | 'other';

/**
 * Voice DNA from o8 Protocol
 * Cryptographic identity for a voice
 */
export interface VoiceDNA {
  source: 'chromox' | 'external';
  embedding: number[];
  pitch: {
    range: PitchRange;
    average_hz: number;
    variance: number;
  };
  timbre: {
    qualities: string[];
    formant_signature: number[];
  };
  speech_patterns: string[];
  accent_category?: AccentCategory;
  voice_type: VoiceType;
  provider_ids: {
    chromox?: string;
    rvc?: string;
    elevenlabs?: string;
    camb_ai?: string;
  };
}

// ============================================================================
// Licensing Types
// ============================================================================

/**
 * License type classification
 */
export type LicenseType = 'exclusive' | 'non-exclusive' | 'revshare';

/**
 * Verification level for voice owners
 */
export type VerificationLevel = 'none' | 'basic' | 'enhanced' | 'verified';

/**
 * Licensing terms from o8 Protocol
 */
export interface LicensingTerms {
  training_rights: boolean;
  derivative_rights: boolean;
  commercial_rights: boolean;
  attribution_required: boolean;
  revenue_split: number; // 0-1, percentage to voice actor
  rate_per_second_cents?: number | null;
  license_type?: LicenseType;
  expires_at?: string;
}

/**
 * Royalty split configuration
 */
export interface RoyaltySplits {
  voice_actor: number; // Percentage (0-100)
  creator: number;
  platform: number;
}

// ============================================================================
// o8 Identity Types
// ============================================================================

/**
 * Creator information
 */
export interface CreatorInfo {
  name: string;
  wallet?: string;
  verification_level: VerificationLevel;
}

/**
 * Audio provenance fingerprint
 */
export interface AudioFingerprint {
  sha256: string;
  duration_ms: number;
  format: string;
}

/**
 * Full o8 Identity
 */
export interface O8Identity {
  identity_id: string;
  version: string;
  created_at: string;
  updated_at: string;
  creator: CreatorInfo;
  dna: {
    voice?: VoiceDNA;
    audio?: unknown;
    visual?: unknown;
  };
  licensing: LicensingTerms;
  provenance: {
    audio_fingerprint?: AudioFingerprint;
    ipfs_cid?: string;
  };
  provider_refs?: {
    chromox_persona_id?: string;
    boveda_genome_id?: string;
  };
}

// ============================================================================
// Synthesis Types
// ============================================================================

/**
 * Voice provider options
 */
export type VoiceProvider = 'chromox' | 'rvc' | 'camb-ai' | 'elevenlabs' | 'fish-audio' | 'kits-ai';

/**
 * Clone mode based on voice characteristics
 */
export type CloneMode = 'quick' | 'studio' | 'diaspora';

/**
 * Voice component for hybrid synthesis
 */
export interface VoiceComponent {
  persona_id: string;
  o8_identity_id?: string;
  weight: number; // 0-1
}

/**
 * Style controls for synthesis
 */
export interface StyleControls {
  stability?: number;
  similarity_boost?: number;
  energy?: number;
  clarity?: number;
  warmth?: number;
}

/**
 * Prosody hints for synthesis
 */
export interface ProsodyHints {
  rhythm?: 'stress-timed' | 'syllable-timed' | 'mora-timed';
  intonation?: 'flat' | 'melodic' | 'expressive';
  tempo?: 'slow' | 'moderate' | 'fast';
}

/**
 * Hybrid synthesis request
 */
export interface HybridSynthesisRequest {
  voices: VoiceComponent[];
  text: string;
  accent_lock?: AccentCategory;
  routing_mode: 'auto' | VoiceProvider;
  emotion?: string;
  style_hints?: StyleControls;
  prosody_hints?: ProsodyHints;
}

/**
 * Voice usage breakdown for royalty tracking
 */
export interface VoiceUsageBreakdown {
  persona_id: string;
  o8_identity_id?: string;
  weight: number;
  seconds_used: number;
  rate_per_second_cents: number;
  total_cents: number;
  licensing?: LicensingTerms;
}

/**
 * Hybrid synthesis result
 */
export interface HybridSynthesisResult {
  audio_url: string;
  audio_path: string;
  duration_seconds: number;
  provider: VoiceProvider;
  usage_breakdown: VoiceUsageBreakdown[];
  total_cost_cents: number;
  provenance: {
    hybrid_fingerprint: string;
    voice_ids: string[];
    weights: number[];
  };
}

// ============================================================================
// Usage Tracking Types
// ============================================================================

/**
 * Synthesis type classification
 */
export type SynthesisType = 'single' | 'hybrid';

/**
 * Settlement status
 */
export type SettlementStatus = 'pending' | 'included' | 'settled';

/**
 * Voice usage event for royalty tracking
 */
export interface VoiceUsageEvent {
  event_id: string;
  timestamp: string;
  persona_id: string;
  o8_identity_id?: string;
  synthesis_type: SynthesisType;
  hybrid_fingerprint?: string;
  provider: string;
  duration_seconds: number;
  weight: number;
  weighted_seconds: number;
  rate_per_second_cents: number;
  total_cents: number;
  revenue_split: number;
  voice_actor_cents: number;
  platform_cents: number;
  content_id?: string;
  text_hash: string;
  settlement_status: SettlementStatus;
  settlement_batch_id?: string;
  imperium_tx_hash?: string;
}

/**
 * Monthly settlement summary
 */
export interface SettlementSummary {
  month: string; // YYYY-MM
  voice_id: string;
  o8_identity_id?: string;
  total_seconds: number;
  total_events: number;
  total_cents: number;
  voice_actor_cents: number;
  settlement_status: 'pending' | 'ready' | 'submitted' | 'confirmed';
  imperium_batch_id?: string;
}

// ============================================================================
// Imperium Integration Types
// ============================================================================

/**
 * Recipient for on-chain royalty distribution
 */
export interface ImperiumRecipient {
  voice_id: string;
  o8_identity_id?: string;
  wallet_address?: string;
  amount_cents: number;
  amount_basis_points: number; // 1 cent = 100 basis points
}

/**
 * Imperium settlement payload
 */
export interface ImperiumPayload {
  version: string;
  type: 'voice_royalty_distribution';
  timestamp: string;
  event_count: number;
  recipient_count: number;
  total_amount_cents: number;
  total_amount_basis_points: number;
  recipients: ImperiumRecipient[];
}

/**
 * Imperium transaction result
 */
export interface ImperiumTransactionResult {
  tx_hash: string;
  block_number: number;
  status: 'pending' | 'confirmed' | 'failed';
  recipients_paid: number;
  total_distributed_cents: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Voice usage action types
 */
export type VoiceUsageAction = 'synthesize' | 'train' | 'create_hybrid';

/**
 * Validation result
 */
export interface ValidationResult {
  allowed: boolean;
  reason: string;
  licensing?: LicensingTerms;
}

// ============================================================================
// Provenance Types
// ============================================================================

/**
 * Voice provenance registration result
 */
export interface ProvenanceRegistration {
  o8_identity_id: string;
  voice_fingerprint: string;
  voice_dna: VoiceDNA;
  ipfs_cid?: string;
  registered_at: string;
}

/**
 * Clone detection result
 */
export interface CloneDetection {
  voice_type: VoiceType;
  accent: AccentCategory;
  accent_label: string;
  quality: 'low' | 'medium' | 'high' | 'excellent';
  duration: number;
  recommended_mode: CloneMode;
  recommended_provider: VoiceProvider;
  explanation: string;
  provider_settings?: Record<string, unknown>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Register provenance request
 */
export interface RegisterProvenanceRequest {
  persona_id: string;
  owner_wallet?: string;
  owner_signature?: string;
  licensing_terms?: Partial<LicensingTerms>;
}

/**
 * Validate usage request
 */
export interface ValidateUsageRequest {
  o8_identity_id: string;
  action: VoiceUsageAction;
}

/**
 * Prepare settlement batch request
 */
export interface PrepareSettlementRequest {
  event_ids: string[];
}

/**
 * Confirm settlement request
 */
export interface ConfirmSettlementRequest {
  batch_id: string;
  tx_hash: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default licensing terms
 */
export const DEFAULT_LICENSING_TERMS: LicensingTerms = {
  training_rights: false,
  derivative_rights: true,
  commercial_rights: true,
  attribution_required: true,
  revenue_split: 0.4, // 40% to voice actor
  rate_per_second_cents: 2, // $0.02 per second
};

/**
 * Default royalty splits
 */
export const DEFAULT_ROYALTY_SPLITS: RoyaltySplits = {
  voice_actor: 40,
  creator: 40,
  platform: 20,
};

/**
 * Diaspora accent categories
 */
export const DIASPORA_ACCENTS: AccentCategory[] = [
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

/**
 * Protocol version
 */
export const VOICE_PROTOCOL_VERSION = '1.0.0';
