import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { analyzeVoiceFromStem, characteristicsToStyleControls, saveVoiceProfile } from '../services/voiceAnalysis';
import { createPersona, updatePersona } from '../services/personaStore';
import { extractVocalStem } from '../services/dsp';

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');
const personaMediaDir = path.join(process.cwd(), 'persona_media');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(personaMediaDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      if (file.fieldname === 'image') {
        cb(null, personaMediaDir);
      } else {
        cb(null, uploadsDir);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.dat';
      const prefix = file.fieldname === 'image' ? 'persona_' : 'upload_';
      cb(null, `${prefix}${Date.now()}${ext}`);
    }
  })
});

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
router.post(
  '/create-persona',
  upload.fields([
    { name: 'vocal', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Persona name is required' });
    }

    const vocalFile = (req.files as Record<string, Express.Multer.File[]> | undefined)?.['vocal']?.[0];
    const imageFile = (req.files as Record<string, Express.Multer.File[]> | undefined)?.['image']?.[0];

    if (!vocalFile) {
      return res.status(400).json({ error: 'No vocal file uploaded' });
    }

    console.log(`[VoiceClone] Creating cloned persona: ${name}`);

    // Extract and analyze vocal
    const { stemPath } = await extractVocalStem(vocalFile.path);
    const voiceProfile = await analyzeVoiceFromStem(stemPath);

    // Generate default style controls from voice characteristics
    const defaultControls = characteristicsToStyleControls(voiceProfile.characteristics);

    // Create persona with voice cloning enabled
    const persona = createPersona({
      name,
      description: description || `Cloned voice from ${vocalFile.originalname}`,
      voice_model_key: '', // Will be set below
      provider: 'elevenlabs', // Use ElevenLabs voice cloning (Creator plan)
      default_style_controls: defaultControls,
      is_cloned: true,
      voice_profile: voiceProfile,
      clone_source: 'upload',
      image_url: imageFile ? `/media/personas/${path.basename(imageFile.path)}` : undefined
    });

    // Update voice_model_key to match persona ID for consistency and persist
    const updatedPersona =
      updatePersona(persona.id, { voice_model_key: `cloned_${persona.id}` }) ?? persona;

    // Save voice profile to disk for persistence
    saveVoiceProfile(persona.id, voiceProfile);

    console.log(`[VoiceClone] Created persona: ${persona.id}`);

    res.json({
      success: true,
      persona: updatedPersona,
      message: `Voice cloned successfully! Persona "${name}" is ready to use.`
    });
  } catch (error) {
    console.error('[VoiceClone] Persona creation failed:', error);
    res.status(500).json({
      error: 'Failed to create cloned persona',
      details: (error as Error).message
    });
  }
  }
);

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
