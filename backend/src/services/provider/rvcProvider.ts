import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { ProviderRequest, ProviderResponse, SingingProvider } from './base';
import { loadVoiceProfile } from '../voiceAnalysis';

const execAsync = promisify(exec);

/**
 * RVC (Retrieval-based Voice Conversion) Provider
 * Uses the RVC model for high-quality voice cloning and conversion.
 *
 * Requirements:
 * - RVC Python environment installed
 * - Voice model trained from the cloned voice sample
 *
 * This provider offers the highest quality voice cloning with full
 * control over pitch, timbre, and vocal characteristics.
 */
export class RVCProvider implements SingingProvider {
  id = 'rvc';
  label = 'RVC Voice Clone';

  private rvcPath: string;
  private modelsPath: string;

  constructor() {
    this.rvcPath = process.env.RVC_PATH || '/opt/RVC';
    this.modelsPath = path.join(process.cwd(), 'rvc_models');
    fs.mkdirSync(this.modelsPath, { recursive: true });
  }

  async synthesize(request: ProviderRequest): Promise<ProviderResponse> {
    console.log(`[RVC] Synthesizing with voice model: ${request.voiceModel}`);

    // Extract persona ID from voice model key
    const personaId = request.voiceModel.replace('cloned_', '');

    // Load voice profile
    const voiceProfile = loadVoiceProfile(personaId);
    if (!voiceProfile) {
      throw new Error(`Voice profile not found for model: ${request.voiceModel}`);
    }

    // Check if RVC is available
    if (!this.isRVCAvailable()) {
      console.warn('[RVC] RVC not available, using mock synthesis');
      return this.mockSynthesize(request, voiceProfile);
    }

    try {
      // Step 1: Generate base vocals using TTS or existing guide
      const baseVocalPath = request.guidePath || (await this.generateBaseTTS(request.lyrics));

      // Step 2: Apply RVC voice conversion
      const convertedPath = await this.applyRVCConversion(baseVocalPath, voiceProfile);

      // Step 3: Apply style controls (pitch shift, formant, effects)
      const finalPath = await this.applyStyleControls(convertedPath, request.controls);

      // Read the final audio file
      const audioBuffer = fs.readFileSync(finalPath);

      // Cleanup temporary files
      this.cleanup(baseVocalPath, convertedPath, finalPath);

      return {
        audioBuffer,
        format: 'wav'
      };
    } catch (error) {
      console.error('[RVC] Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Checks if RVC is available on the system
   */
  private isRVCAvailable(): boolean {
    return fs.existsSync(this.rvcPath);
  }

  /**
   * Generates base vocals using TTS (espeak, piper, or other TTS engine)
   */
  private async generateBaseTTS(lyrics: string): Promise<string> {
    const tempPath = path.join(process.cwd(), 'temp', `tts_${Date.now()}.wav`);
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });

    // Use espeak for basic TTS (can be replaced with better TTS)
    await execAsync(`espeak "${lyrics}" --stdout | ffmpeg -i pipe:0 "${tempPath}"`);

    return tempPath;
  }

  /**
   * Applies RVC voice conversion to transform the base vocal into the cloned voice
   */
  private async applyRVCConversion(inputPath: string, voiceProfile: any): Promise<string> {
    const outputPath = path.join(process.cwd(), 'temp', `rvc_${Date.now()}.wav`);

    // In production, this would call the RVC inference script
    // python infer.py --input <inputPath> --model <modelPath> --output <outputPath>

    const modelPath = path.join(this.modelsPath, `${voiceProfile.samplePath}.pth`);

    // Check if we have a trained model, otherwise use the reference sample
    if (!fs.existsSync(modelPath)) {
      console.log('[RVC] Model not found, using reference sample for quick conversion');
      // For MVP, just copy the reference sample (in production, would train RVC model)
      fs.copyFileSync(voiceProfile.samplePath, outputPath);
      return outputPath;
    }

    // Execute RVC inference
    await execAsync(
      `python "${this.rvcPath}/infer.py" --input "${inputPath}" --model "${modelPath}" --output "${outputPath}" --pitch 0`
    );

    return outputPath;
  }

  /**
   * Applies style controls (effects, pitch shift, formant shift, etc.)
   */
  private async applyStyleControls(inputPath: string, controls: any): Promise<string> {
    const outputPath = path.join(process.cwd(), 'temp', `styled_${Date.now()}.wav`);

    // Build FFmpeg filter chain based on controls
    const filters = [];

    // Pitch shift
    if (controls.formant !== 0) {
      const semitones = controls.formant * 12; // ±12 semitones
      filters.push(`asetrate=44100*${Math.pow(2, semitones / 12)},aresample=44100`);
    }

    // Vibrato
    if (controls.vibratoDepth > 0) {
      const freq = controls.vibratoRate * 10; // 0-10 Hz
      const depth = controls.vibratoDepth; // 0-1
      filters.push(`vibrato=f=${freq}:d=${depth}`);
    }

    // Brightness (EQ)
    if (controls.brightness !== 0.5) {
      const gain = (controls.brightness - 0.5) * 12; // ±6dB
      filters.push(`treble=g=${gain}:f=3000`);
    }

    // Breathiness (add subtle noise)
    if (controls.breathiness > 0.3) {
      filters.push(`anoisesrc=a=0.${Math.floor(controls.breathiness * 10)}:d=0`);
    }

    // Stereo width
    if (controls.stereoWidth !== 0.5) {
      const width = controls.stereoWidth * 2; // 0-2
      filters.push(`stereotools=mwi=${width}`);
    }

    const filterChain = filters.join(',');

    if (filterChain) {
      await execAsync(`ffmpeg -i "${inputPath}" -af "${filterChain}" "${outputPath}"`);
    } else {
      fs.copyFileSync(inputPath, outputPath);
    }

    return outputPath;
  }

  /**
   * Mock synthesis for when RVC is not available
   */
  private mockSynthesize(request: ProviderRequest, voiceProfile: any): ProviderResponse {
    console.log('[RVC] Using mock synthesis (RVC not installed)');

    // Return the reference sample as a placeholder
    const audioBuffer = fs.readFileSync(voiceProfile.samplePath);

    return {
      audioBuffer,
      format: 'wav'
    };
  }

  /**
   * Cleanup temporary files
   */
  private cleanup(...paths: string[]) {
    paths.forEach((p) => {
      if (fs.existsSync(p) && p.includes('temp')) {
        fs.unlinkSync(p);
      }
    });
  }
}
