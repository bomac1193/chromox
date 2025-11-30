export type StyleControls = {
  brightness: number;
  breathiness: number;
  energy: number;
  formant: number;
  vibratoDepth: number;
  vibratoRate: number;
  roboticism: number;
  glitch: number;
  stereoWidth: number;
};

export type EffectSettings = {
  engine:
    | 'chromox-labs'
    | 'izotope-nectar'
    | 'waves-clarity'
    | 'antelope-synergy'
    | 'rave-ddsp'
    | 'rave-ddsp-8d'
    | 'resonance-8d';
  preset?: 'clean' | 'vintage' | 'club' | 'raw' | 'shimmer-stack' | 'harmonic-orbit' | 'pitch-warp' | 'choir-cloud' | '8d-swarm';
  clarity: number;
  air: number;
  drive: number;
  width: number;
  noiseReduction: number;
  space: 'dry' | 'studio' | 'hall' | 'arena';
  dynamics: number;
  orbitSpeed?: number;
  orbitDepth?: number;
  orbitTilt?: number;
  bypassEffects?: boolean;
};

export type GuideSample = {
  id: string;
  name: string;
  originalName: string;
  path: string;
  uploaded_at: string;
};

export type VoiceProfile = {
  characteristics: {
    pitchRange: { min: number; max: number; mean: number };
    formants: number[];
    spectralCentroid: number;
    spectralRolloff: number;
    breathiness: number;
    brightness: number;
    timbre: number[];
    vibratoRate: number;
    vibratoDepth: number;
    energyMean: number;
  };
  embedding: {
    embedding: number[];
    provider: 'openai' | 'rvc' | 'elevenlabs' | 'chromox';
    modelVersion: string;
  };
  samplePath: string;
  sampleDuration: number;
  analysisTimestamp: string;
};

export type Persona = {
  id: string;
  name: string;
  description: string;
  voice_model_key: string;
  provider: string;
  default_style_controls: StyleControls;
  created_at: string;
  image_url?: string;
  image_focus_x?: number;
  image_focus_y?: number;
  is_cloned?: boolean;
  voice_profile?: VoiceProfile;
  clone_source?: 'upload' | 'recording' | 'external';
  guide_samples?: GuideSample[];
};

export type RenderJob = {
  personaId: string;
  lyrics: string;
  guideFile?: File;
  stylePrompt: string;
  controls: StyleControls;
  effects: EffectSettings;
  label?: string;
  accent?: string;
  accentLocked?: boolean;
  guideSampleId?: string;
  guideMatchIntensity?: number;
  guideUseLyrics?: boolean;
  guideTempo?: number;
};

export type RenderHistoryItem = {
  id: string;
  personaId: string;
  personaName: string;
  lyrics: string;
  stylePrompt: string;
  controls: StyleControls;
  effects: EffectSettings;
  label?: string;
  audioPath: string;
  audioUrl: string;
  created_at: string;
  guideFilePath?: string;
  personaImage?: string;
  accent?: string;
  accentLocked?: boolean;
  guideSampleId?: string;
  guideMatchIntensity?: number;
  guideUseLyrics?: boolean;
  guideTempo?: number;
};
