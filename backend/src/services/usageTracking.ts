/**
 * Voice Synthesis Usage Tracking Service
 * Records synthesis events for royalty distribution via Imperium
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Usage event for a single voice in a synthesis
 */
export interface VoiceUsageEvent {
  event_id: string;
  timestamp: string;
  persona_id: string;
  o8_identity_id?: string;

  // Synthesis details
  synthesis_type: 'single' | 'hybrid';
  hybrid_fingerprint?: string;
  provider: string;

  // Duration and weight
  duration_seconds: number;
  weight: number; // 1.0 for single, 0-1 for hybrid
  weighted_seconds: number;

  // Cost calculation
  rate_per_second_cents: number;
  total_cents: number;

  // Revenue split info
  revenue_split: number; // Voice actor's percentage
  voice_actor_cents: number;
  platform_cents: number;

  // Content reference
  content_id?: string;
  text_hash: string;

  // Settlement status
  settlement_status: 'pending' | 'included' | 'settled';
  settlement_batch_id?: string;
  imperium_tx_hash?: string;
}

/**
 * Hybrid synthesis usage record
 */
export interface HybridUsageRecord {
  synthesis_id: string;
  timestamp: string;
  hybrid_fingerprint: string;
  provider: string;
  total_duration_seconds: number;
  total_cost_cents: number;
  voice_events: VoiceUsageEvent[];
  text_hash: string;
  content_id?: string;
}

/**
 * Monthly settlement summary
 */
export interface SettlementSummary {
  month: string; // YYYY-MM format
  voice_id: string;
  o8_identity_id?: string;
  total_seconds: number;
  total_events: number;
  total_cents: number;
  voice_actor_cents: number;
  settlement_status: 'pending' | 'ready' | 'submitted' | 'confirmed';
  imperium_batch_id?: string;
}

// In-memory storage (would be database in production)
const usageEvents: VoiceUsageEvent[] = [];
const hybridRecords: HybridUsageRecord[] = [];

// Persistence paths
const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage_events.json');
const HYBRID_FILE = path.join(DATA_DIR, 'hybrid_records.json');

/**
 * Initialize usage tracking storage
 */
export async function initUsageTracking(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const usageData = await fs.readFile(USAGE_FILE, 'utf-8');
    usageEvents.push(...JSON.parse(usageData));
    console.log(`[UsageTracking] Loaded ${usageEvents.length} usage events`);
  } catch {
    // File doesn't exist yet
  }

  try {
    const hybridData = await fs.readFile(HYBRID_FILE, 'utf-8');
    hybridRecords.push(...JSON.parse(hybridData));
    console.log(`[UsageTracking] Loaded ${hybridRecords.length} hybrid records`);
  } catch {
    // File doesn't exist yet
  }
}

/**
 * Persist usage data to disk
 */
async function persistData(): Promise<void> {
  await fs.writeFile(USAGE_FILE, JSON.stringify(usageEvents, null, 2));
  await fs.writeFile(HYBRID_FILE, JSON.stringify(hybridRecords, null, 2));
}

/**
 * Generate a hash of the synthesis text for tracking
 */
function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Records usage for a single voice synthesis
 */
export async function recordSingleUsage(params: {
  personaId: string;
  o8IdentityId?: string;
  provider: string;
  durationSeconds: number;
  ratePerSecondCents?: number;
  revenueSplit?: number;
  text: string;
  contentId?: string;
}): Promise<VoiceUsageEvent> {
  const {
    personaId,
    o8IdentityId,
    provider,
    durationSeconds,
    ratePerSecondCents = 2, // Default $0.02/second
    revenueSplit = 0.4, // Default 40% to voice actor
    text,
    contentId,
  } = params;

  const totalCents = Math.ceil(durationSeconds * ratePerSecondCents);
  const voiceActorCents = Math.floor(totalCents * revenueSplit);
  const platformCents = totalCents - voiceActorCents;

  const event: VoiceUsageEvent = {
    event_id: `usage_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    persona_id: personaId,
    o8_identity_id: o8IdentityId,
    synthesis_type: 'single',
    provider,
    duration_seconds: durationSeconds,
    weight: 1.0,
    weighted_seconds: durationSeconds,
    rate_per_second_cents: ratePerSecondCents,
    total_cents: totalCents,
    revenue_split: revenueSplit,
    voice_actor_cents: voiceActorCents,
    platform_cents: platformCents,
    content_id: contentId,
    text_hash: hashText(text),
    settlement_status: 'pending',
  };

  usageEvents.push(event);
  await persistData();

  console.log(`[UsageTracking] Single usage: ${personaId}, ${durationSeconds}s, ${totalCents}¢`);

  return event;
}

/**
 * Records usage for a hybrid voice synthesis
 */
export async function recordHybridUsage(params: {
  hybridFingerprint: string;
  provider: string;
  totalDurationSeconds: number;
  voices: Array<{
    personaId: string;
    o8IdentityId?: string;
    weight: number;
    ratePerSecondCents?: number;
    revenueSplit?: number;
  }>;
  text: string;
  contentId?: string;
}): Promise<HybridUsageRecord> {
  const {
    hybridFingerprint,
    provider,
    totalDurationSeconds,
    voices,
    text,
    contentId,
  } = params;

  const synthesisId = `hybrid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const timestamp = new Date().toISOString();
  const textHash = hashText(text);

  // Calculate weighted usage per voice
  const totalWeight = voices.reduce((sum, v) => sum + v.weight, 0);
  const voiceEvents: VoiceUsageEvent[] = [];
  let totalCostCents = 0;

  for (const voice of voices) {
    const normalizedWeight = voice.weight / totalWeight;
    const weightedSeconds = totalDurationSeconds * normalizedWeight;
    const ratePerSecondCents = voice.ratePerSecondCents || 2;
    const revenueSplit = voice.revenueSplit || 0.4;
    const totalCents = Math.ceil(weightedSeconds * ratePerSecondCents);
    const voiceActorCents = Math.floor(totalCents * revenueSplit);
    const platformCents = totalCents - voiceActorCents;

    const event: VoiceUsageEvent = {
      event_id: `usage_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp,
      persona_id: voice.personaId,
      o8_identity_id: voice.o8IdentityId,
      synthesis_type: 'hybrid',
      hybrid_fingerprint: hybridFingerprint,
      provider,
      duration_seconds: totalDurationSeconds,
      weight: normalizedWeight,
      weighted_seconds: weightedSeconds,
      rate_per_second_cents: ratePerSecondCents,
      total_cents: totalCents,
      revenue_split: revenueSplit,
      voice_actor_cents: voiceActorCents,
      platform_cents: platformCents,
      content_id: contentId,
      text_hash: textHash,
      settlement_status: 'pending',
    };

    voiceEvents.push(event);
    usageEvents.push(event);
    totalCostCents += totalCents;
  }

  const record: HybridUsageRecord = {
    synthesis_id: synthesisId,
    timestamp,
    hybrid_fingerprint: hybridFingerprint,
    provider,
    total_duration_seconds: totalDurationSeconds,
    total_cost_cents: totalCostCents,
    voice_events: voiceEvents,
    text_hash: textHash,
    content_id: contentId,
  };

  hybridRecords.push(record);
  await persistData();

  console.log(`[UsageTracking] Hybrid usage: ${voices.length} voices, ${totalDurationSeconds}s, ${totalCostCents}¢`);

  return record;
}

/**
 * Gets usage events for a specific voice
 */
export function getVoiceUsage(personaId: string): VoiceUsageEvent[] {
  return usageEvents.filter(e => e.persona_id === personaId);
}

/**
 * Gets pending usage events ready for settlement
 */
export function getPendingSettlements(): VoiceUsageEvent[] {
  return usageEvents.filter(e => e.settlement_status === 'pending');
}

/**
 * Gets settlement summary for a month
 */
export function getMonthlySettlement(month: string): SettlementSummary[] {
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const monthEvents = usageEvents.filter(e => {
    const eventDate = new Date(e.timestamp);
    return eventDate >= monthStart && eventDate < monthEnd;
  });

  // Group by voice
  const byVoice = new Map<string, VoiceUsageEvent[]>();
  for (const event of monthEvents) {
    const key = event.persona_id;
    if (!byVoice.has(key)) {
      byVoice.set(key, []);
    }
    byVoice.get(key)!.push(event);
  }

  // Create summaries
  const summaries: SettlementSummary[] = [];
  for (const [voiceId, events] of byVoice) {
    const totalSeconds = events.reduce((sum, e) => sum + e.weighted_seconds, 0);
    const totalCents = events.reduce((sum, e) => sum + e.total_cents, 0);
    const voiceActorCents = events.reduce((sum, e) => sum + e.voice_actor_cents, 0);
    const allSettled = events.every(e => e.settlement_status === 'settled');
    const anyPending = events.some(e => e.settlement_status === 'pending');

    summaries.push({
      month,
      voice_id: voiceId,
      o8_identity_id: events[0].o8_identity_id,
      total_seconds: totalSeconds,
      total_events: events.length,
      total_cents: totalCents,
      voice_actor_cents: voiceActorCents,
      settlement_status: allSettled ? 'confirmed' : anyPending ? 'pending' : 'ready',
    });
  }

  return summaries;
}

/**
 * Marks events as included in a settlement batch
 */
export async function markEventsForSettlement(
  eventIds: string[],
  batchId: string
): Promise<number> {
  let count = 0;
  for (const event of usageEvents) {
    if (eventIds.includes(event.event_id) && event.settlement_status === 'pending') {
      event.settlement_status = 'included';
      event.settlement_batch_id = batchId;
      count++;
    }
  }
  await persistData();
  return count;
}

/**
 * Marks events as settled with Imperium transaction hash
 */
export async function markEventsSettled(
  batchId: string,
  txHash: string
): Promise<number> {
  let count = 0;
  for (const event of usageEvents) {
    if (event.settlement_batch_id === batchId && event.settlement_status === 'included') {
      event.settlement_status = 'settled';
      event.imperium_tx_hash = txHash;
      count++;
    }
  }
  await persistData();
  return count;
}

/**
 * Gets usage statistics
 */
export function getUsageStats(): {
  totalEvents: number;
  totalSeconds: number;
  totalCents: number;
  pendingEvents: number;
  pendingCents: number;
  settledEvents: number;
  settledCents: number;
} {
  const pending = usageEvents.filter(e => e.settlement_status === 'pending');
  const settled = usageEvents.filter(e => e.settlement_status === 'settled');

  return {
    totalEvents: usageEvents.length,
    totalSeconds: usageEvents.reduce((sum, e) => sum + e.weighted_seconds, 0),
    totalCents: usageEvents.reduce((sum, e) => sum + e.total_cents, 0),
    pendingEvents: pending.length,
    pendingCents: pending.reduce((sum, e) => sum + e.total_cents, 0),
    settledEvents: settled.length,
    settledCents: settled.reduce((sum, e) => sum + e.total_cents, 0),
  };
}

// Initialize on module load
initUsageTracking().catch(console.error);
