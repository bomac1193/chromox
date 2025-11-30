import { Router } from 'express';
import multer from 'multer';
import { listRenderJobs, findRenderJob, createRenderJob } from '../services/renderStore';
import { findPersona } from '../services/personaStore';
import { resolveProvider } from '../services/provider/providerRegistry';
import { ChromaticCorePipeline } from '../services/renderPipeline';
import { defaultEffectSettings } from '../services/effectsProcessor';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/renders', (_req, res) => {
  res.json(listRenderJobs());
});

router.get('/renders/:id', (req, res) => {
  const job = findRenderJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Render not found' });
  res.json(job);
});

router.post('/renders/:id/replay', upload.single('guide'), async (req, res) => {
  try {
    const original = findRenderJob(req.params.id);
    if (!original) return res.status(404).json({ error: 'Render not found' });

    const persona = findPersona(original.personaId);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    const overrides = req.body || {};
    const lyrics = overrides.lyrics ?? original.lyrics;
    const stylePrompt = overrides.stylePrompt ?? original.stylePrompt;
    const controls = overrides.controls
      ? JSON.parse(overrides.controls)
      : original.controls;
    const effects = overrides.effects
      ? { ...defaultEffectSettings, ...JSON.parse(overrides.effects) }
      : original.effects ?? { ...defaultEffectSettings };

    const accent =
      overrides.accent ?? original.accent;
    const accentLocked =
      overrides.accentLocked !== undefined
        ? overrides.accentLocked === 'true'
        : original.accentLocked;

    const provider = resolveProvider(persona.provider);
    const pipeline = new ChromaticCorePipeline(provider);

    const resultPath = await pipeline.run({
      personaId: persona.id,
      voiceModelKey: persona.voice_model_key,
      lyrics,
      stylePrompt,
      controls,
      effects,
      label: overrides.label ?? original.label,
      guideFilePath: req.file?.path ?? original.guideFilePath,
      accent,
      accentLocked
    });

    const fileName = resultPath.split('/').pop();
    const audioUrl = `http://localhost:4414/renders/${fileName}`;

    const newRecord = createRenderJob({
      personaId: persona.id,
      personaName: persona.name,
      lyrics,
      stylePrompt,
      controls,
      effects,
      audioPath: resultPath,
      audioUrl,
      label: overrides.label ?? original.label,
      guideFilePath: req.file?.path ?? original.guideFilePath,
      personaImage: persona.image_url,
      accent: overrides.accent ?? original.accent,
      accentLocked:
        overrides.accentLocked !== undefined
          ? overrides.accentLocked === 'true'
          : original.accentLocked
    });

    res.json({ audioUrl, render: newRecord });
  } catch (error) {
    console.error('[RenderLibrary] Replay failed', error);
    res.status(500).json({ error: 'Replay failed', details: (error as Error).message });
  }
});

export default router;
