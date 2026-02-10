import { StyleControls, BeatGrid } from '../../types.js';

export type ProviderRequest = {
  voiceModel: string;
  lyrics: string;
  controls: StyleControls;
  guidePath?: string;
  guideAccentBlend?: number;
  // Enhanced accent/prosody support
  pronunciationHints?: Record<string, string>; // word → phonetic pronunciation
  phoneticLyrics?: string; // Full phonetic transcription
  accentType?: string; // e.g., "jamaican_patois", "nigerian"
  prosodyHints?: {
    rhythm: 'syllable-timed' | 'stress-timed' | 'mora-timed';
    intonation: 'rising' | 'falling' | 'flat' | 'melodic';
    tempo: 'fast' | 'moderate' | 'slow';
  };
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm';
  // Beat grid for rhythm-aware synthesis
  beatGrid?: BeatGrid;
};

export type ProviderResponse = {
  audioBuffer: Buffer;
  format: string;
};

export interface SingingProvider {
  id: string;
  label: string;
  synthesize(request: ProviderRequest): Promise<ProviderResponse>;
}
