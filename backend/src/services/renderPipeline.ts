import fs from 'fs';
import path from 'path';
import { RenderPayload } from '../types';
import { extractPitchAndTiming, extractVocalStem, transcribeLyrics } from './dsp';
import { rewriteLyricsWithLLM, promptToControls } from './llm';
import { SingingProvider } from './provider/base';

export class ChromaticCorePipeline {
  constructor(private provider: SingingProvider) {}

  async run(payload: RenderPayload) {
    const guideData = payload.guideFilePath ? await extractVocalStem(payload.guideFilePath) : undefined;
    const pitchData = guideData ? await extractPitchAndTiming(guideData.stemPath) : undefined;
    const lyricsData = await transcribeLyrics(guideData?.stemPath ?? '');

    const rewrittenLyrics = await rewriteLyricsWithLLM(payload.lyrics, payload.stylePrompt);
    const promptControls = await promptToControls(payload.stylePrompt);
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
    const filePath = path.join(outDir, `render-${Date.now()}.${result.format}`);
    fs.writeFileSync(filePath, result.audioBuffer);

    return filePath;
  }
}
