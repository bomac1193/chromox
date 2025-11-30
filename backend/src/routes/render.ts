import { Router } from 'express';
import multer from 'multer';
import { ChromaticCorePipeline } from '../services/renderPipeline';
import { KitsAiProvider } from '../services/provider/kitsAiProvider';
import { RVCProvider } from '../services/provider/rvcProvider';
import { ElevenLabsProvider } from '../services/provider/elevenLabsProvider';
import { OpenAIVoiceProvider } from '../services/provider/openaiVoiceProvider';
import { findPersona } from '../services/personaStore';
import { StyleControls } from '../types';
import { SingingProvider } from '../services/provider/base';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Initialize all providers
const kitsProvider = new KitsAiProvider();
const rvcProvider = new RVCProvider();
const elevenLabsProvider = new ElevenLabsProvider();
const openaiProvider = new OpenAIVoiceProvider();

// Provider registry
const providers: Record<string, SingingProvider> = {
  'kits-ai': kitsProvider,
  'rvc': rvcProvider,
  'elevenlabs': elevenLabsProvider,
  'openai-voice': openaiProvider,
  'chromox-clone': rvcProvider // Default to RVC for Chromox cloned voices
};

router.post('/render', upload.single('guide'), async (req, res) => {
  try {
    const personaId = req.body.personaId;
    const persona = findPersona(personaId);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    const controls = JSON.parse(req.body.controls ?? '{}') as StyleControls;

    // Select the appropriate provider based on persona configuration
    const provider = providers[persona.provider] || kitsProvider;
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
      guideFilePath: req.file?.path
    });

    res.json({ audioUrl: resultPath });
  } catch (error) {
    console.error('Render failed', error);
    res.status(500).json({ error: 'Render failed', details: (error as Error).message });
  }
});

export default router;
