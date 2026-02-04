import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { createPersona, findPersona, listPersonas, updatePersona, listPersonaRelics, addRelicToPersona } from '../services/personaStore';

const router = Router();
const mediaDir = path.join(process.cwd(), 'persona_media');
fs.mkdirSync(mediaDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `persona_${Date.now()}${ext}`);
    }
  })
});

const focusField = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'string' ? Number(value) : (value as number);
    return Number.isFinite(num) ? num : undefined;
  }, z.number().min(0).max(100))
  .optional();

const personaSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  voice_model_key: z.string(),
  provider: z.string(),
  default_style_controls: z.object({
    brightness: z.number(),
    breathiness: z.number(),
    energy: z.number(),
    formant: z.number(),
    vibratoDepth: z.number(),
    vibratoRate: z.number(),
    roboticism: z.number(),
    glitch: z.number(),
    stereoWidth: z.number()
  }),
  image_url: z.string().optional(),
  image_focus_x: focusField,
  image_focus_y: focusField
});

const personaUpdateSchema = personaSchema.partial();

router.get('/personas', (_req, res) => {
  res.json(listPersonas());
});

router.get('/personas/:id', (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) return res.status(404).json({ error: 'Persona not found' });
  res.json(persona);
});

router.post('/personas', upload.single('image'), (req, res) => {
  let defaultControls: unknown = req.body.default_style_controls;

  if (typeof req.body.default_style_controls === 'string') {
    try {
      defaultControls = JSON.parse(req.body.default_style_controls);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid default_style_controls payload' });
    }
  }

  const payload = {
    ...req.body,
    default_style_controls: defaultControls
  };

  const parsed = personaSchema.safeParse(payload);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const persona = createPersona({
    ...parsed.data,
    image_url: req.file ? `/media/personas/${req.file.filename}` : parsed.data.image_url
  });
  res.status(201).json(persona);
});

router.put('/personas/:id', upload.single('image'), (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  let defaultControls: unknown = req.body.default_style_controls;

  if (typeof req.body.default_style_controls === 'string') {
    try {
      defaultControls = JSON.parse(req.body.default_style_controls);
    } catch {
      return res.status(400).json({ error: 'Invalid default_style_controls payload' });
    }
  }

  const payload = {
    ...req.body,
    default_style_controls: defaultControls
  };

  const parsed = personaUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const updated = updatePersona(persona.id, {
    ...parsed.data,
    image_url: req.file ? `/media/personas/${req.file.filename}` : parsed.data.image_url
  });

  res.json(updated);
});

// ── Relic endpoints ────────────────────────────────────────────────

router.get('/personas/:id/relics', (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) return res.status(404).json({ error: 'Persona not found' });
  res.json(listPersonaRelics(req.params.id));
});

router.post('/personas/:id/relics', (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) return res.status(404).json({ error: 'Persona not found' });

  const { name, description, lore, tier, icon, audioUrl, effectChain, sourceRenderId } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const relic = addRelicToPersona(req.params.id, {
    name,
    description: description ?? '',
    lore: lore ?? '',
    tier: tier ?? 1,
    icon: icon ?? '*',
    audioUrl,
    effectChain,
    sourceRenderId
  });

  if (!relic) return res.status(404).json({ error: 'Persona not found' });
  res.status(201).json(relic);
});

export default router;
