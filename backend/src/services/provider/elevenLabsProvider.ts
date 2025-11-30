import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';

/**
 * ElevenLabs Voice Cloning Provider
 * Uses ElevenLabs' professional voice cloning API for ultra-high-quality synthesis.
 *
 * Features:
 * - Instant voice cloning from samples
 * - Professional-grade TTS with emotion control
 * - Multilingual support
 * - Voice design studio integration
 *
 * Requires: ELEVENLABS_API_KEY environment variable
 */
export class ElevenLabsProvider implements SingingProvider {
  id = 'elevenlabs';
  label = 'ElevenLabs Clone';

  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceCache: Map<string, string> = new Map(); // personaId -> elevenLabsVoiceId

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || 'demo-key';
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.apiKey === 'demo-key') {
      console.warn('[ElevenLabs] Demo mode - using mock synthesis');
      return this.mockSynthesize();
    }

    console.log(`[ElevenLabs] Synthesizing with voice model: ${request.voiceModel}`);

    try {
      // Extract persona ID from voice model key
      const personaId = request.voiceModel.replace('cloned_', '');

      // Get or create ElevenLabs voice ID for this persona
      const voiceId = await this.getOrCreateVoice(personaId);

      // Convert lyrics to speech with cloned voice
      const audioBuffer = await this.textToSpeech(voiceId, request.lyrics, request.controls);

      return {
        audioBuffer,
        format: 'mp3'
      };
    } catch (error) {
      console.error('[ElevenLabs] Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Gets existing ElevenLabs voice ID or creates a new cloned voice
   */
  private async getOrCreateVoice(personaId: string): Promise<string> {
    // Check cache first
    if (this.voiceCache.has(personaId)) {
      return this.voiceCache.get(personaId)!;
    }

    // Load voice profile
    const voiceProfile = loadVoiceProfile(personaId);
    if (!voiceProfile) {
      throw new Error(`Voice profile not found for persona: ${personaId}`);
    }

    // Check if voice already exists in ElevenLabs
    const existingVoices = await this.listVoices();
    const existingVoice = existingVoices.find((v: any) => v.name === `chromox_${personaId}`);

    if (existingVoice) {
      this.voiceCache.set(personaId, existingVoice.voice_id);
      return existingVoice.voice_id;
    }

    // Create new voice clone
    const voiceId = await this.createVoiceClone(personaId, voiceProfile);
    this.voiceCache.set(personaId, voiceId);

    return voiceId;
  }

  /**
   * Creates a voice clone in ElevenLabs from the voice sample
   */
  private async createVoiceClone(personaId: string, voiceProfile: any): Promise<string> {
    console.log(`[ElevenLabs] Creating voice clone for persona: ${personaId}`);

    const formData = new FormData();
    formData.append('name', `chromox_${personaId}`);
    formData.append('description', 'Cloned voice from Chromox');

    // Upload the reference sample
    const sampleStream = fs.createReadStream(voiceProfile.samplePath);
    formData.append('files', sampleStream);

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs voice creation failed: ${error}`);
    }

    const data: any = await response.json();
    console.log(`[ElevenLabs] Voice created: ${data.voice_id}`);

    return data.voice_id;
  }

  /**
   * Lists all voices in the ElevenLabs account
   */
  private async listVoices(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs] API Error (${response.status}):`, errorText);
      throw new Error(`Failed to list ElevenLabs voices: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.voices || [];
  }

  /**
   * Converts text to speech using the cloned voice
   */
  private async textToSpeech(voiceId: string, text: string, controls: any): Promise<Buffer> {
    // Map Chromox controls to ElevenLabs voice settings
    const voiceSettings = {
      stability: 0.5 + controls.roboticism * 0.5, // More robotic = more stable
      similarity_boost: 0.75, // How closely to match the original voice
      style: controls.energy, // Expressive style (0-1)
      use_speaker_boost: true
    };

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2', // Best quality model
        voice_settings: voiceSettings
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Mock synthesis for demo mode
   */
  private mockSynthesize(): ProviderResponse {
    // Generate a simple sine wave as placeholder
    const sampleRate = 44100;
    const duration = 2;
    const samples = sampleRate * duration;
    const buffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * 440 * t) * 0.3;
      buffer.writeInt16LE(value * 32767, i * 2);
    }

    return {
      audioBuffer: buffer,
      format: 'wav'
    };
  }
}
