"""
Beat Detection Service for Chromox
FastAPI microservice using librosa for BPM detection and beat grid extraction.
"""

import os
import sys
from pathlib import Path
from typing import Optional

import librosa
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Chromox Beat Detection Service", version="1.0.0")


class AnalyzeRequest(BaseModel):
    audio_path: str


class BeatAnalysisResponse(BaseModel):
    bpm: float
    confidence: float
    beats: list[float]
    downbeats: list[float]
    duration: float


def compute_confidence(onset_env: np.ndarray, beat_frames: np.ndarray, sr: int, hop_length: int) -> float:
    """
    Compute confidence score based on beat strength consistency.
    Higher consistency = higher confidence in BPM detection.
    """
    if len(beat_frames) < 4:
        return 0.3  # Low confidence with few beats

    # Get onset strength at beat positions
    beat_strengths = onset_env[beat_frames[beat_frames < len(onset_env)]]

    if len(beat_strengths) < 2:
        return 0.4

    # Confidence based on consistency of beat strengths
    mean_strength = np.mean(beat_strengths)
    std_strength = np.std(beat_strengths)

    if mean_strength == 0:
        return 0.3

    # Coefficient of variation (lower = more consistent = higher confidence)
    cv = std_strength / mean_strength

    # Also check inter-beat interval consistency
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop_length)
    if len(beat_times) > 1:
        intervals = np.diff(beat_times)
        interval_cv = np.std(intervals) / np.mean(intervals) if np.mean(intervals) > 0 else 1.0
    else:
        interval_cv = 1.0

    # Combine metrics (lower CV = higher confidence)
    strength_confidence = max(0.2, min(1.0, 1.0 - cv))
    interval_confidence = max(0.2, min(1.0, 1.0 - interval_cv))

    confidence = (strength_confidence * 0.4 + interval_confidence * 0.6)
    return round(confidence, 3)


def estimate_downbeats(beats: np.ndarray, bpm: float, sr: int, hop_length: int) -> list[float]:
    """
    Estimate downbeat positions (start of measures).
    Assumes 4/4 time signature.
    """
    if len(beats) < 4:
        return beats[:1].tolist() if len(beats) > 0 else []

    beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=hop_length)

    # For 4/4 time, downbeats are every 4 beats
    downbeat_indices = list(range(0, len(beat_times), 4))
    downbeats = [float(beat_times[i]) for i in downbeat_indices if i < len(beat_times)]

    return downbeats


@app.post("/analyze", response_model=BeatAnalysisResponse)
async def analyze_audio(request: AnalyzeRequest) -> BeatAnalysisResponse:
    """
    Analyze audio file for BPM and beat grid.

    Returns:
        - bpm: Detected tempo in beats per minute
        - confidence: 0-1 confidence score
        - beats: Array of beat times in seconds
        - downbeats: Array of measure start times in seconds
        - duration: Total audio duration in seconds
    """
    audio_path = Path(request.audio_path)

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail=f"Audio file not found: {request.audio_path}")

    if not audio_path.suffix.lower() in ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac']:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {audio_path.suffix}")

    try:
        # Load audio with librosa
        y, sr = librosa.load(str(audio_path), sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # Set hop length for beat tracking
        hop_length = 512

        # Compute onset envelope for beat tracking
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)

        # Detect tempo and beat frames
        tempo, beat_frames = librosa.beat.beat_track(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=hop_length,
            start_bpm=120,
            units='frames'
        )

        # Handle both scalar and array tempo returns (librosa version differences)
        bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)

        # Convert beat frames to times
        beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop_length)

        # Compute confidence
        confidence = compute_confidence(onset_env, beat_frames, sr, hop_length)

        # Estimate downbeats
        downbeats = estimate_downbeats(beat_frames, bpm, sr, hop_length)

        return BeatAnalysisResponse(
            bpm=round(bpm, 2),
            confidence=confidence,
            beats=[round(float(t), 4) for t in beat_times],
            downbeats=[round(t, 4) for t in downbeats],
            duration=round(duration, 3)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "beat-detection"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BEAT_SERVICE_PORT", 5012))
    uvicorn.run(app, host="0.0.0.0", port=port)
