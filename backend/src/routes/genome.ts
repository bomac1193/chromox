import { Router } from 'express';
import {
  getOrCreateGenome,
  recordSonicSignal,
  getSonicGenomeSummary,
  getSonicArchetypes,
  getSonicGamification,
  getSonicSignals
} from '../services/sonicGenomeStore';
import { SonicSignalType } from '../types';

const router = Router();

const VALID_SIGNAL_TYPES: SonicSignalType[] = [
  'render', 'like', 'dislike', 'save_to_folio', 'adjust_effects',
  'use_guide', 'mint', 'replay', 'preview', 'rate', 'preference'
];

router.get('/genome', (_req, res) => {
  try {
    const summary = getSonicGenomeSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/genome/signal', (req, res) => {
  try {
    const { type, value, metadata } = req.body ?? {};
    if (!type || !VALID_SIGNAL_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid signal type' });
    }
    const genome = recordSonicSignal({ type, value, metadata });
    res.json({ ok: true, itemCount: genome.itemCount });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/genome/archetypes', (_req, res) => {
  res.json(getSonicArchetypes());
});

router.get('/genome/gamification', (_req, res) => {
  res.json(getSonicGamification());
});

router.get('/genome/signals', (_req, res) => {
  res.json(getSonicSignals());
});

export default router;
