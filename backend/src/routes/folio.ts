import { Router } from 'express';
import { listFolioClips, addFolioClip, removeFolioClip } from '../services/folioStore';
import { findRenderJob } from '../services/renderStore';
import { recordSonicSignal } from '../services/sonicGenomeStore';

const router = Router();

router.get('/folio', async (_req, res) => {
  try {
    const clips = await listFolioClips();
    res.json(clips);
  } catch (error) {
    console.error('[Folio] Failed to list clips', error);
    res.status(500).json({ error: 'Failed to list folio clips' });
  }
});

router.post('/folio', async (req, res) => {
  try {
    const renderId = req.body.renderId;
    const name = req.body.name;

    if (renderId) {
      const render = findRenderJob(renderId);
      if (!render) return res.status(404).json({ error: 'Render not found' });

      const clip = await addFolioClip({
        name: name || render.label || render.personaName,
        audioPath: render.audioPath,
        audioUrl: render.audioUrl,
        source: 'render',
        sourceRenderId: render.id,
        sourcePersonaName: render.personaName,
      });

      try {
        recordSonicSignal({
          type: 'save_to_folio',
          value: clip.id,
          metadata: { renderId: render.id, personaId: render.personaId },
        });
      } catch (e) {
        console.warn('[SonicGenome] Failed to record folio signal', e);
      }

      return res.json(clip);
    }

    return res.status(400).json({ error: 'Provide renderId to save to folio' });
  } catch (error) {
    console.error('[Folio] Failed to add clip', error);
    res.status(500).json({ error: 'Failed to add folio clip' });
  }
});

router.delete('/folio/:id', async (req, res) => {
  try {
    const removed = await removeFolioClip(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Folio clip not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('[Folio] Failed to remove clip', error);
    res.status(500).json({ error: 'Failed to remove folio clip' });
  }
});

export default router;
