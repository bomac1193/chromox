import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import {
  analyzeVoiceFromStem,
  characteristicsToStyleControls,
  saveVoiceProfile,
  addTrainingSample,
  calibrateVoiceProfile,
  removeTrainingSample,
  loadVoiceProfile
} from '../services/voiceAnalysis';
import { createPersona, updatePersona } from '../services/personaStore';
import { extractVocalStem } from '../services/dsp';
import { detectVoiceCharacteristics, getModeLabel, getAccentLabel, AccentCategory } from '../services/voiceDetection';
import {
  registerVoiceProvenance,
  validateVoiceUsage,
  LicensingTerms
} from '../services/provenanceService';
import {
  synthesizeHybrid,
  validateHybridLicenses,
  createBlendedProfile,
  HybridSynthesisRequest,
  VoiceComponent,
} from '../services/hybridSynthesis';

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
 * POST /api/voice-clone/detect
 * Quick detection of voice type, accent, quality - returns recommended mode
 */
router.post('/detect', upload.single('vocal'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No vocal file uploaded' });
    }

    console.log(`[VoiceClone] Detecting voice characteristics: ${req.file.originalname}`);

    // Run auto-detection
    const detection = await detectVoiceCharacteristics(req.file.path);

    res.json({
      success: true,
      detection: {
        ...detection,
        modeLabel: getModeLabel(detection.recommendedMode),
        accentLabel: getAccentLabel(detection.accent)
      },
      message: detection.explanation
    });
  } catch (error) {
    console.error('[VoiceClone] Detection failed:', error);
    res.status(500).json({
      error: 'Voice detection failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/analyze
 * Uploads a vocal stem, analyzes it, and returns voice characteristics.
 * Now includes auto-detection for smart provider routing.
 */
router.post('/analyze', upload.single('vocal'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No vocal file uploaded' });
    }

    console.log(`[VoiceClone] Analyzing vocal: ${req.file.originalname}`);

    // Extract vocal stem if the file contains other instruments
    const { stemPath } = await extractVocalStem(req.file.path);

    // Run auto-detection first
    const detection = await detectVoiceCharacteristics(stemPath);

    // Analyze voice and extract profile
    const voiceProfile = await analyzeVoiceFromStem(stemPath, req.file.originalname);

    // Generate suggested style controls from voice characteristics
    const suggestedControls = characteristicsToStyleControls(voiceProfile.characteristics);

    res.json({
      success: true,
      profile: voiceProfile,
      suggestedControls,
      detection: {
        ...detection,
        modeLabel: getModeLabel(detection.recommendedMode),
        accentLabel: getAccentLabel(detection.accent)
      },
      message: detection.explanation
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
 * Uses auto-detection to select optimal provider and settings.
 */
router.post(
  '/create-persona',
  upload.fields([
    { name: 'vocal', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  async (req, res) => {
  try {
    const { name, description, forceProvider, forceMode } = req.body;

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

    // Run auto-detection to determine best provider
    const detection = await detectVoiceCharacteristics(stemPath);

    // Allow manual override of provider/mode
    const selectedProvider = forceProvider || detection.recommendedProvider;
    const selectedMode = forceMode || detection.recommendedMode;

    console.log(`[VoiceClone] Auto-detected: ${detection.voiceType} voice, ${detection.accent} accent`);
    console.log(`[VoiceClone] Using provider: ${selectedProvider} (mode: ${selectedMode})`);

    // Analyze voice profile with original filename
    const voiceProfile = await analyzeVoiceFromStem(stemPath, vocalFile.originalname);

    // Generate default style controls from voice characteristics
    const defaultControls = characteristicsToStyleControls(voiceProfile.characteristics);

    // Create persona with detected provider
    const persona = createPersona({
      name,
      description: description || `Cloned voice from ${vocalFile.originalname}`,
      voice_model_key: '', // Will be set below
      provider: selectedProvider,
      default_style_controls: defaultControls,
      is_cloned: true,
      voice_profile: voiceProfile,
      clone_source: 'upload',
      clone_mode: selectedMode,
      clone_detection: {
        voiceType: detection.voiceType,
        accent: detection.accent,
        accentLabel: getAccentLabel(detection.accent),
        quality: detection.audioQuality,
        duration: detection.duration,
        providerSettings: detection.providerSettings
      },
      image_url: imageFile ? `/media/personas/${path.basename(imageFile.path)}` : undefined
    });

    // Update voice_model_key to match persona ID for consistency and persist
    const updatedPersona =
      updatePersona(persona.id, { voice_model_key: `cloned_${persona.id}` }) ?? persona;

    // Save voice profile to disk for persistence
    saveVoiceProfile(persona.id, voiceProfile);

    console.log(`[VoiceClone] Created persona: ${persona.id} with provider: ${selectedProvider}`);

    res.json({
      success: true,
      persona: updatedPersona,
      detection: {
        ...detection,
        modeLabel: getModeLabel(detection.recommendedMode),
        accentLabel: getAccentLabel(detection.accent)
      },
      message: detection.explanation
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
 * POST /api/voice-clone/train/:personaId
 * Adds new training samples to improve voice clone fidelity.
 * Each sample is blended with existing profile using weighted average.
 */
router.post('/train/:personaId', upload.array('vocals', 5), async (req, res) => {
  try {
    const { personaId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No vocal files uploaded' });
    }

    // Verify persona exists
    const { findPersona } = await import('../services/personaStore');
    const persona = findPersona(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    console.log(`[VoiceClone] Training persona ${personaId} with ${files.length} new samples`);

    const results = [];
    let totalFidelityDelta = 0;

    for (const file of files) {
      // Extract vocal stem if needed
      const { stemPath } = await extractVocalStem(file.path);

      // Add training sample
      const result = await addTrainingSample(personaId, stemPath, file.originalname);
      results.push({
        sampleId: result.sampleId,
        originalName: file.originalname,
        fidelityDelta: result.fidelityDelta
      });
      totalFidelityDelta += result.fidelityDelta;
    }

    // Update persona with new voice profile
    const updatedProfile = loadVoiceProfile(personaId);
    if (updatedProfile) {
      updatePersona(personaId, { voice_profile: updatedProfile });
    }

    res.json({
      success: true,
      message: `Added ${files.length} training sample(s)`,
      samples: results,
      totalFidelityDelta,
      newFidelityScore: updatedProfile?.fidelityScore,
      trainingVersion: updatedProfile?.trainingVersion,
      totalSamples: updatedProfile?.trainingSamples?.length
    });
  } catch (error) {
    console.error('[VoiceClone] Training failed:', error);
    res.status(500).json({
      error: 'Training failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/calibrate/:personaId
 * Recalibrates voice profile by:
 * - Detecting outlier samples that don't match
 * - Adjusting sample weights for optimal blending
 * - Recomputing the combined embedding
 */
router.post('/calibrate/:personaId', async (req, res) => {
  try {
    const { personaId } = req.params;

    // Verify persona exists
    const { findPersona } = await import('../services/personaStore');
    const persona = findPersona(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    console.log(`[VoiceClone] Calibrating persona ${personaId}`);

    const result = await calibrateVoiceProfile(personaId);

    // Update persona with calibrated profile
    updatePersona(personaId, { voice_profile: result.profile });

    res.json({
      success: true,
      message: result.outlierCount > 0
        ? `Calibration complete. Found ${result.outlierCount} outlier sample(s).`
        : 'Calibration complete. All samples are consistent.',
      outlierCount: result.outlierCount,
      adjustments: result.adjustments,
      fidelityDelta: result.fidelityDelta,
      newFidelityScore: result.profile.fidelityScore,
      lastCalibratedAt: result.profile.lastCalibratedAt
    });
  } catch (error) {
    console.error('[VoiceClone] Calibration failed:', error);
    res.status(500).json({
      error: 'Calibration failed',
      details: (error as Error).message
    });
  }
});

/**
 * DELETE /api/voice-clone/sample/:personaId/:sampleId
 * Removes a training sample from the voice profile.
 */
router.delete('/sample/:personaId/:sampleId', async (req, res) => {
  try {
    const { personaId, sampleId } = req.params;

    // Verify persona exists
    const { findPersona } = await import('../services/personaStore');
    const persona = findPersona(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    console.log(`[VoiceClone] Removing sample ${sampleId} from persona ${personaId}`);

    const result = await removeTrainingSample(personaId, sampleId);

    if (!result.removed) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    // Update persona with updated profile
    updatePersona(personaId, { voice_profile: result.profile });

    res.json({
      success: true,
      message: 'Sample removed',
      newFidelityScore: result.profile.fidelityScore,
      remainingSamples: result.profile.trainingSamples?.length
    });
  } catch (error) {
    console.error('[VoiceClone] Sample removal failed:', error);
    res.status(500).json({
      error: 'Sample removal failed',
      details: (error as Error).message
    });
  }
});

/**
 * GET /api/voice-clone/training-status/:personaId
 * Returns training status and sample details for a persona.
 * Migrates legacy profiles that don't have trainingSamples yet.
 */
router.get('/training-status/:personaId', async (req, res) => {
  try {
    const { personaId } = req.params;
    const fs = await import('fs');
    const pathModule = await import('path');
    const { v4: uuidv4 } = await import('uuid');

    let profile = loadVoiceProfile(personaId);

    // If no profile on disk, try to get from persona
    if (!profile) {
      const { findPersona } = await import('../services/personaStore');
      const persona = findPersona(personaId);
      if (persona?.voice_profile) {
        profile = persona.voice_profile;
        saveVoiceProfile(personaId, profile);
      }
    }

    if (!profile) {
      return res.status(404).json({ error: 'Voice profile not found' });
    }

    // Migrate legacy profiles without trainingSamples
    let samples = profile.trainingSamples || [];
    if (samples.length === 0 && profile.samplePath) {
      // Create initial training sample from legacy data
      if (fs.existsSync(profile.samplePath)) {
        const legacySample = {
          id: uuidv4(),
          path: profile.samplePath,
          originalName: pathModule.basename(profile.samplePath),
          duration: profile.sampleDuration || 0,
          addedAt: profile.analysisTimestamp || new Date().toISOString(),
          embedding: profile.embedding.embedding,
          characteristics: profile.characteristics,
          weight: 1.0,
          isOutlier: false
        };
        samples = [legacySample];

        // Update profile with migration
        profile.trainingSamples = samples;
        profile.trainingVersion = profile.trainingVersion || 1;
        profile.fidelityScore = profile.fidelityScore || 50;
        saveVoiceProfile(personaId, profile);

        // Also update persona
        updatePersona(personaId, { voice_profile: profile });
        console.log(`[VoiceClone] Migrated legacy profile for ${personaId}`);
      }
    }

    res.json({
      success: true,
      personaId,
      fidelityScore: profile.fidelityScore || 50,
      trainingVersion: profile.trainingVersion || 1,
      lastCalibratedAt: profile.lastCalibratedAt,
      totalSamples: samples.length,
      totalDuration: samples.reduce((sum, s) => sum + (s.duration || 0), 0),
      samples: samples.map(s => ({
        id: s.id,
        originalName: s.originalName,
        duration: s.duration || 0,
        addedAt: s.addedAt,
        weight: s.weight,
        isOutlier: s.isOutlier
      })),
      outlierCount: samples.filter(s => s.isOutlier).length
    });
  } catch (error) {
    console.error('[VoiceClone] Training status failed:', error);
    res.status(500).json({
      error: 'Failed to get training status',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/register-provenance
 * Registers a voice persona with o8 protocol for cryptographic provenance.
 * This creates a verifiable identity that links the voice to its owner.
 */
router.post('/register-provenance', async (req, res) => {
  try {
    const {
      persona_id,
      owner_wallet,
      owner_signature,
      licensing_terms
    } = req.body;

    if (!persona_id) {
      return res.status(400).json({ error: 'persona_id is required' });
    }

    // Fetch persona from store
    const { findPersona } = await import('../services/personaStore');
    const persona = findPersona(persona_id);

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    if (!persona.voice_profile) {
      return res.status(400).json({
        error: 'Persona has no voice profile. Analyze voice first.'
      });
    }

    // Default licensing terms if not provided
    const terms: LicensingTerms = licensing_terms || {
      training_rights: false,
      derivative_rights: true,
      commercial_rights: true,
      attribution_required: true,
      revenue_split: 0.4, // 40% to voice actor
    };

    console.log(`[VoiceClone] Registering provenance for: ${persona.name}`);

    // Get detection info from persona
    const detection = persona.clone_detection || {
      voiceType: 'speech' as const,
      accent: 'neutral' as const,
    };

    // Register with o8 protocol
    const registration = await registerVoiceProvenance({
      personaId: persona.id,
      personaName: persona.name,
      voiceProfile: persona.voice_profile,
      detection: {
        voiceType: detection.voiceType || 'speech',
        accent: (detection.accent || 'neutral') as AccentCategory,
      },
      ownerWallet: owner_wallet,
      ownerSignature: owner_signature,
      licensingTerms: terms,
    });

    // Update persona with provenance info
    const { updatePersona } = await import('../services/personaStore');
    updatePersona(persona.id, {
      o8_identity_id: registration.o8_identity_id,
      voice_fingerprint: registration.voice_fingerprint,
      licensing_terms: terms,
    });

    console.log(`[VoiceClone] Provenance registered: ${registration.o8_identity_id}`);

    res.json({
      success: true,
      registration,
      message: 'Voice registered with o8 protocol'
    });
  } catch (error) {
    console.error('[VoiceClone] Provenance registration failed:', error);
    res.status(500).json({
      error: 'Provenance registration failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/validate-usage
 * Validates that a voice can be used for a specific action.
 */
router.post('/validate-usage', async (req, res) => {
  try {
    const { o8_identity_id, action } = req.body;

    if (!o8_identity_id) {
      return res.status(400).json({ error: 'o8_identity_id is required' });
    }

    if (!action || !['synthesize', 'train', 'create_hybrid'].includes(action)) {
      return res.status(400).json({
        error: 'action must be one of: synthesize, train, create_hybrid'
      });
    }

    const result = await validateVoiceUsage(o8_identity_id, action);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[VoiceClone] Usage validation failed:', error);
    res.status(500).json({
      error: 'Usage validation failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/synthesize-hybrid
 * Synthesizes audio using a blend of multiple voice profiles.
 * Routes to optimal provider based on voice characteristics.
 * Tracks usage per voice for royalty distribution.
 */
router.post('/synthesize-hybrid', async (req, res) => {
  try {
    const {
      voices,
      text,
      accent_lock,
      routing_mode = 'auto',
      emotion,
      style_hints
    } = req.body;

    // Validate required fields
    if (!voices || !Array.isArray(voices) || voices.length === 0) {
      return res.status(400).json({
        error: 'voices array is required with at least one voice'
      });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Validate voice components
    const voiceComponents: VoiceComponent[] = [];
    for (const voice of voices) {
      if (!voice.persona_id) {
        return res.status(400).json({
          error: 'Each voice must have a persona_id'
        });
      }
      if (typeof voice.weight !== 'number' || voice.weight <= 0) {
        return res.status(400).json({
          error: 'Each voice must have a positive weight'
        });
      }
      voiceComponents.push({
        personaId: voice.persona_id,
        o8IdentityId: voice.o8_identity_id,
        weight: voice.weight,
      });
    }

    // Validate weights sum to roughly 1 (allow some tolerance)
    const totalWeight = voiceComponents.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01 && totalWeight !== 0) {
      console.log(`[HybridSynth] Normalizing weights from sum ${totalWeight} to 1`);
    }

    console.log(`[HybridSynth] Request: ${voiceComponents.length} voices, text length: ${text.length}`);

    // Pre-validate licenses before synthesis
    const licenseCheck = await validateHybridLicenses(voiceComponents);
    if (!licenseCheck.valid) {
      return res.status(403).json({
        error: 'License validation failed',
        details: licenseCheck.errors,
      });
    }

    // Build request
    const request: HybridSynthesisRequest = {
      voices: voiceComponents,
      text,
      accentLock: accent_lock,
      routingMode: routing_mode,
      emotion,
      styleHints: style_hints ? {
        energy: style_hints.energy,
        clarity: style_hints.clarity,
        warmth: style_hints.warmth,
      } : undefined,
    };

    // Synthesize hybrid voice
    const result = await synthesizeHybrid(request);

    console.log(`[HybridSynth] Complete: ${result.durationSeconds}s, ${result.provider}, ${result.totalCostCents}¢`);

    res.json({
      success: true,
      audio_url: result.audioUrl,
      audio_path: result.audioPath,
      duration_seconds: result.durationSeconds,
      provider: result.provider,
      usage_breakdown: result.usageBreakdown.map(u => ({
        persona_id: u.personaId,
        o8_identity_id: u.o8IdentityId,
        weight: u.weight,
        seconds_used: u.secondsUsed,
        rate_per_second_cents: u.ratePerSecondCents,
        total_cents: u.totalCents,
        licensing: u.licensing,
      })),
      total_cost_cents: result.totalCostCents,
      provenance: {
        hybrid_fingerprint: result.provenance.hybridFingerprint,
        voice_ids: result.provenance.voiceIds,
        weights: result.provenance.weights,
      },
    });
  } catch (error) {
    console.error('[HybridSynth] Synthesis failed:', error);
    res.status(500).json({
      error: 'Hybrid synthesis failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/voice-clone/preview-hybrid
 * Preview a hybrid voice blend without synthesizing.
 * Returns blended profile info and provider routing decision.
 */
router.post('/preview-hybrid', async (req, res) => {
  try {
    const { voices, accent_lock, routing_mode = 'auto' } = req.body;

    if (!voices || !Array.isArray(voices) || voices.length === 0) {
      return res.status(400).json({
        error: 'voices array is required'
      });
    }

    const voiceComponents: VoiceComponent[] = voices.map((v: any) => ({
      personaId: v.persona_id,
      o8IdentityId: v.o8_identity_id,
      weight: v.weight || 1,
    }));

    // Create blended profile
    const blendedProfile = await createBlendedProfile(voiceComponents, accent_lock);

    // Determine provider
    const { determineOptimalProvider } = await import('../services/hybridSynthesis');
    const provider = determineOptimalProvider(blendedProfile, routing_mode);

    // Validate licenses
    const licenseCheck = await validateHybridLicenses(voiceComponents);

    res.json({
      success: true,
      blend_preview: {
        source_count: blendedProfile.sourceProfiles.length,
        dominant_accent: blendedProfile.dominantAccent,
        dominant_voice_type: blendedProfile.dominantVoiceType,
        characteristics: blendedProfile.characteristics,
        voices: blendedProfile.sourceProfiles.map(p => ({
          persona_id: p.personaId,
          weight: p.weight,
        })),
      },
      routing: {
        selected_provider: provider,
        routing_mode,
      },
      licensing: {
        all_valid: licenseCheck.valid,
        errors: licenseCheck.errors,
      },
    });
  } catch (error) {
    console.error('[HybridSynth] Preview failed:', error);
    res.status(500).json({
      error: 'Hybrid preview failed',
      details: (error as Error).message
    });
  }
});

export default router;
