import { Router } from 'express';
import { z } from 'zod';
import { createPersona, findPersona, listPersonas } from '../services/personaStore';

const router = Router();

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
  })
});

router.get('/personas', (_req, res) => {
  res.json(listPersonas());
});

router.get('/personas/:id', (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) return res.status(404).json({ error: 'Persona not found' });
  res.json(persona);
});

router.post('/personas', (req, res) => {
  const parsed = personaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const persona = createPersona(parsed.data);
  res.status(201).json(persona);
});

export default router;
