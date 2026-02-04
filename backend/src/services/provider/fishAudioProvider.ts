import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';

/**
 * Fish Audio Voice Cloning Provider
 * Uses Fish Audio's API for high-quality voice cloning and synthesis.
 *
 * Features:
 * - 10-second minimum voice cloning (zero-shot)
 * - 91% cheaper than ElevenLabs at comparable quality
 * - Multi-language support including African/Caribbean dialects
 * - Text-to-Speech and Speech-to-Speech modes
 *
 * Requires: FISH_AUDIO_API_KEY environment variable
 */
export class FishAudioProvider implements SingingProvider {
  id = 'fish-audio';
  label = 'Fish Audio';

  private apiKey: string;
  private baseUrl = 'https://api.fish.audio/v1';
  private voiceCache: Map<string, string> = new Map(); // personaId -> fishAudioModelId

  constructor() {
    this.apiKey = process.env.FISH_AUDIO_API_KEY || 'demo-key';
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.apiKey === 'demo-key') {
      console.warn('[FishAudio] Demo mode - using mock synthesis');
      return this.mockSynthesize();
    }

    console.log(`[FishAudio] Synthesizing with voice model: ${request.voiceModel}`);

    try {
      const personaId = request.voiceModel.replace('cloned_', '');
      const modelId = await this.getOrCreateModel(personaId);

      let audioBuffer: Buffer;
      if (request.guidePath && fs.existsSync(request.guidePath)) {
        console.log(`[FishAudio] Using Speech-to-Speech with guide: ${request.guidePath}`);
        audioBuffer = await this.speechToSpeech(modelId, request.guidePath, request.controls);
      } else {
        console.log(`[FishAudio] Using Text-to-Speech (no guide)`);
        audioBuffer = await this.textToSpeech(modelId, request.lyrics, request.controls);
      }

      return { audioBuffer, format: 'mp3' };
    } catch (error) {
      console.error('[FishAudio] Synthesis failed:', error);
      throw error;
    }
  }

  private async getOrCreateModel(personaId: string): Promise<string> {
    if (this.voiceCache.has(personaId)) {
      return this.voiceCache.get(personaId)!;
    }

    const voiceProfile = loadVoiceProfile(personaId);
    if (!voiceProfile) {
      throw new Error(`Voice profile not found for persona: ${personaId}`);
    }

    // Create a new voice model from the reference sample
    const modelId = await this.createVoiceModel(personaId, voiceProfile);
    this.voiceCache.set(personaId, modelId);
    return modelId;
  }

  private async createVoiceModel(personaId: string, voiceProfile: any): Promise<string> {
    console.log(`[FishAudio] Creating voice model for persona: ${personaId}`);

    const formData = new FormData();
    formData.append('title', `chromox_${personaId}`);
    formData.append('description', 'Cloned voice from Chromox');
    formData.append('train_mode', 'fast'); // Zero-shot cloning
    formData.append('voices', fs.createReadStream(voiceProfile.samplePath));

    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fish Audio model creation failed: ${error}`);
    }

    const data: any = await response.json();
    console.log(`[FishAudio] Model created: ${data._id}`);
    return data._id;
  }

  private async textToSpeech(modelId: string, text: string, controls: any): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        reference_id: modelId,
        format: 'mp3',
        latency: 'normal',
        streaming: false,
        // Map Chromox controls to Fish Audio parameters
        prosody: {
          speed: 0.8 + controls.energy * 0.4, // 0.8–1.2
          pitch: controls.formant * 12 // semitones shift
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fish Audio TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async speechToSpeech(modelId: string, guidePath: string, controls: any): Promise<Buffer> {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(guidePath));
    formData.append('reference_id', modelId);
    formData.append('format', 'mp3');

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fish Audio S2S failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private mockSynthesize(): ProviderResponse {
    const sampleRate = 44100;
    const duration = 2;
    const samples = sampleRate * duration;
    const buffer = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * 440 * t) * 0.3;
      buffer.writeInt16LE(value * 32767, i * 2);
    }
    return { audioBuffer: buffer, format: 'wav' };
  }
}
