import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { addGuideSample, findPersona } from '../services/personaStore';
import { getGuideSuggestions, mintGuideClip, getTasteProfile } from '../services/guideIntelligence';
import { recordSonicSignal } from '../services/sonicGenomeStore';

const router = Router();
const guideDir = path.join(process.cwd(), 'guide_samples');
fs.mkdirSync(guideDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const personaId = req.params.id;
      const personaFolder = path.join(guideDir, personaId);
      fs.mkdirSync(personaFolder, { recursive: true });
      cb(null, personaFolder);
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || '.wav';
      cb(null, `guide_${timestamp}${ext}`);
    }
  })
});

router.post('/personas/:id/guide-samples', upload.single('guide'), async (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Guide file is required' });
  }
  const name = req.body.name?.trim() || req.file.originalname;
  try {
    const entry = await addGuideSample(persona.id, {
      name,
      originalName: req.file.originalname,
      path: req.file.path,
      source: 'user'
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/personas/:id/guide-suggestions', (req, res) => {
  try {
    const suggestions = getGuideSuggestions(req.params.id);
    res.json(suggestions);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/personas/:id/guide-suggestions/mint', async (req, res) => {
  try {
    const requestedMode = req.body?.mode;
    const mode = requestedMode === 'dream' || requestedMode === 'anthem' ? requestedMode : 'glitch';
    const duration = req.body?.duration ? Number(req.body.duration) : 12;
    const dry = req.body?.dry !== false; // Default true
    const sample = await mintGuideClip(req.params.id, mode, duration, dry);

    try {
      recordSonicSignal({
        type: 'mint',
        value: sample.id,
        metadata: { personaId: req.params.id, mode, duration }
      });
    } catch (e) {
      console.warn('[SonicGenome] Failed to record mint signal', e);
    }

    res.status(201).json(sample);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/personas/:id/taste-profile', (req, res) => {
  try {
    const profile = getTasteProfile(req.params.id);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
