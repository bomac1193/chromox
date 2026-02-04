import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { listFolioClips, findFolioClip, addFolioClip, removeFolioClip } from '../services/folioStore';
import { findRenderJob } from '../services/renderStore';
import { recordSonicSignal } from '../services/sonicGenomeStore';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'folio_uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/folio', (_req, res) => {
  res.json(listFolioClips());
});

router.post('/folio', upload.single('audio'), (req, res) => {
  const renderId = req.body.renderId;
  const name = req.body.name;

  if (renderId) {
    const render = findRenderJob(renderId);
    if (!render) return res.status(404).json({ error: 'Render not found' });

    const clip = addFolioClip({
      name: name || render.label || render.personaName,
      audioPath: render.audioPath,
      audioUrl: render.audioUrl,
      source: 'render',
      sourceRenderId: render.id,
      sourcePersonaName: render.personaName
    });

    try {
      recordSonicSignal({
        type: 'save_to_folio',
        value: clip.id,
        metadata: { renderId: render.id, personaId: render.personaId }
      });
    } catch (e) {
      console.warn('[SonicGenome] Failed to record folio signal', e);
    }

    return res.json(clip);
  }

  if (req.file) {
    const fileName = req.file.filename;
    const audioUrl = `/media/folio/${fileName}`;
    const clip = addFolioClip({
      name: name || req.file.originalname,
      audioPath: req.file.path,
      audioUrl,
      source: 'upload'
    });
    return res.json(clip);
  }

  return res.status(400).json({ error: 'Provide either renderId or audio file' });
});

router.delete('/folio/:id', (req, res) => {
  const removed = removeFolioClip(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Folio clip not found' });
  res.json({ ok: true });
});

export default router;
