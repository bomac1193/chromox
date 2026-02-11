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

// Import from external sources (Slag, etc.)
router.post('/folio/import', async (req, res) => {
  try {
    const { source, audio_url, name, license, license_url, attribution, slag_match_score, original_source, tags } = req.body;

    if (!audio_url || !name) {
      return res.status(400).json({ error: 'Missing audio_url or name' });
    }

    // Download audio from external URL first
    const fs = await import('fs');
    const path = await import('path');
    const fetch = (await import('node-fetch')).default;

    console.log(`[Folio] Downloading audio from ${audio_url}`);
    const audioRes = await fetch(audio_url);
    if (!audioRes.ok) {
      return res.status(400).json({ error: `Failed to download audio: ${audioRes.status}` });
    }

    // Save to temp file
    const ext = path.extname(new URL(audio_url).pathname) || '.mp3';
    const tempDir = path.join(process.cwd(), 'folio_cache');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `import_${Date.now()}${ext}`);
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    const clip = await addFolioClip({
      name,
      audioPath: tempPath,
      audioUrl: audio_url,
      source: 'upload',
      tags: tags || [],
    });

    // Store extra metadata (could extend FolioClip type later)
    console.log(`[Folio] Imported from ${source}: ${name} (${license})`);
    console.log(`[Folio] Original source: ${original_source}, Score: ${slag_match_score}`);
    if (attribution) console.log(`[Folio] Attribution: ${attribution}`);

    res.json(clip);
  } catch (error) {
    console.error('[Folio] Failed to import clip', error);
    res.status(500).json({ error: 'Failed to import clip' });
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
