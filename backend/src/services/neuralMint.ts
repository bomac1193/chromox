import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execCallback);

const NEURAL_MINT_URL = process.env.NEURAL_MINT_URL;
const NEURAL_MINT_TOKEN = process.env.NEURAL_MINT_TOKEN;

type MintMode = 'glitch' | 'dream' | 'anthem';

async function callExternalMintEngine(inputPath: string, mode: MintMode) {
  if (!NEURAL_MINT_URL) return null;
  const form = new FormData();
  form.append('audio', fs.createReadStream(inputPath));
  form.append('mode', mode);
  const headers: Record<string, string> = {};
  if (NEURAL_MINT_TOKEN) {
    headers.Authorization = `Bearer ${NEURAL_MINT_TOKEN}`;
  }
  const response = await fetch(NEURAL_MINT_URL, {
    method: 'POST',
    headers,
    body: form as any
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Neural mint engine failed (${response.status}): ${text}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const payload = (await response.json()) as any;
    const base64 = payload.audioBase64 ?? payload.data;
    if (!base64) {
      throw new Error('Mint engine JSON response missing audio data');
    }
    return Buffer.from(base64, 'base64');
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getFallbackFilters(mode: MintMode, dry: boolean = true) {
  if (dry) {
    // Dry mode - minimal effects, focus on slicing and subtle processing
    if (mode === 'dream') {
      return 'aecho=0.3:0.2:8:0.15,atempo=0.95'; // Light reverb
    }
    if (mode === 'anthem') {
      return 'asetrate=48000*1.05,atempo=0.95,chorus=0.5:0.7:40:0.2:0.15:1'; // Subtle chorus
    }
    return 'atempo=0.98,aphaser=type=t:speed=0.3:decay=0.5'; // Minimal phaser
  }

  // Original wet mode - more effects
  if (mode === 'dream') {
    return 'aecho=0.6:0.4:12:0.4,apad=pad_dur=1,atempo=0.92';
  }
  if (mode === 'anthem') {
    return 'asetrate=48000*1.1,atempo=0.9,chorus=0.7:0.9:55:0.4:0.25:2,stereotools=surround';
  }
  return 'asetrate=48000*1.05,atempo=0.95,aphaser=type=t:speed=0.5:decay=0.8';
}

export async function renderMintedGuide(options: {
  sourcePath: string;
  outputPath: string;
  mode: MintMode;
  duration?: number;
  dry?: boolean;
}) {
  try {
    const neuralBuffer = await callExternalMintEngine(options.sourcePath, options.mode);
    if (neuralBuffer) {
      fs.writeFileSync(options.outputPath, neuralBuffer);
      return options.outputPath;
    }
  } catch (error) {
    console.warn('[NeuralMint] External engine failed, falling back:', (error as Error).message);
  }

  const startSeconds = 5;
  const duration = options.duration ?? 12; // Default 12 seconds
  const dry = options.dry ?? true; // Default to dry (less effects)
  const ffmpeg = `ffmpeg -y -hide_banner -loglevel error -ss ${startSeconds} -t ${duration} -i "${options.sourcePath}" -af "${getFallbackFilters(options.mode, dry)}" -ar 44100 -ac 2 "${options.outputPath}"`;
  await execAsync(ffmpeg);
  return options.outputPath;
}
