import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { EffectSettings } from '../types';
import { processWithAdvancedEngine } from './effectsEngineClient';

const execAsync = promisify(exec);

export const defaultEffectSettings: EffectSettings = {
  engine: 'rave-ddsp-8d',
  preset: 'clean',
  clarity: 0.7,
  air: 0.4,
  drive: 0.15,
  width: 0.5,
  noiseReduction: 0.4,
  space: 'studio',
  dynamics: 0.6,
  orbitSpeed: 0.5,
  orbitDepth: 0.8,
  orbitTilt: 0.5,
  bypassEffects: false
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function buildFilterChain(settings: EffectSettings) {
  const clarityGain = (clamp(settings.clarity) * 8 - 2).toFixed(2);
  const airGain = (clamp(settings.air) * 6).toFixed(2);
  const width = clamp(settings.width);
  const noise = clamp(settings.noiseReduction);
  const noiseReductionStrength = Math.min(0.3, Math.max(0.02, 0.05 + noise * 0.22));
  const dynamics = 1 + clamp(settings.dynamics) * 3.5;

  // Improved reverb with actual convolution-like effects
  const spaceMap = {
    dry: 'aecho=0.3:0.3:1:0.05',
    studio: 'aecho=0.6:0.5:15|25:0.25|0.15,aecho=0.7:0.6:40:0.12',
    hall: 'aecho=0.8:0.7:50|80:0.35|0.22,aecho=0.85:0.75:120:0.15',
    arena: 'aecho=0.9:0.85:100|150|200:0.4|0.3|0.2,aecho=0.92:0.88:250:0.12'
  } as const;
  const spaceFilter = spaceMap[settings.space] ?? spaceMap.studio;

  // Proper stereo widening - extrastereo actually widens the stereo image
  // m ranges from -10 (narrow) to 10 (very wide). 0 = no change, 1 = slight widening
  const stereoAmount = width < 0.5
    ? (width - 0.5) * 4  // narrow if width < 0.5
    : (width - 0.5) * 6; // widen if width > 0.5
  const stereoFilter = `extrastereo=m=${stereoAmount.toFixed(2)}:c=0`;

  // De-esser: reduce harsh sibilance around 6-8kHz
  const deEsserGain = -3; // reduce by 3dB
  const deEsser = `equalizer=f=7000:t=q:width=3000:g=${deEsserGain}`;

  const filters = [
    `aresample=48000`,
    deEsser, // De-ess early in chain
    `equalizer=f=3200:t=h:width=1200:g=${clarityGain}`,
    `highshelf=f=8000:g=${airGain}`,
    `acompressor=threshold=-12dB:ratio=${dynamics.toFixed(2)}:attack=5:release=120`,
    stereoFilter, // Proper stereo widening
    `anlmdn=s=${(noise * 15 + 5).toFixed(0)}:p=0.02:r=${noiseReductionStrength.toFixed(2)}`,
    spaceFilter
  ];

  return filters.join(',');
}

function applyPreset(settings: EffectSettings): EffectSettings {
  switch (settings.preset) {
    case 'lush':
      return {
        ...settings,
        clarity: 0.65,        // Smooth clarity
        air: 0.75,            // Lots of air for openness
        drive: 0.1,           // Minimal drive
        width: 0.85,          // Wide stereo image
        noiseReduction: 0.5,  // Clean but not over-processed
        space: 'studio',      // Studio reverb for depth
        dynamics: 0.55        // Moderate compression
      };
    case 'vintage':
      return {
        ...settings,
        clarity: 0.4,
        air: 0.3,
        drive: 0.35,
        width: 0.45,
        noiseReduction: 0.2,
        space: 'hall',
        dynamics: 0.5
      };
    case 'club':
      return {
        ...settings,
        clarity: 0.8,
        air: 0.6,
        drive: 0.25,
        width: 0.8,
        noiseReduction: 0.3,
        space: 'arena',
        dynamics: 0.7
      };
    case 'raw':
      return {
        ...settings,
        clarity: 0.35,
        air: 0.2,
        drive: 0.1,
        width: 0.5,
        noiseReduction: 0.1,
        space: 'dry',
        dynamics: 0.4
      };
    case 'clean':
    default:
      return settings;
  }
}

export async function applyAdvancedEffects(
  inputPath: string,
  settings: EffectSettings,
  previewSeconds?: number
): Promise<string> {
  if (settings?.bypassEffects) {
    return inputPath;
  }

  const appliedSettings = applyPreset(settings);

  if (settings.engine && settings.engine !== 'chromox-labs') {
    try {
      return await processWithAdvancedEngine(inputPath, appliedSettings, previewSeconds);
    } catch (error) {
      console.error('[Effects] External engine failed, falling back to Chromox Labs chain.', error);
    }
  }

  const targetDir = path.dirname(inputPath);
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(targetDir, `${fileName}-hq.wav`);

  const filters = buildFilterChain(appliedSettings);
  const command = `ffmpeg -y -hide_banner -loglevel error -i "${inputPath}" -af "${filters}" -c:a pcm_s24le "${outputPath}"`;

  try {
    await execAsync(command);
    return outputPath;
  } catch (error) {
    console.error('[Effects] Advanced processing failed, falling back to raw output.', error);
    // Ensure at least 24-bit conversion happens
    try {
      await execAsync(
        `ffmpeg -y -hide_banner -loglevel error -i "${inputPath}" -c:a pcm_s24le "${outputPath}"`
      );
      return outputPath;
    } catch (conversionError) {
      console.error('[Effects] Conversion fallback failed:', conversionError);
      if (fs.existsSync(outputPath)) {
        return outputPath;
      }
      return inputPath;
    }
  }
}
