import fetch from 'node-fetch';
import { config } from '../../config';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';

export class KitsAiProvider implements SingingProvider {
  id = 'kits-ai';
  label = 'Kits AI';

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (config.provider.kitsAiApiKey === 'demo-key') {
      return { audioBuffer: this.mockBuffer(), format: 'wav' };
    }

    // Chromox Nebula Tone Network delegates persona rendering here.
    const payload = {
      voice_model_id: request.voiceModel,
      lyrics: request.lyrics,
      controls: request.controls,
      guide_path: request.guidePath
    };

    const response = await fetch('https://api.kits.ai/v1/sing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.provider.kitsAiApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Kits AI synthesis failed');
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      format: 'wav'
    };
  }

  private mockBuffer() {
    const sampleRate = 44100;
    const duration = 1;
    const samples = sampleRate * duration;
    const buffer = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      const value = Math.sin((i / sampleRate) * Math.PI * 2 * 440);
      buffer.writeInt16LE(value * 32767, i * 2);
    }
    return buffer;
  }
}
