/**
 * Usage Tracking API Routes
 * Exposes synthesis usage data for royalty settlement
 */

import { Router } from 'express';
import {
  getVoiceUsage,
  getPendingSettlements,
  getMonthlySettlement,
  getUsageStats,
  markEventsForSettlement,
  markEventsSettled,
} from '../services/usageTracking';

const router = Router();

/**
 * GET /api/usage/stats
 * Get overall usage statistics
 */
router.get('/stats', async (_req, res) => {
  try {
    const stats = getUsageStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Usage] Stats failed:', error);
    res.status(500).json({
      error: 'Failed to get usage stats',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/usage/voice/:personaId
 * Get usage events for a specific voice
 */
router.get('/voice/:personaId', async (req, res) => {
  try {
    const { personaId } = req.params;
    const events = getVoiceUsage(personaId);

    res.json({
      success: true,
      persona_id: personaId,
      event_count: events.length,
      events,
    });
  } catch (error) {
    console.error('[Usage] Voice usage failed:', error);
    res.status(500).json({
      error: 'Failed to get voice usage',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/usage/pending
 * Get all pending settlement events
 */
router.get('/pending', async (_req, res) => {
  try {
    const events = getPendingSettlements();

    // Group by voice for summary
    const byVoice = new Map<string, { count: number; cents: number }>();
    for (const event of events) {
      const key = event.persona_id;
      if (!byVoice.has(key)) {
        byVoice.set(key, { count: 0, cents: 0 });
      }
      const entry = byVoice.get(key)!;
      entry.count++;
      entry.cents += event.voice_actor_cents;
    }

    res.json({
      success: true,
      total_events: events.length,
      total_cents: events.reduce((sum, e) => sum + e.total_cents, 0),
      voice_summary: Object.fromEntries(byVoice),
      events,
    });
  } catch (error) {
    console.error('[Usage] Pending settlements failed:', error);
    res.status(500).json({
      error: 'Failed to get pending settlements',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/usage/settlement/:month
 * Get settlement summary for a month (YYYY-MM format)
 */
router.get('/settlement/:month', async (req, res) => {
  try {
    const { month } = req.params;

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM',
      });
    }

    const summaries = getMonthlySettlement(month);
    const totalCents = summaries.reduce((sum, s) => sum + s.total_cents, 0);
    const voiceActorCents = summaries.reduce((sum, s) => sum + s.voice_actor_cents, 0);

    res.json({
      success: true,
      month,
      voice_count: summaries.length,
      total_cents: totalCents,
      voice_actor_cents: voiceActorCents,
      platform_cents: totalCents - voiceActorCents,
      summaries,
    });
  } catch (error) {
    console.error('[Usage] Monthly settlement failed:', error);
    res.status(500).json({
      error: 'Failed to get monthly settlement',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/usage/prepare-batch
 * Prepare a settlement batch for Imperium submission
 */
router.post('/prepare-batch', async (req, res) => {
  try {
    const { event_ids } = req.body;

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      return res.status(400).json({
        error: 'event_ids array is required',
      });
    }

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Mark events for settlement
    const count = await markEventsForSettlement(event_ids, batchId);

    if (count === 0) {
      return res.status(400).json({
        error: 'No pending events found with the provided IDs',
      });
    }

    res.json({
      success: true,
      batch_id: batchId,
      events_included: count,
      message: `Prepared batch ${batchId} with ${count} events`,
    });
  } catch (error) {
    console.error('[Usage] Prepare batch failed:', error);
    res.status(500).json({
      error: 'Failed to prepare settlement batch',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/usage/confirm-settlement
 * Confirm settlement after Imperium transaction
 */
router.post('/confirm-settlement', async (req, res) => {
  try {
    const { batch_id, tx_hash } = req.body;

    if (!batch_id) {
      return res.status(400).json({ error: 'batch_id is required' });
    }

    if (!tx_hash) {
      return res.status(400).json({ error: 'tx_hash is required' });
    }

    const count = await markEventsSettled(batch_id, tx_hash);

    if (count === 0) {
      return res.status(404).json({
        error: 'No events found for this batch',
      });
    }

    res.json({
      success: true,
      batch_id,
      tx_hash,
      events_settled: count,
      message: `Settled ${count} events with tx ${tx_hash}`,
    });
  } catch (error) {
    console.error('[Usage] Confirm settlement failed:', error);
    res.status(500).json({
      error: 'Failed to confirm settlement',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/usage/imperium-payload
 * Generate payload for Imperium smart contract submission
 * This formats the data for on-chain royalty distribution
 */
router.post('/imperium-payload', async (req, res) => {
  try {
    const { batch_id, month } = req.body;

    let events;
    if (batch_id) {
      // Get events from a specific batch
      events = getPendingSettlements().filter(
        e => e.settlement_batch_id === batch_id
      );
    } else if (month) {
      // Get all events from a month
      const summaries = getMonthlySettlement(month);
      const voiceIds = summaries.map(s => s.voice_id);
      events = getPendingSettlements().filter(
        e => voiceIds.includes(e.persona_id)
      );
    } else {
      return res.status(400).json({
        error: 'Either batch_id or month is required',
      });
    }

    if (events.length === 0) {
      return res.status(404).json({
        error: 'No events found for the specified criteria',
      });
    }

    // Aggregate by voice for on-chain submission
    const byVoice = new Map<string, {
      o8_identity_id?: string;
      wallet?: string;
      total_cents: number;
      voice_actor_cents: number;
    }>();

    for (const event of events) {
      const key = event.persona_id;
      if (!byVoice.has(key)) {
        byVoice.set(key, {
          o8_identity_id: event.o8_identity_id,
          total_cents: 0,
          voice_actor_cents: 0,
        });
      }
      const entry = byVoice.get(key)!;
      entry.total_cents += event.total_cents;
      entry.voice_actor_cents += event.voice_actor_cents;
    }

    // Convert to Imperium contract format
    // Amounts in basis points (1/100 of a cent = 1/10000 of a dollar)
    const recipients = Array.from(byVoice.entries()).map(([voiceId, data]) => ({
      voice_id: voiceId,
      o8_identity_id: data.o8_identity_id,
      amount_cents: data.voice_actor_cents,
      amount_basis_points: data.voice_actor_cents * 100, // Convert cents to basis points
    }));

    const totalAmountCents = recipients.reduce((sum, r) => sum + r.amount_cents, 0);

    res.json({
      success: true,
      imperium_payload: {
        version: '1.0',
        type: 'voice_royalty_distribution',
        timestamp: new Date().toISOString(),
        event_count: events.length,
        recipient_count: recipients.length,
        total_amount_cents: totalAmountCents,
        total_amount_basis_points: totalAmountCents * 100,
        recipients,
      },
    });
  } catch (error) {
    console.error('[Usage] Imperium payload failed:', error);
    res.status(500).json({
      error: 'Failed to generate Imperium payload',
      details: (error as Error).message,
    });
  }
});

export default router;
