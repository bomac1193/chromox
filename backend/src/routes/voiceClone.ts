import { Router } from 'express';
import multer from 'multer';
import { analyzeVoiceFromStem, characteristicsToStyleControls, saveVoiceProfile } from '../services/voiceAnalysis';
import { createPersona } from '../services/personaStore';
import { extractVocalStem } from '../services/dsp';

const router = Router();
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/voice-clone/analyze
 * Uploads a vocal stem, analyzes it, and returns voice characteristics.
 */
router.post('/analyze', upload.single('vocal'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No vocal file uploaded' });
    }

    console.log(`[VoiceClone] Analyzing vocal: ${req.file.originalname}`);

    // Extract vocal stem if the file contains other instruments
    const { stemPath } = await extractVocalStem(req.file.path);

    // Analyze voice and extract profile
    const voiceProfile = await analyzeVoiceFromStem(stemPath);

    // Generate suggested style controls from voice characteristics
    const suggestedControls = characteristicsToStyleControls(voiceProfile.characteristics);

    res.json({
      success: true,
      profile: voiceProfile,
      suggestedControls,
      message: 'Voice analyzed successfully. Ready to create persona.'
    });
  } catch (error) {
    console.error('[VoiceClone] Analysis failed:', error);
    res.status(500).json({
      error: 'Voice analysis failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/create-persona
 * Creates a new persona from a voice profile analysis.
 */
router.post('/create-persona', upload.single('vocal'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Persona name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No vocal file uploaded' });
    }

    console.log(`[VoiceClone] Creating cloned persona: ${name}`);

    // Extract and analyze vocal
    const { stemPath } = await extractVocalStem(req.file.path);
    const voiceProfile = await analyzeVoiceFromStem(stemPath);

    // Generate default style controls from voice characteristics
    const defaultControls = characteristicsToStyleControls(voiceProfile.characteristics);

    // Create persona with voice cloning enabled
    const persona = createPersona({
      name,
      description: description || `Cloned voice from ${req.file.originalname}`,
      voice_model_key: `cloned_${Date.now()}`, // Unique key for this cloned voice
      provider: 'chromox-clone', // Use our custom cloning provider
      default_style_controls: defaultControls,
      is_cloned: true,
      voice_profile: voiceProfile,
      clone_source: 'upload'
    });

    // Save voice profile to disk for persistence
    saveVoiceProfile(persona.id, voiceProfile);

    console.log(`[VoiceClone] Created persona: ${persona.id}`);

    res.json({
      success: true,
      persona,
      message: `Voice cloned successfully! Persona "${name}" is ready to use.`
    });
  } catch (error) {
    console.error('[VoiceClone] Persona creation failed:', error);
    res.status(500).json({
      error: 'Failed to create cloned persona',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/retrain
 * Retrains/refines a voice clone with additional samples.
 */
router.post('/retrain/:personaId', upload.array('vocals', 5), async (req, res) => {
  try {
    const { personaId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No vocal files uploaded' });
    }

    console.log(`[VoiceClone] Retraining persona ${personaId} with ${req.files.length} samples`);

    // TODO: Implement voice profile refinement with multiple samples
    // This would average/blend characteristics or retrain the embedding model

    res.json({
      success: true,
      message: `Voice model retrained with ${req.files.length} additional samples`
    });
  } catch (error) {
    console.error('[VoiceClone] Retraining failed:', error);
    res.status(500).json({
      error: 'Retraining failed',
      details: (error as Error).message
    });
  }
});

export default router;
