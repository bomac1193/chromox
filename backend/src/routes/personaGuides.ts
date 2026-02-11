import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { addGuideSample, removeGuideSample, findPersona } from '../services/personaStore';
import { getGuideSuggestions, mintGuideClip, getTasteProfile } from '../services/guideIntelligence';
import { recordSonicSignal } from '../services/sonicGenomeStore';
import { listFolioVideos, findFolioVideo } from '../services/folioStore';
import { extractAudioFromVideo, isSupportedVideoUrl } from '../services/videoAudioExtractor';
import { findRenderJob } from '../services/renderStore';

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

router.delete('/personas/:id/guide-samples/:sampleId', (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  const removed = removeGuideSample(req.params.id, req.params.sampleId);
  if (removed) {
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ error: 'Guide sample not found' });
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

// ── Folio Integration ─────────────────────────────────────────────────

/**
 * List available videos from Folio that can be imported as guide samples.
 * Optional ?tag= filter for voice-reference tagged content.
 */
router.get('/folio/videos', async (req, res) => {
  try {
    const tag = req.query.tag as string | undefined;
    const videos = await listFolioVideos(tag);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Import a video from Folio as a guide sample for a persona.
 * Extracts audio from the video URL and saves it as a guide sample.
 */
router.post('/personas/:id/guide-samples/from-folio', async (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  const { folioCollectionId, name } = req.body;
  if (!folioCollectionId) {
    return res.status(400).json({ error: 'folioCollectionId is required' });
  }

  try {
    // Fetch the video from Folio
    const video = await findFolioVideo(folioCollectionId);
    if (!video) {
      return res.status(404).json({ error: 'Folio video not found' });
    }

    if (!video.url || !isSupportedVideoUrl(video.url)) {
      return res.status(400).json({ error: 'Video URL not supported for audio extraction' });
    }

    // Extract audio from the video
    const outputName = `folio_${folioCollectionId}_${Date.now()}`;
    const extraction = await extractAudioFromVideo(video.url, outputName);

    if (!extraction.success || !extraction.audioPath) {
      return res.status(500).json({ error: extraction.error || 'Failed to extract audio' });
    }

    // Move the extracted audio to the persona's guide samples folder
    const personaFolder = path.join(guideDir, persona.id);
    fs.mkdirSync(personaFolder, { recursive: true });

    const ext = path.extname(extraction.audioPath);
    const finalPath = path.join(personaFolder, `folio_${Date.now()}${ext}`);
    fs.copyFileSync(extraction.audioPath, finalPath);

    // Add as guide sample
    const sampleName = name || video.title || 'Folio Import';
    const entry = await addGuideSample(persona.id, {
      name: sampleName,
      originalName: `${video.platform}: ${video.title}`,
      path: finalPath,
      source: 'folio' as 'user', // Type workaround until personaStore is updated
      tags: video.tags,
    });

    // Record sonic signal
    try {
      recordSonicSignal({
        type: 'use_guide',
        value: entry?.id,
        metadata: {
          personaId: persona.id,
          source: 'folio',
          folioCollectionId,
          platform: video.platform,
        },
      });
    } catch (e) {
      console.warn('[SonicGenome] Failed to record folio import signal', e);
    }

    res.status(201).json({
      ...entry,
      folioCollectionId,
      folioVideoUrl: video.url,
      folioPlatform: video.platform,
    });
  } catch (error) {
    console.error('[PersonaGuides] Failed to import from Folio:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Import directly from a video URL (without going through Folio).
 * Useful for quick imports.
 */
router.post('/personas/:id/guide-samples/from-url', async (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  const { url, name } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  if (!isSupportedVideoUrl(url)) {
    return res.status(400).json({ error: 'URL not supported for audio extraction' });
  }

  try {
    const outputName = `url_${Date.now()}`;
    const extraction = await extractAudioFromVideo(url, outputName);

    if (!extraction.success || !extraction.audioPath) {
      return res.status(500).json({ error: extraction.error || 'Failed to extract audio' });
    }

    // Move to persona folder
    const personaFolder = path.join(guideDir, persona.id);
    fs.mkdirSync(personaFolder, { recursive: true });

    const ext = path.extname(extraction.audioPath);
    const finalPath = path.join(personaFolder, `url_${Date.now()}${ext}`);
    fs.copyFileSync(extraction.audioPath, finalPath);

    const sampleName = name || 'URL Import';
    const entry = await addGuideSample(persona.id, {
      name: sampleName,
      originalName: url,
      path: finalPath,
      source: 'user',
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('[PersonaGuides] Failed to import from URL:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Save a render's audio as a guide sample for a persona.
 * This replaces the old "save to folio" action - now you directly
 * save good renders as voice references.
 */
router.post('/personas/:id/guide-samples/from-render', async (req, res) => {
  const persona = findPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  const { renderId, name } = req.body;
  if (!renderId) {
    return res.status(400).json({ error: 'renderId is required' });
  }

  try {
    const render = findRenderJob(renderId);
    if (!render) {
      return res.status(404).json({ error: 'Render not found' });
    }

    // Check if the render audio file exists
    if (!render.audioPath || !fs.existsSync(render.audioPath)) {
      return res.status(404).json({ error: 'Render audio file not found' });
    }

    // Copy to persona's guide samples folder
    const personaFolder = path.join(guideDir, persona.id);
    fs.mkdirSync(personaFolder, { recursive: true });

    const ext = path.extname(render.audioPath);
    const finalPath = path.join(personaFolder, `render_${Date.now()}${ext}`);
    fs.copyFileSync(render.audioPath, finalPath);

    // Add as guide sample
    const sampleName = name || render.label || `Render ${new Date(render.created_at).toLocaleDateString()}`;
    const entry = await addGuideSample(persona.id, {
      name: sampleName,
      originalName: `Render: ${render.stylePrompt || 'Untitled'}`,
      path: finalPath,
      source: 'user',
      tags: [render.stylePrompt, render.effects?.preset].filter(Boolean) as string[],
    });

    // Record sonic signal
    try {
      recordSonicSignal({
        type: 'use_guide',
        value: entry?.id,
        metadata: {
          personaId: persona.id,
          source: 'render',
          sourceRenderId: renderId,
        },
      });
    } catch (e) {
      console.warn('[SonicGenome] Failed to record render-to-guide signal', e);
    }

    res.status(201).json({
      ...entry,
      sourceRenderId: renderId,
    });
  } catch (error) {
    console.error('[PersonaGuides] Failed to save render as guide:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
