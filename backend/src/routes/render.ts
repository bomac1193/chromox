import { Router } from 'express';
import multer from 'multer';
import { ChromaticCorePipeline } from '../services/renderPipeline';
import { findPersona } from '../services/personaStore';
import { StyleControls } from '../types';
import { defaultEffectSettings } from '../services/effectsProcessor';
import { createRenderJob } from '../services/renderStore';
import { resolveProvider } from '../services/provider/providerRegistry';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/render', upload.single('guide'), async (req, res) => {
  try {
    const personaId = req.body.personaId;
    const persona = findPersona(personaId);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    const controls = JSON.parse(req.body.controls ?? '{}') as StyleControls;
    let effects = { ...defaultEffectSettings };
    if (req.body.effects) {
      try {
        effects = { ...defaultEffectSettings, ...JSON.parse(req.body.effects) };
      } catch (error) {
        console.warn('[Render] Failed to parse effects payload, using defaults.', error);
      }
    }
    const previewSeconds = req.body.previewSeconds ? Number(req.body.previewSeconds) : undefined;
    const accent = req.body.accent;
    const accentLocked = req.body.accentLocked === 'true';

    // Select the appropriate provider based on persona configuration
    const provider = resolveProvider(persona.provider);
    const pipeline = new ChromaticCorePipeline(provider);

    console.log(`[Render] Using provider: ${provider.label} for persona: ${persona.name}`);

    // If this is a cloned voice, merge voice profile characteristics with controls
    if (persona.is_cloned && persona.voice_profile) {
      console.log('[Render] Applying cloned voice characteristics');
      // The voice profile is already embedded in the persona
      // The provider will load it during synthesis
    }

    const resultPath = await pipeline.run({
      personaId,
      voiceModelKey: persona.voice_model_key,
      lyrics: req.body.lyrics,
      stylePrompt: req.body.stylePrompt,
      controls,
      effects,
      label: req.body.label,
      guideFilePath: req.file?.path,
      previewSeconds,
      accent,
      accentLocked
    });

    // Convert file path to URL
    const fileName = resultPath.split('/').pop();
    const audioUrl = `http://localhost:4414/renders/${fileName}`;

    const renderRecord = createRenderJob({
      personaId,
      personaName: persona.name,
      lyrics: req.body.lyrics,
      stylePrompt: req.body.stylePrompt,
      controls,
      effects,
      audioPath: resultPath,
      audioUrl,
      label: req.body.label,
      guideFilePath: req.file?.path,
      personaImage: persona.image_url,
      accent,
      accentLocked
    });

    res.json({ audioUrl, render: renderRecord });
  } catch (error) {
    console.error('Render failed', error);
    res.status(500).json({ error: 'Render failed', details: (error as Error).message });
  }
});

router.post('/render/preview', upload.single('guide'), async (req, res) => {
  try {
    const personaId = req.body.personaId;
    const persona = findPersona(personaId);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    const controls = JSON.parse(req.body.controls ?? '{}') as StyleControls;
    let effects = { ...defaultEffectSettings };
    if (req.body.effects) {
      try {
        effects = { ...defaultEffectSettings, ...JSON.parse(req.body.effects) };
      } catch (error) {
        console.warn('[RenderPreview] Failed to parse effects payload, using defaults.', error);
      }
    }
    const previewSeconds = Number(req.body.previewSeconds ?? 12);
    const accent = req.body.accent;
    const accentLocked = req.body.accentLocked === 'true';

    const provider = resolveProvider(persona.provider);
    const pipeline = new ChromaticCorePipeline(provider);

    const resultPath = await pipeline.run({
      personaId,
      voiceModelKey: persona.voice_model_key,
      lyrics: req.body.lyrics,
      stylePrompt: req.body.stylePrompt,
      controls,
      effects,
      label: req.body.label,
      guideFilePath: req.file?.path,
      previewSeconds,
      accent,
      accentLocked
    });

    const fileName = resultPath.split('/').pop();
    const audioUrl = `http://localhost:4414/renders/${fileName}`;

    res.json({ audioUrl });
  } catch (error) {
    console.error('[RenderPreview] Failed', error);
    res.status(500).json({ error: 'Preview failed', details: (error as Error).message });
  }
});

export default router;
