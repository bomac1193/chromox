## Chromox Advanced FX Microservice

This lightweight FastAPI server is a bridge between the Node backend and heavy DSP / ML engines
such as **FAUST RAVE**, **Magenta DDSP**, and **Resonance Audio**. Chromox posts the rendered vocal
stem plus the selected engine + settings to the `/process` endpoint, and the service streams back a
24-bit WAV after running the requested chain.

### Quick Start (prototype chain)

```bash
cd backend/effects_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --port 5009 --reload
```

This prototype server uses `pydub` to fake the chains so you can validate the round-trip. Once
you install the real engines, replace the TODO blocks in `server.py` with calls into:

- **RAVE** (https://github.com/acids-ircam/RAVE) – load the pretrained voice model and run encode/decode
- **Magenta DDSP** (https://github.com/magenta/ddsp) – apply pitch / harmonizer / neural verb
- **Resonance Audio** (https://resonance-audio.github.io) – binauralize using its spherical panning API

### Configuration

Chromox looks for `EFFECTS_SERVICE_URL` (default `http://localhost:5009`). The frontend exposes these
engines:

| Engine Key        | Expected Chain                                    |
|-------------------|---------------------------------------------------|
| `rave-ddsp`       | RAVE timbre morph + DDSP tuner                    |
| `rave-ddsp-8d`    | RAVE + DDSP + Resonance Audio orbit automation    |
| `resonance-8d`    | Spatialization only                               |
| `chromox-labs`    | Built-in FFmpeg mastering fallback (no microservice) |

Extend `server.py` with your licensed SDKs (Antares, Nectar, Mach1, etc.) if you want even more
options—the Node backend will simply stream the returned WAV to the renders folder.***
