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
  is_cloned?: boolean;
  voice_profile?: VoiceProfile;
  clone_source?: 'upload' | 'recording' | 'external';
};

export type RenderJob = {
  personaId: string;
  lyrics: string;
  guideFile?: File;
  stylePrompt: string;
  controls: StyleControls;
};
