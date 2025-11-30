import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { addGuideSample, findPersona } from '../services/personaStore';

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

router.post('/personas/:id/guide-samples', upload.single('guide'), (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Guide file is required' });
  }
  const name = req.body.name?.trim() || req.file.originalname;
  const entry = addGuideSample(persona.id, {
    name,
    originalName: req.file.originalname,
    path: req.file.path
  });
  res.status(201).json(entry);
});

export default router;
