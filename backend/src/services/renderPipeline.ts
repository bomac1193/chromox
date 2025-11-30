import fs from 'fs';
import path from 'path';
import { EffectSettings, RenderPayload } from '../types';
import { extractPitchAndTiming, extractVocalStem, transcribeLyrics } from './dsp';
import { promptToControls } from './llm';
import { SingingProvider } from './provider/base';
import { applyAdvancedEffects, defaultEffectSettings } from './effectsProcessor';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ChromaticCorePipeline {
  constructor(private provider: SingingProvider) {}

  async run(payload: RenderPayload) {
    const guideData = payload.guideFilePath ? await extractVocalStem(payload.guideFilePath) : undefined;
    const pitchData = guideData ? await extractPitchAndTiming(guideData.stemPath) : undefined;
    const lyricsData = await transcribeLyrics(guideData?.stemPath ?? '');

    const accentFragment =
      payload.accentLocked && payload.accent ? ` accent:${payload.accent}` : '';
    const guideFragment =
      payload.guideMatchIntensity !== undefined
        ? ` guideMatch:${Math.round(payload.guideMatchIntensity * 100)}%`
        : '';
    const stylePromptWithAccent = `${payload.stylePrompt} ${accentFragment}${guideFragment}`.trim();

    let baseLyrics = payload.lyrics;
    if (payload.guideUseLyrics && guideData?.stemPath) {
      const guideTranscript = await transcribeLyrics(guideData.stemPath);
      if (guideTranscript.transcript.trim()) {
        baseLyrics = guideTranscript.transcript;
      }
    }
    const finalLyrics = baseLyrics;
    const promptControls = await promptToControls(stylePromptWithAccent);
    const mergedControls = {
      ...promptControls,
      ...payload.controls
    };

    const result = await this.provider.synthesize({
      voiceModel: payload.voiceModelKey,
      lyrics: finalLyrics ?? lyricsData.transcript,
      controls: mergedControls,
      guidePath: pitchData?.stemPath
    });

    const outDir = path.join(process.cwd(), 'renders');
    fs.mkdirSync(outDir, { recursive: true });
    const timestamp = Date.now();
    const rawPath = path.join(outDir, `render-${timestamp}.${result.format}`);
    fs.writeFileSync(rawPath, result.audioBuffer);

    const effects = payload.effects ?? { ...defaultEffectSettings };
    const processedPath = await applyAdvancedEffects(rawPath, effects, payload.previewSeconds);
    const tempoAdjustedPath = await applyTempo(processedPath, payload.guideTempo);
    const layeredPath = await applyPresetLayers(tempoAdjustedPath, effects.preset);

    if (payload.previewSeconds) {
      return await createPreviewSnippet(layeredPath, payload.previewSeconds);
    }

    return layeredPath;
  }
}

async function createPreviewSnippet(filePath: string, seconds: number): Promise<string> {
  const previewPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-preview$1');
  const safeSeconds = Math.max(2, Math.min(seconds, 30));
  try {
    await execAsync(
      `ffmpeg -y -hide_banner -loglevel error -i "${filePath}" -t ${safeSeconds} -c copy "${previewPath}"`
    );
    return previewPath;
  } catch (error) {
    console.error('[RenderPipeline] Failed to trim preview, returning full file.', error);
    return filePath;
  }
}

async function applyTempo(filePath: string, tempo?: number | null): Promise<string> {
  if (!tempo || Math.abs(tempo - 1) < 0.01) {
    return filePath;
  }

  const safeTempo = Math.max(0.5, Math.min(6, tempo));
  const tempoFilters: string[] = [];
  let remaining = safeTempo;

  while (remaining > 2) {
    tempoFilters.push('atempo=2');
    remaining /= 2;
  }
  while (remaining < 0.5) {
    tempoFilters.push('atempo=0.5');
    remaining *= 2;
  }
  tempoFilters.push(`atempo=${remaining.toFixed(3)}`);

  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-tempo$1');
  try {
    await execAsync(
      `ffmpeg -y -hide_banner -loglevel error -i "${filePath}" -filter:a "${tempoFilters.join(
        ','
      )}" "${outPath}"`
    );
    return outPath;
  } catch (error) {
    console.error('[RenderPipeline] Tempo adjustment failed, returning original.', error);
    return filePath;
  }
}

async function applyPresetLayers(filePath: string, preset?: EffectSettings['preset']): Promise<string> {
  if (preset === 'harmonic-orbit') {
    return applyHarmonicOrbitLayer(filePath);
  }
  if (preset === 'pitch-warp') {
    return applyPitchWarpLayer(filePath);
  }
  if (preset === 'shimmer-stack') {
    return applyShimmerStackLayer(filePath);
  }
  if (preset === 'choir-cloud') {
    return applyChoirCloudLayer(filePath);
  }
  if (preset === '8d-swarm') {
    return apply8DSwarmLayer(filePath);
  }
  return filePath;
}

async function applyHarmonicOrbitLayer(filePath: string): Promise<string> {
  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-orbit$1');
  const filter =
    '[0:a]asplit=3[a][b][c];' +
    '[a]asetrate=48000*1.03,aresample=48000,pan=stereo|c0=0.85*c0|c1=0.35*c1[a1];' +
    '[b]asetrate=48000*0.97,aresample=48000,pan=stereo|c0=0.35*c0|c1=0.85*c1[a2];' +
    '[c]aphaser=0.6:0.66:2:0.6:0.5:0.1,volume=0.6[a3];' +
    '[a1][a2][a3]amix=3,volume=1[out]';
  return runFilterComplex(filePath, outPath, filter);
}

async function applyPitchWarpLayer(filePath: string): Promise<string> {
  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-warp$1');
  const filter =
    '[0:a]asplit=2[a][b];' +
    '[a]asetrate=48000*1.05,aresample=48000,chorus=0.6:0.9:55:0.4:0.25:2[a1];' +
    '[b]asetrate=48000*0.94,aresample=48000,apulsator=mode=sine:amount=0.8[b1];' +
    '[a1][b1]amix=2,volume=1[out]';
  return runFilterComplex(filePath, outPath, filter);
}

async function applyShimmerStackLayer(filePath: string): Promise<string> {
  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-shimmer$1');
  const filter =
    '[0:a]asplit=2[a][b];' +
    '[a]apad,atempo=0.98,highpass=f=500,lowpass=f=8000,volume=0.8[a1];' +
    '[b]asetrate=48000*1.02,aresample=48000,areverb=50:50,volume=0.6[b1];' +
    '[a1][b1]amix=2,volume=1[out]';
  return runFilterComplex(filePath, outPath, filter);
}

async function applyChoirCloudLayer(filePath: string): Promise<string> {
  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-choir$1');
  const filter =
    '[0:a]asplit=4[a][b][c][d];' +
    '[a]asetrate=48000*1.06,aresample=48000,pan=stereo|c0=0.7*c0|c1=0.3*c1[a1];' +
    '[b]asetrate=48000*0.94,aresample=48000,pan=stereo|c0=0.3*c0|c1=0.7*c1[b1];' +
    '[c]areverb=60:60:100,volume=0.5[c1];' +
    '[d]adelay=50|50,volume=0.4[d1];' +
    '[a1][b1][c1][d1]amix=4,volume=1[out]';
  return runFilterComplex(filePath, outPath, filter);
}

async function apply8DSwarmLayer(filePath: string): Promise<string> {
  const outPath = filePath.replace(/(\.[a-z0-9]+)$/i, '-8dswarm$1');
  const filter =
    '[0:a]asplit=3[a][b][c];' +
    '[a]aphaser=0.5:0.6:2:0.5:0.5:0.2,pan=stereo|c0=0.9*c0|c1=0.2*c1[a1];' +
    '[b]asetrate=48000*1.02,aresample=48000,apulsator=mode=sine:amount=0.9:width=90,pan=stereo|c0=0.2*c0|c1=0.9*c1[b1];' +
    '[c]asetrate=48000*0.98,aresample=48000,flanger=delay=3:depth=2:regen=0.5:speed=0.5,pan=stereo|c0=0.6*c0|c1=0.6*c1[c1];' +
    '[a1][b1][c1]amix=3,volume=1[out]';
  return runFilterComplex(filePath, outPath, filter);
}

async function runFilterComplex(filePath: string, outPath: string, filter: string): Promise<string> {
  try {
    await execAsync(
      `ffmpeg -y -hide_banner -loglevel error -i "${filePath}" -filter_complex "${filter}" -map "[out]" "${outPath}"`
    );
    return outPath;
  } catch (error) {
    console.error('[RenderPipeline] Layered effect failed, returning base render.', error);
    return filePath;
  }
}
