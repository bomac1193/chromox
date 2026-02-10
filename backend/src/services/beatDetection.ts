/**
 * Beat Detection Service Client
 * Calls Python beat_service for BPM detection with FFmpeg fallback.
 */

import { spawn } from 'child_process';
import { BeatGrid } from '../types.js';

const BEAT_SERVICE_URL = process.env.BEAT_SERVICE_URL || 'http://localhost:5012';

export interface BeatAnalysis {
  bpm: number;
  confidence: number;
  beats: number[];
  downbeats: number[];
  duration: number;
}

/**
 * Detect BPM and beat grid from audio file using Python librosa service.
 * Falls back to FFmpeg-based onset detection if service is unavailable.
 */
export async function detectBPM(audioPath: string): Promise<BeatAnalysis> {
  try {
    // Try Python service first
    const response = await fetch(`${BEAT_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_path: audioPath }),
    });

    if (response.ok) {
      const data = await response.json();
      return data as BeatAnalysis;
    }

    console.warn(`Beat service returned ${response.status}, falling back to FFmpeg`);
  } catch (error) {
    console.warn('Beat service unavailable, falling back to FFmpeg:', error);
  }

  // Fallback to FFmpeg-based detection
  return detectBPMWithFFmpeg(audioPath);
}

/**
 * Extract beat grid from audio file.
 */
export async function extractBeatGrid(audioPath: string): Promise<BeatGrid> {
  const analysis = await detectBPM(audioPath);
  return {
    bpm: analysis.bpm,
    confidence: analysis.confidence,
    beats: analysis.beats,
    downbeats: analysis.downbeats,
    duration: analysis.duration,
  };
}

/**
 * FFmpeg fallback for basic onset detection.
 * Less accurate than librosa but works without Python service.
 */
async function detectBPMWithFFmpeg(audioPath: string): Promise<BeatAnalysis> {
  return new Promise((resolve, reject) => {
    // Get duration first
    const durationProc = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      audioPath,
    ]);

    let durationOutput = '';
    durationProc.stdout.on('data', (data) => {
      durationOutput += data.toString();
    });

    durationProc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with code ${code}`));
      }

      const duration = parseFloat(durationOutput.trim()) || 0;

      // Use ffmpeg to extract audio levels for onset detection
      const proc = spawn('ffmpeg', [
        '-i', audioPath,
        '-af', 'silencedetect=n=-30dB:d=0.1,astats=metadata=1:reset=1',
        '-f', 'null',
        '-',
      ]);

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (ffmpegCode) => {
        if (ffmpegCode !== 0 && ffmpegCode !== null) {
          // FFmpeg often returns non-zero for -f null, but that's okay
        }

        // Parse silence detection for basic onset estimation
        const silenceEnds = stderr.match(/silence_end: ([\d.]+)/g) || [];
        const onsets = silenceEnds.map((s) => {
          const match = s.match(/([\d.]+)/);
          return match ? parseFloat(match[1]) : 0;
        }).filter((t) => t > 0);

        // Estimate BPM from onset intervals
        let estimatedBpm = 120; // Default fallback
        let confidence = 0.3;

        if (onsets.length >= 4) {
          const intervals: number[] = [];
          for (let i = 1; i < onsets.length && i < 20; i++) {
            const interval = onsets[i] - onsets[i - 1];
            if (interval > 0.2 && interval < 2.0) {
              intervals.push(interval);
            }
          }

          if (intervals.length >= 2) {
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            estimatedBpm = Math.round(60 / avgInterval);

            // Clamp to reasonable range
            if (estimatedBpm < 60) estimatedBpm *= 2;
            if (estimatedBpm > 200) estimatedBpm /= 2;
            estimatedBpm = Math.max(60, Math.min(200, estimatedBpm));

            // Calculate confidence from interval consistency
            const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
            const cv = Math.sqrt(variance) / avgInterval;
            confidence = Math.max(0.2, Math.min(0.7, 0.7 - cv));
          }
        }

        // Generate synthetic beat grid based on estimated BPM
        const beatInterval = 60 / estimatedBpm;
        const beats: number[] = [];
        const downbeats: number[] = [];

        for (let t = 0; t < duration; t += beatInterval) {
          beats.push(Math.round(t * 10000) / 10000);
          if (beats.length % 4 === 1) {
            downbeats.push(Math.round(t * 10000) / 10000);
          }
        }

        resolve({
          bpm: estimatedBpm,
          confidence,
          beats,
          downbeats,
          duration: Math.round(duration * 1000) / 1000,
        });
      });
    });
  });
}

/**
 * Check if beat service is available.
 */
export async function isBeatServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BEAT_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
