import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';

/**
 * MiniMax Audio Voice Cloning Provider
 * Uses MiniMax's speech synthesis API for high-similarity voice cloning.
 *
 * Features:
 * - 99% speaker similarity claim
 * - Zero-shot voice cloning
 * - Multi-language support
 * - Low latency streaming synthesis
 * - Emotion and style control
 *
 * Requires: MINIMAX_API_KEY and MINIMAX_GROUP_ID environment variables
 */
export class MiniMaxProvider implements SingingProvider {
  id = 'minimax';
  label = 'MiniMax Audio';

  private apiKey: string;
  private groupId: string;
  private baseUrl = 'https://api.minimax.chat/v1';
  private voiceCache: Map<string, string> = new Map(); // personaId -> minimaxVoiceId

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || 'demo-key';
    this.groupId = process.env.MINIMAX_GROUP_ID || '';
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.apiKey === 'demo-key') {
      console.warn('[MiniMax] Demo mode - using mock synthesis');
      return this.mockSynthesize();
    }

    console.log(`[MiniMax] Synthesizing with voice model: ${request.voiceModel}`);

    try {
      const personaId = request.voiceModel.replace('cloned_', '');
      const voiceId = await this.getOrCreateVoice(personaId);

      let audioBuffer: Buffer;
      if (request.guidePath && fs.existsSync(request.guidePath)) {
        console.log(`[MiniMax] Using Speech-to-Speech with guide: ${request.guidePath}`);
        audioBuffer = await this.speechToSpeech(voiceId, request.guidePath, request.controls);
      } else {
        console.log(`[MiniMax] Using Text-to-Speech (no guide)`);
        audioBuffer = await this.textToSpeech(voiceId, request.lyrics, request.controls);
      }

      return { audioBuffer, format: 'mp3' };
    } catch (error) {
      console.error('[MiniMax] Synthesis failed:', error);
      throw error;
    }
  }

  private async getOrCreateVoice(personaId: string): Promise<string> {
    if (this.voiceCache.has(personaId)) {
      return this.voiceCache.get(personaId)!;
    }

    const voiceProfile = loadVoiceProfile(personaId);
    if (!voiceProfile) {
      throw new Error(`Voice profile not found for persona: ${personaId}`);
    }

    const voiceId = await this.createVoiceClone(personaId, voiceProfile);
    this.voiceCache.set(personaId, voiceId);
    return voiceId;
  }

  private async createVoiceClone(personaId: string, voiceProfile: any): Promise<string> {
    console.log(`[MiniMax] Creating voice clone for persona: ${personaId}`);

    const formData = new FormData();
    formData.append('voice_name', `chromox_${personaId}`);
    formData.append('file', fs.createReadStream(voiceProfile.samplePath));

    const response = await fetch(`${this.baseUrl}/voice_clone?GroupId=${this.groupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax voice clone creation failed: ${error}`);
    }

    const data: any = await response.json();
    if (data.base_resp?.status_code !== 0) {
      throw new Error(`MiniMax voice clone error: ${data.base_resp?.status_msg || 'Unknown'}`);
    }

    const voiceId = data.voice_id;
    console.log(`[MiniMax] Voice clone created: ${voiceId}`);
    return voiceId;
  }

  private async textToSpeech(voiceId: string, text: string, controls: any): Promise<Buffer> {
    // Map Chromox controls to MiniMax parameters
    const payload = {
      model: 'speech-02-hd',
      text,
      voice_setting: {
        voice_id: voiceId,
        speed: 0.8 + controls.energy * 0.4,
        pitch: Math.round(controls.formant * 12), // semitones
        vol: 1.0
      },
      audio_setting: {
        sample_rate: 44100,
        bitrate: 320000,
        format: 'mp3'
      },
      // Map emotion from Chromox controls
      ...(controls.energy > 0.7
        ? { emotion: 'excited' }
        : controls.breathiness > 0.6
          ? { emotion: 'calm' }
          : {})
    };

    const response = await fetch(
      `${this.baseUrl}/t2a_v2?GroupId=${this.groupId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax TTS failed: ${error}`);
    }

    const data: any = await response.json();
    if (data.base_resp?.status_code !== 0) {
      throw new Error(`MiniMax TTS error: ${data.base_resp?.status_msg || 'Unknown'}`);
    }

    // MiniMax returns base64 encoded audio in the response
    const audioBase64 = data.data?.audio;
    if (!audioBase64) {
      throw new Error('MiniMax TTS returned no audio data');
    }

    return Buffer.from(audioBase64, 'hex');
  }

  private async speechToSpeech(
    voiceId: string,
    guidePath: string,
    controls: any
  ): Promise<Buffer> {
    // MiniMax S2S: upload guide audio and convert with cloned voice
    const formData = new FormData();
    formData.append('voice_id', voiceId);
    formData.append('audio', fs.createReadStream(guidePath));
    formData.append('model', 'speech-02-hd');
    formData.append('sample_rate', '44100');

    const response = await fetch(
      `${this.baseUrl}/voice_convert?GroupId=${this.groupId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[MiniMax] S2S failed, falling back to TTS:', error);
      // Read guide transcript if available, otherwise use empty lyrics
      return this.textToSpeech(voiceId, '', controls);
    }

    const data: any = await response.json();
    if (data.base_resp?.status_code !== 0) {
      throw new Error(`MiniMax S2S error: ${data.base_resp?.status_msg || 'Unknown'}`);
    }

    const audioBase64 = data.data?.audio;
    if (!audioBase64) {
      throw new Error('MiniMax S2S returned no audio data');
    }

    return Buffer.from(audioBase64, 'hex');
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
