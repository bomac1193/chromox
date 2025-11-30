import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { config } from '../config';
import { EffectSettings } from '../types';

export async function processWithAdvancedEngine(
  inputPath: string,
  settings: EffectSettings,
  previewSeconds?: number
): Promise<string> {
  const serviceUrl = config.effects.serviceUrl;
  if (!serviceUrl) {
    throw new Error('Effects service URL not configured');
  }

  const endpoint = `${serviceUrl.replace(/\/$/, '')}/process`;
  const form = new FormData();
  form.append('engine', settings.engine);
  form.append('settings', JSON.stringify(settings));
  if (previewSeconds) {
    form.append('previewSeconds', String(previewSeconds));
  }
  form.append('audio', fs.createReadStream(inputPath), {
    filename: path.basename(inputPath)
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form as unknown as any
  });

  if (!response.ok) {
    throw new Error(
      `Effects service failed (${response.status}): ${await response.text().catch(() => 'Unknown error')}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputDir = path.dirname(inputPath);
  const suffix = settings.engine.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileName = `${path.basename(inputPath, path.extname(inputPath))}-${suffix}.wav`;
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
