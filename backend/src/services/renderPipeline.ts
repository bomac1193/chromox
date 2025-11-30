import fs from 'fs';
import path from 'path';
import { RenderPayload } from '../types';
import { extractPitchAndTiming, extractVocalStem, transcribeLyrics } from './dsp';
import { rewriteLyricsWithLLM, promptToControls } from './llm';
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

    const stylePromptWithAccent =
      payload.accentLocked && payload.accent
        ? `${payload.stylePrompt} :: accent ${payload.accent}`
        : payload.stylePrompt;

    const rewrittenLyrics = await rewriteLyricsWithLLM(payload.lyrics, stylePromptWithAccent);
    const promptControls = await promptToControls(stylePromptWithAccent);
    const mergedControls = {
      ...promptControls,
      ...payload.controls
    };

    const result = await this.provider.synthesize({
      voiceModel: payload.voiceModelKey,
      lyrics: rewrittenLyrics ?? payload.lyrics ?? lyricsData.transcript,
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

    if (payload.previewSeconds) {
      return await createPreviewSnippet(processedPath, payload.previewSeconds);
    }

    return processedPath;
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
