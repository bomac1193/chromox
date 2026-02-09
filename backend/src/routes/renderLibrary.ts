import { Router } from 'express';
import multer from 'multer';
import { listRenderJobs, findRenderJob, createRenderJob, setRenderRating, updateRenderLabel, updateRenderPersona } from '../services/renderStore';
import { RenderRating } from '../types';
import { findPersona } from '../services/personaStore';
import { resolveProvider } from '../services/provider/providerRegistry';
import { ChromaticCorePipeline } from '../services/renderPipeline';
import { defaultEffectSettings } from '../services/effectsProcessor';
import { ensureLocalAudio } from '../services/folioStore';
import { recordSonicSignal } from '../services/sonicGenomeStore';
import { addRelicToPersona } from '../services/personaStore';

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

    const accent = overrides.accent ?? original.accent;
    const accentLocked =
      overrides.accentLocked !== undefined ? overrides.accentLocked === 'true' : original.accentLocked;
    const guideMatchIntensity =
      overrides.guideMatchIntensity !== undefined
        ? Number(overrides.guideMatchIntensity)
        : original.guideMatchIntensity;
    const guideSampleId = overrides.guideSampleId ?? original.guideSampleId;
    const guideSample = guideSampleId
      ? persona.guide_samples?.find((sample) => sample.id === guideSampleId)
      : undefined;
    const folioClipId = overrides.folioClipId;
    const folioAudioPath = folioClipId ? await ensureLocalAudio(folioClipId) : undefined;
    const guideFilePath = folioAudioPath ?? guideSample?.path ?? req.file?.path ?? original.guideFilePath;
    const guideUseLyrics =
      overrides.guideUseLyrics !== undefined
        ? overrides.guideUseLyrics === 'true'
        : original.guideUseLyrics;
    const guideTempo =
      overrides.guideTempo !== undefined
        ? Number(overrides.guideTempo)
        : original.guideTempo;

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
      guideFilePath,
      accent,
      accentLocked,
      guideSampleId,
      guideMatchIntensity,
      guideUseLyrics,
      guideTempo
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
      guideFilePath,
      personaImage: persona.image_url,
      accent,
      accentLocked,
      guideSampleId,
      guideMatchIntensity,
      guideUseLyrics,
      guideTempo
    });

    res.json({ audioUrl, render: newRecord });
  } catch (error) {
    console.error('[RenderLibrary] Replay failed', error);
    res.status(500).json({ error: 'Replay failed', details: (error as Error).message });
  }
});

router.post('/renders/:id/rating', (req, res) => {
  const { rating } = req.body ?? {};
  const allowed: RenderRating[] = ['like', 'dislike', 'neutral'];
  if (!allowed.includes(rating)) {
    return res.status(400).json({ error: 'Invalid rating' });
  }
  const updated = setRenderRating(req.params.id, rating);
  if (!updated) {
    return res.status(404).json({ error: 'Render not found' });
  }

  // Emit sonic signal for like/dislike
  try {
    if (rating === 'like' || rating === 'dislike') {
      recordSonicSignal({
        type: rating,
        value: req.params.id,
        metadata: {
          personaId: updated.personaId,
          effectPreset: updated.effects?.preset,
          guideSampleId: updated.guideSampleId
        }
      });

      // Auto-relic: every 5th like for a persona generates a relic
      if (rating === 'like') {
        const allJobs = listRenderJobs();
        const personaLikes = allJobs.filter(
          (j) => j.personaId === updated.personaId && j.rating === 'like'
        );
        if (personaLikes.length > 0 && personaLikes.length % 5 === 0) {
          const tierMap: Record<number, number> = { 5: 1, 10: 2, 15: 2, 20: 3, 25: 3 };
          const tier = tierMap[personaLikes.length] ?? Math.min(4, Math.floor(personaLikes.length / 10) + 1);
          addRelicToPersona(updated.personaId, {
            name: `Resonance Fragment #${Math.ceil(personaLikes.length / 5)}`,
            description: `Auto-generated from ${personaLikes.length} liked renders`,
            lore: `This relic crystallized after the ${personaLikes.length}th appreciation signal. Style: ${updated.stylePrompt || 'unknown'}.`,
            tier,
            icon: tier >= 3 ? '***' : tier >= 2 ? '**' : '*',
            audioUrl: updated.audioUrl,
            sourceRenderId: updated.id
          });
        }
      }
    }
  } catch (e) {
    console.warn('[SonicGenome] Failed to record rating signal', e);
  }

  res.json(updated);
});

router.patch('/renders/:id/label', (req, res) => {
  const { label } = req.body ?? {};
  if (typeof label !== 'string') {
    return res.status(400).json({ error: 'Label must be a string' });
  }
  const updated = updateRenderLabel(req.params.id, label.trim());
  if (!updated) {
    return res.status(404).json({ error: 'Render not found' });
  }
  res.json(updated);
});

router.patch('/renders/:id/persona', (req, res) => {
  const { personaId } = req.body ?? {};
  if (typeof personaId !== 'string') {
    return res.status(400).json({ error: 'personaId must be a string' });
  }
  const persona = findPersona(personaId);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  const updated = updateRenderPersona(req.params.id, personaId, persona.name, persona.image_url);
  if (!updated) {
    return res.status(404).json({ error: 'Render not found' });
  }
  res.json(updated);
});

export default router;
