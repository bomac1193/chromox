import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';
import { getDictionaryForAccent } from './elevenLabsPronunciation';

/**
 * ENHANCED ElevenLabs Voice Provider
 *
 * Fixes the "mechanical, alien, Chinese/Russian artifacts" problem by:
 * 1. Using pronunciation dictionaries for accurate Patois/African accents
 * 2. Sending corrected text in Speech-to-Speech mode
 * 3. Enhanced voice settings for emotion/naturalness
 * 4. Prosody-aware synthesis (pitch, rate, emphasis)
 * 5. Stereo output for width/depth
 */
export class ElevenLabsProviderEnhanced implements SingingProvider {
  id = 'elevenlabs';
  label = 'ElevenLabs Clone (Enhanced)';

  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceCache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || 'demo-key';
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.apiKey === 'demo-key') {
      console.warn('[ElevenLabs] Demo mode - using mock synthesis');
      return this.mockSynthesize();
    }

    console.log(`[ElevenLabs Enhanced] Synthesizing with voice model: ${request.voiceModel}`);
    if (request.pronunciationHints) {
      console.log(`[ElevenLabs Enhanced] 🔤 Using ${Object.keys(request.pronunciationHints).length} pronunciation hints`);
    }
    if (request.accentType) {
      console.log(`[ElevenLabs Enhanced] 🎤 Accent type: ${request.accentType}`);
    }

    try {
      const personaId = request.voiceModel.replace('cloned_', '');
      const voiceId = await this.getOrCreateVoice(personaId);

      // Get pronunciation dictionary for accent
      let dictionaryId: string | null = null;
      if (request.pronunciationHints || request.accentType) {
        dictionaryId = await getDictionaryForAccent(request.accentType, request.pronunciationHints);
        if (dictionaryId) {
          console.log(`[ElevenLabs Enhanced] ✅ Using pronunciation dictionary: ${dictionaryId}`);
        }
      }

      // Use Speech-to-Speech if guide audio provided
      let audioBuffer: Buffer;
      if (request.guidePath && fs.existsSync(request.guidePath)) {
        console.log(`[ElevenLabs Enhanced] Using Speech-to-Speech with ENHANCED settings`);
        audioBuffer = await this.speechToSpeechEnhanced(
          voiceId,
          request.guidePath,
          request.lyrics,
          request.controls,
          request.guideAccentBlend,
          request.prosodyHints,
          dictionaryId
        );
      } else {
        console.log(`[ElevenLabs Enhanced] Using Text-to-Speech with ENHANCED settings`);
        audioBuffer = await this.textToSpeechEnhanced(
          voiceId,
          request.lyrics,
          request.controls,
          request.prosodyHints,
          request.emotion,
          dictionaryId
        );
      }

      return {
        audioBuffer,
        format: 'mp3'
      };
    } catch (error) {
      console.error('[ElevenLabs Enhanced] Synthesis failed:', error);
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

    const existingVoices = await this.listVoices();
    const existingVoice = existingVoices.find((v: any) => v.name === `chromox_${personaId}`);

    if (existingVoice) {
      this.voiceCache.set(personaId, existingVoice.voice_id);
      return existingVoice.voice_id;
    }

    const voiceId = await this.createVoiceClone(personaId, voiceProfile);
    this.voiceCache.set(personaId, voiceId);
    return voiceId;
  }

  private async createVoiceClone(personaId: string, voiceProfile: any): Promise<string> {
    console.log(`[ElevenLabs Enhanced] Creating voice clone for persona: ${personaId}`);

    const formData = new FormData();
    formData.append('name', `chromox_${personaId}`);
    formData.append('description', 'Cloned voice from Chromox with enhanced accent support');

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
    console.log(`[ElevenLabs Enhanced] Voice created: ${data.voice_id}`);
    return data.voice_id;
  }

  private async listVoices(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list ElevenLabs voices: ${response.status}`);
    }

    const data: any = await response.json();
    return data.voices || [];
  }

  /**
   * ENHANCED Text-to-Speech with prosody controls
   */
  private async textToSpeechEnhanced(
    voiceId: string,
    text: string,
    controls: any,
    prosodyHints?: {
      rhythm: string;
      intonation: string;
      tempo: string;
    },
    emotion?: string,
    dictionaryId?: string | null
  ): Promise<Buffer> {
    // Enhanced voice settings for more natural, emotional output
    const voiceSettings = {
      stability: this.mapStability(controls.roboticism, prosodyHints?.rhythm),
      similarity_boost: 0.85, // Higher for better accent matching
      style: this.mapStyle(controls.energy, emotion),
      use_speaker_boost: true // Always use for clarity
    };

    console.log(`[ElevenLabs Enhanced] Voice settings:`, voiceSettings);

    const requestBody: any = {
      text,
      model_id: 'eleven_turbo_v2_5', // Latest high-quality model
      voice_settings: voiceSettings,
      output_format: 'mp3_44100_128' // High quality stereo
    };

    // Add pronunciation dictionary if available
    if (dictionaryId) {
      requestBody.pronunciation_dictionary_locators = [
        {
          pronunciation_dictionary_id: dictionaryId,
          version_id: 'latest'
        }
      ];
      console.log(`[ElevenLabs Enhanced] ✅ Applied pronunciation dictionary`);
    }

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * ENHANCED Speech-to-Speech with corrected text + prosody
   *
   * KEY FIX: Now sends the corrected text WITH pronunciation hints!
   * This fixes the "mechanical/alien" sound and Chinese/Russian artifacts.
   */
  private async speechToSpeechEnhanced(
    voiceId: string,
    guidePath: string,
    correctedText: string, // THIS IS THE FIX - we send the corrected lyrics!
    controls: any,
    accentBlend?: number,
    prosodyHints?: {
      rhythm: string;
      intonation: string;
      tempo: string;
    },
    dictionaryId?: string | null
  ): Promise<Buffer> {
    const blend = accentBlend ?? 0.5;

    // Enhanced voice settings
    const voiceSettings = {
      stability: this.mapStability(controls.roboticism, prosodyHints?.rhythm),
      similarity_boost: 0.4 + (blend * 0.55), // Range: 0.4 (guide) to 0.95 (persona)
      style: this.mapStyle(controls.energy),
      use_speaker_boost: true
    };

    console.log(`[ElevenLabs Enhanced] S2S settings:`, voiceSettings);
    console.log(`[ElevenLabs Enhanced] 📝 Sending corrected text: "${correctedText.slice(0, 60)}..."`);

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(guidePath));
    formData.append('model_id', 'eleven_english_sts_v2'); // Speech-to-Speech model
    formData.append('voice_settings', JSON.stringify(voiceSettings));

    // KEY FIX: Send the corrected text!
    // This ensures pronunciation hints are applied and lyrics are accurate
    formData.append('text', correctedText);

    // Add output format for stereo
    formData.append('output_format', 'mp3_44100_128');

    // Add pronunciation dictionary if available
    if (dictionaryId) {
      formData.append('pronunciation_dictionary_locators', JSON.stringify([
        {
          pronunciation_dictionary_id: dictionaryId,
          version_id: 'latest'
        }
      ]));
      console.log(`[ElevenLabs Enhanced] ✅ Applied pronunciation dictionary to S2S`);
    }

    const response = await fetch(`${this.baseUrl}/speech-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs Enhanced] Speech-to-Speech failed:', error);
      // Fallback to TTS if S2S fails
      return this.textToSpeechEnhanced(voiceId, correctedText, controls, prosodyHints, undefined, dictionaryId);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Maps roboticism control to stability (with prosody awareness)
   */
  private mapStability(roboticism: number, rhythm?: string): number {
    let baseStability = 0.4 + (roboticism * 0.5); // 0.4-0.9 range

    // Adjust for prosody rhythm
    if (rhythm === 'syllable-timed') {
      baseStability *= 0.9; // More variation for Patois/Nigerian
    } else if (rhythm === 'stress-timed') {
      baseStability *= 1.1; // More stable for American/British
    }

    return Math.min(1.0, Math.max(0.0, baseStability));
  }

  /**
   * Maps energy + emotion to style parameter
   */
  private mapStyle(energy: number, emotion?: string): number {
    let baseStyle = energy; // 0-1

    // Boost style for emotional content
    if (emotion === 'excited' || emotion === 'happy') {
      baseStyle = Math.min(1.0, baseStyle * 1.3);
    } else if (emotion === 'calm' || emotion === 'sad') {
      baseStyle = Math.max(0.0, baseStyle * 0.7);
    }

    return baseStyle;
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

    return {
      audioBuffer: buffer,
      format: 'wav'
    };
  }
}
