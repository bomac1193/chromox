import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const cacheDir = path.join(process.cwd(), 'folio_cache');
fs.mkdirSync(cacheDir, { recursive: true });

export type ExtractionResult = {
  success: boolean;
  audioPath?: string;
  duration?: number;
  error?: string;
};

/**
 * Extract audio from a video URL using yt-dlp.
 * Supports YouTube, TikTok, Instagram, Twitter, etc.
 */
export async function extractAudioFromVideo(
  videoUrl: string,
  outputName: string
): Promise<ExtractionResult> {
  const outputPath = path.join(cacheDir, `${outputName}.wav`);

  // If already extracted, return cached version
  if (fs.existsSync(outputPath)) {
    console.log(`[VideoAudioExtractor] Using cached audio: ${outputPath}`);
    return { success: true, audioPath: outputPath };
  }

  return new Promise((resolve) => {
    console.log(`[VideoAudioExtractor] Extracting audio from: ${videoUrl}`);

    const args = [
      '--no-playlist',
      '--extract-audio',
      '--audio-format', 'wav',
      '--audio-quality', '0',
      '--output', outputPath.replace('.wav', '.%(ext)s'),
      '--quiet',
      '--no-warnings',
      videoUrl,
    ];

    const proc = spawn('yt-dlp', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`[VideoAudioExtractor] Extracted audio to: ${outputPath}`);
        resolve({ success: true, audioPath: outputPath });
      } else {
        // Check for other audio formats that yt-dlp might have created
        const possibleExts = ['.m4a', '.mp3', '.opus', '.webm'];
        for (const ext of possibleExts) {
          const altPath = outputPath.replace('.wav', ext);
          if (fs.existsSync(altPath)) {
            console.log(`[VideoAudioExtractor] Found audio at: ${altPath}`);
            resolve({ success: true, audioPath: altPath });
            return;
          }
        }

        console.error(`[VideoAudioExtractor] Failed to extract audio: ${stderr}`);
        resolve({
          success: false,
          error: stderr || `yt-dlp exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      console.error('[VideoAudioExtractor] yt-dlp spawn error:', err);
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Check if a URL is a supported video platform.
 */
export function isSupportedVideoUrl(url: string): boolean {
  const supportedDomains = [
    'youtube.com',
    'youtu.be',
    'tiktok.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'twitch.tv',
    'soundcloud.com',
    'bandcamp.com',
    'mixcloud.com',
  ];

  try {
    const parsed = new URL(url);
    return supportedDomains.some((d) => parsed.hostname.includes(d));
  } catch {
    return false;
  }
}
