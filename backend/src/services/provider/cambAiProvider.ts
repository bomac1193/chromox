import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';

/**
 * CAMB.AI MARS8 Voice Cloning Provider
 * Highest fidelity voice cloning — clones from as little as 2.3 seconds of audio.
 *
 * Features:
 * - Ultra-fast cloning from minimal audio (2.3s minimum)
 * - 0.87 WavLM speaker similarity (industry-leading)
 * - Multi-language support (40+ languages)
 * - Zero-shot voice cloning with studio-grade output
 * - Accent preservation for African/Caribbean dialects
 *
 * Requires: CAMB_AI_API_KEY environment variable
 */
export class CambAiProvider implements SingingProvider {
  id = 'camb-ai';
  label = 'CAMB.AI MARS8 (Ultra Clone)';

  private apiKey: string;
  private baseUrl = 'https://api.camb.ai/apis';
  private voiceCache: Map<string, string> = new Map(); // personaId -> cambVoiceId

  constructor() {
    this.apiKey = process.env.CAMB_AI_API_KEY || 'demo-key';
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.apiKey === 'demo-key') {
      console.warn('[CAMB.AI] Demo mode - using mock synthesis');
      return this.mockSynthesize();
    }

    console.log(`[CAMB.AI] Synthesizing with voice model: ${request.voiceModel}`);

    try {
      const personaId = request.voiceModel.replace('cloned_', '');
      const voiceId = await this.getOrCreateVoice(personaId);

      let audioBuffer: Buffer;
      if (request.guidePath && fs.existsSync(request.guidePath)) {
        console.log(`[CAMB.AI] Using Speech-to-Speech with guide: ${request.guidePath}`);
        audioBuffer = await this.speechToSpeech(voiceId, request.guidePath, request.controls);
      } else {
        console.log(`[CAMB.AI] Using Text-to-Speech (no guide)`);
        audioBuffer = await this.textToSpeech(voiceId, request.lyrics, request.controls);
      }

      return { audioBuffer, format: 'wav' };
    } catch (error) {
      console.error('[CAMB.AI] Synthesis failed:', error);
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

  /**
   * Creates an instant voice clone from the reference sample.
   * MARS8 requires only 2.3 seconds of clean audio for high-fidelity cloning.
   */
  private async createVoiceClone(personaId: string, voiceProfile: any): Promise<string> {
    console.log(`[CAMB.AI] Creating MARS8 voice clone for persona: ${personaId}`);

    const formData = new FormData();
    formData.append('name', `chromox_${personaId}`);
    formData.append('model', 'mars8');
    formData.append('audio', fs.createReadStream(voiceProfile.samplePath));

    const response = await fetch(`${this.baseUrl}/voice-clone`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CAMB.AI voice clone creation failed: ${error}`);
    }

    const data: any = await response.json();
    console.log(`[CAMB.AI] Voice clone created: ${data.voice_id}`);
    return data.voice_id;
  }

  private async textToSpeech(voiceId: string, text: string, controls: any): Promise<Buffer> {
    // Map Chromox controls to CAMB.AI MARS8 parameters
    const payload = {
      text,
      voice_id: voiceId,
      model: 'mars8',
      output_format: 'wav',
      speed: 0.8 + controls.energy * 0.4,
      stability: 0.5 + controls.roboticism * 0.5,
      similarity: 0.9, // MARS8 excels at high similarity — keep it high
      style_exaggeration: controls.breathiness * 0.5
    };

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CAMB.AI TTS failed: ${error}`);
    }

    // CAMB.AI returns a task ID; poll for completion
    const taskData: any = await response.json();
    return this.pollForResult(taskData.task_id);
  }

  private async speechToSpeech(
    voiceId: string,
    guidePath: string,
    controls: any
  ): Promise<Buffer> {
    const formData = new FormData();
    formData.append('voice_id', voiceId);
    formData.append('model', 'mars8');
    formData.append('audio', fs.createReadStream(guidePath));
    formData.append('output_format', 'wav');
    formData.append('similarity', '0.9');

    const response = await fetch(`${this.baseUrl}/speech-to-speech`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CAMB.AI S2S failed: ${error}`);
    }

    const taskData: any = await response.json();
    return this.pollForResult(taskData.task_id);
  }

  /**
   * CAMB.AI uses async task processing. Poll until the task completes
   * and then download the resulting audio.
   */
  private async pollForResult(taskId: string): Promise<Buffer> {
    const maxAttempts = 60;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: { 'x-api-key': this.apiKey }
      });

      if (!response.ok) {
        throw new Error(`CAMB.AI task poll failed: ${response.status}`);
      }

      const task: any = await response.json();

      if (task.status === 'completed' && task.output_url) {
        console.log(`[CAMB.AI] Task ${taskId} completed, downloading audio`);
        const audioResponse = await fetch(task.output_url);
        const arrayBuffer = await audioResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      if (task.status === 'failed') {
        throw new Error(`CAMB.AI task failed: ${task.error || 'Unknown error'}`);
      }

      // Still processing — wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`CAMB.AI task ${taskId} timed out after ${maxAttempts * pollInterval / 1000}s`);
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
