import io
import json
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import Response
from pydub import AudioSegment

app = FastAPI(title="Chromox FX Service", version="0.1.0")


def apply_placeholder_chain(
    audio: AudioSegment,
    engine: str,
    settings: dict,
    preview_seconds: Optional[float]
) -> AudioSegment:
    """Placeholder for wiring in RAVE, DDSP, Resonance Audio, etc."""
    if preview_seconds:
        audio = audio[: int(float(preview_seconds) * 1000)]

    orbit_speed = float(settings.get("orbitSpeed", 0.5))
    orbit_depth = float(settings.get("orbitDepth", 0.8))

    if engine in {"rave-ddsp", "rave-ddsp-8d"}:
        audio = audio.high_pass_filter(120).low_pass_filter(11000)
        audio = audio.apply_gain((float(settings.get("clarity", 0.7)) - 0.5) * 6)

    if engine in {"rave-ddsp-8d", "resonance-8d"}:
        offset = max(1, int(orbit_speed * 120))
        left = audio.pan(-orbit_depth)
        right = audio.pan(orbit_depth)
        shifted = right[offset:] + right[:offset]
        audio = left.overlay(shifted)

    return audio


@app.post("/process")
async def process_audio(
    engine: str = Form(...),
    settings: str = Form("{}"),
    previewSeconds: Optional[str] = Form(None),
    audio: UploadFile = File(...)
):
    raw = await audio.read()
    segment = AudioSegment.from_file(io.BytesIO(raw))
    parsed_settings = json.loads(settings or "{}")
    preview = float(previewSeconds) if previewSeconds else None

    processed = apply_placeholder_chain(segment, engine, parsed_settings, preview)

    buffer = io.BytesIO()
    processed.export(buffer, format="wav")
    buffer.seek(0)
    return Response(buffer.read(), media_type="audio/wav")
