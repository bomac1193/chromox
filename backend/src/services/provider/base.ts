import { StyleControls } from '../../types';

export type ProviderRequest = {
  voiceModel: string;
  lyrics: string;
  controls: StyleControls;
  guidePath?: string;
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
