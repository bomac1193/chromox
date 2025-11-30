# Chromox Voice Cloning Guide

## Overview

Chromox now features **advanced voice cloning** capabilities that allow you to:

1. **Upload vocal stems** and extract unique voice characteristics
2. **Lock in a voice persona** with detailed voice profiles and embeddings
3. **Save voice signatures** for reuse with unlimited lyrics and songs
4. **Generate high-quality vocals** using professional TTS providers

This transforms Chromox from a persona forge into a complete **AI voice production studio**.

---

## 🎤 How Voice Cloning Works

### Step 1: Upload a Vocal Stem

Click the **⬢ Clone** button in the Persona Library to open the Voice Clone Modal.

**Best practices for vocal stems:**
- Use **isolated/acapella vocals** (no background music or instruments)
- Aim for **10-30 seconds** of clear singing
- Higher quality audio = better cloning results
- Supported formats: WAV, AIFF, MP3, FLAC

### Step 2: Voice Analysis

Chromox analyzes the vocal stem and extracts:

- **Pitch Range** - Min, max, and mean fundamental frequency
- **Formants** - F1, F2, F3 resonance characteristics
- **Spectral Features** - Centroid, rolloff, brightness
- **Timbre Vector** - 13-dimensional MFCC representation
- **Vibrato** - Rate and depth of pitch modulation
- **Voice Qualities** - Breathiness, energy, brightness
- **Voice Embedding** - 256-dimensional neural voice signature

### Step 3: Save as Persona

Give your cloned voice a name and description, then hit **⬢ Clone & Save**.

The system will:
- Create a persona artifact with the voice profile
- Store the voice embedding and reference sample
- Generate default style controls from voice characteristics
- Save everything to disk for persistence

### Step 4: Create New Vocals

Select your cloned persona in the Studio Panel, then:
- Write any lyrics you want
- Adjust style controls (brightness, breathiness, etc.)
- Click **Render** to generate new vocals in the cloned voice

---

## 🔮 Voice Cloning Providers

Chromox supports multiple high-quality voice synthesis providers:

### 1. **RVC (Retrieval-based Voice Conversion)** [DEFAULT]
- **Provider ID:** `rvc` / `chromox-clone`
- **Quality:** ⭐⭐⭐⭐⭐ (Best for singing)
- **Requirements:** Optional RVC installation for production mode
- **Features:**
  - Professional voice conversion
  - Full pitch and timbre control
  - Optimal for musical applications
  - Falls back to reference sample in demo mode

**Setup (Optional):**
```bash
# Install RVC for production-grade voice cloning
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI /opt/RVC
cd /opt/RVC
pip install -r requirements.txt
export RVC_PATH=/opt/RVC
```

### 2. **ElevenLabs Voice Clone**
- **Provider ID:** `elevenlabs`
- **Quality:** ⭐⭐⭐⭐⭐ (Ultra-high quality TTS)
- **Requirements:** `ELEVENLABS_API_KEY` environment variable
- **Features:**
  - Instant voice cloning from samples
  - Professional-grade text-to-speech
  - Emotion and style control
  - Multilingual support

**Setup:**
```bash
# Get API key from https://elevenlabs.io
export ELEVENLABS_API_KEY=your_api_key_here
```

### 3. **OpenAI Voice Clone**
- **Provider ID:** `openai-voice`
- **Quality:** ⭐⭐⭐⭐ (Very high quality)
- **Requirements:** `OPENAI_API_KEY` environment variable
- **Features:**
  - Neural voice synthesis
  - Intelligent voice matching
  - Natural prosody and emotion
  - Advanced post-processing

**Setup:**
```bash
# Get API key from https://platform.openai.com
export OPENAI_API_KEY=your_api_key_here
```

---

## 🎛️ Voice Profile Structure

Each cloned voice is stored with comprehensive metadata:

```typescript
{
  characteristics: {
    pitchRange: { min: 140, max: 380, mean: 220 },
    formants: [700, 1220, 2600],
    spectralCentroid: 2500,
    spectralRolloff: 6000,
    breathiness: 0.4,
    brightness: 0.7,
    timbre: [0.2, 0.5, ...], // 13-dim MFCC
    vibratoRate: 5.5,
    vibratoDepth: 0.3,
    energyMean: 0.6
  },
  embedding: {
    embedding: [...], // 256-dim vector
    provider: 'chromox',
    modelVersion: '1.0.0'
  },
  samplePath: 'voice_profiles/sample_1234567890.wav',
  sampleDuration: 15.3,
  analysisTimestamp: '2025-11-29T22:45:00Z'
}
```

---

## 📁 File Storage

Voice profiles are stored in:
- **Reference Samples:** `chromox/voice_profiles/*.wav`
- **Voice Profiles:** `chromox/voice_profiles/*.json`
- **Rendered Outputs:** `chromox/renders/*.wav`

---

## 🎨 Style Controls with Cloned Voices

When you clone a voice, Chromox automatically generates **default style controls** based on the voice's characteristics:

| Control | Derived From |
|---------|--------------|
| Brightness | Spectral centroid & high-frequency energy |
| Breathiness | Noise-to-signal ratio & airflow characteristics |
| Energy | RMS level & dynamic range |
| Formant | Average formant frequencies |
| Vibrato Depth | Analyzed pitch modulation depth |
| Vibrato Rate | Analyzed pitch modulation frequency |

You can **override** these defaults in the Studio Panel to explore different vocal styles.

---

## 🚀 Advanced Usage

### Multi-Sample Training (Coming Soon)

```typescript
POST /api/voice-clone/retrain/:personaId

// Upload multiple vocal samples to refine the voice model
FormData: {
  vocals: [file1, file2, file3, ...]
}
```

This will:
- Average characteristics across samples
- Improve embedding quality
- Capture wider vocal range
- Enhance synthesis accuracy

### Provider Selection

To manually choose a provider for cloned voices, update the persona:

```typescript
const persona = await createPersona({
  name: "My Clone",
  provider: "elevenlabs", // or "rvc", "openai-voice"
  // ...
});
```

### Custom Voice Embeddings

For advanced use cases, you can provide pre-computed embeddings:

```typescript
POST /api/voice-clone/create-persona

{
  name: "Custom Voice",
  voice_profile: {
    embedding: {
      embedding: [...], // Your custom 256-dim vector
      provider: "custom",
      modelVersion: "1.0.0"
    },
    // ...
  }
}
```

---

## 🔧 API Reference

### `POST /api/voice-clone/analyze`

Analyzes a vocal stem and returns voice characteristics.

**Request:**
```typescript
FormData {
  vocal: File // Audio file (WAV, MP3, AIFF, FLAC)
}
```

**Response:**
```json
{
  "success": true,
  "profile": { /* VoiceProfile object */ },
  "suggestedControls": { /* StyleControls */ },
  "message": "Voice analyzed successfully"
}
```

### `POST /api/voice-clone/create-persona`

Creates a new persona from a vocal stem.

**Request:**
```typescript
FormData {
  vocal: File,
  name: string,
  description?: string
}
```

**Response:**
```json
{
  "success": true,
  "persona": { /* Persona object with voice_profile */ },
  "message": "Voice cloned successfully!"
}
```

### `POST /api/voice-clone/retrain/:personaId`

Refines a voice clone with additional samples.

**Request:**
```typescript
FormData {
  vocals: File[] // Up to 5 files
}
```

---

## 💡 Tips for Best Results

### Recording Quality
- Use a **quiet environment** with minimal background noise
- Maintain **consistent distance** from the microphone
- Capture a **wide pitch range** (sing low to high notes)
- Include **vibrato and emotional expression**

### Vocal Stem Isolation
If your audio has background music, use vocal separation tools:
- **Spleeter** (free, open-source)
- **Demucs** (high quality)
- **iZotope RX** (professional)
- **LALAL.AI** (web-based)

### Provider Selection
- **RVC** - Best for singing and musical vocals
- **ElevenLabs** - Best for speech and spoken word
- **OpenAI** - Best balance of quality and naturalness

### Style Control Adjustment
Experiment with:
- **Brightness** - Add clarity and presence
- **Breathiness** - More intimate, airy quality
- **Formant** - Shift gender presentation
- **Energy** - Control vocal intensity

---

## 🐛 Troubleshooting

### "Voice analysis failed"
- Check audio file format (must be valid audio)
- Ensure file is not corrupted
- Try converting to WAV format first

### "No vocal detected"
- Upload must contain vocals (instrumental-only won't work)
- Use vocal separation if needed
- Ensure audio is not too quiet

### "Provider unavailable"
- Check API keys are set in `.env` file
- Verify network connectivity for cloud providers
- RVC requires installation for production mode

### Low Quality Output
- Use higher quality reference samples
- Increase sample duration (15-30 seconds ideal)
- Try a different provider
- Adjust style controls in Studio Panel

---

## 🎯 Workflow Example

```bash
# 1. Start Chromox
cd chromox
npm run dev (frontend)
cd backend && npm run dev (backend)

# 2. Open http://localhost:5173

# 3. Click "⬢ Clone" button

# 4. Drag-drop a vocal stem (e.g., "singer_acapella.wav")

# 5. Click "Analyze Voice"
   → Wait for voice analysis to complete
   → Review pitch range, brightness, vibrato stats

# 6. Enter persona name: "Ethereal Voice"

# 7. Click "⬢ Clone & Save"
   → Persona created and saved to library

# 8. Select "Ethereal Voice" in Studio Panel

# 9. Write lyrics: "Stars align in cosmic harmony..."

# 10. Adjust brightness: 0.8, breathiness: 0.3

# 11. Click "Render"
    → New vocal generated in cloned voice!

# 12. Listen to your AI-generated vocal in that exact voice
```

---

## 🌟 What Makes Chromox Voice Cloning Special

1. **Multi-Provider Architecture** - Switch between RVC, ElevenLabs, OpenAI seamlessly
2. **Deep Voice Analysis** - 20+ extracted characteristics for accurate cloning
3. **Neural Embeddings** - 256-dimensional voice signatures capture unique timbre
4. **Style Transferability** - Clone once, use with unlimited lyrics and styles
5. **Production Quality** - Professional-grade synthesis with fine-tuned controls
6. **Persona Persistence** - Save and reuse voice profiles indefinitely
7. **Open Ecosystem** - Pluggable provider system for future integrations

---

## 🔮 Future Roadmap

- [ ] Real-time voice morphing and blending
- [ ] Emotion and intensity controls per syllable
- [ ] Multi-voice harmony generation
- [ ] Voice aging and gender transformation
- [ ] Live input recording for instant cloning
- [ ] Voice style transfer (apply singer A's style to voice B)
- [ ] Prosody and phrasing control
- [ ] Multilingual voice cloning

---

## 📚 Technical Deep Dive

For developers wanting to extend the voice cloning system:

### Voice Analysis Pipeline

```
Audio Input → Vocal Separation → Feature Extraction → Embedding Generation → Profile Storage
     ↓              ↓                    ↓                    ↓                    ↓
  WAV/MP3     Demucs/Spleeter        FFmpeg/Librosa      Neural Network         JSON + WAV
```

### Synthesis Pipeline

```
Lyrics + Persona → Provider Selection → Voice Synthesis → Style Application → Output
      ↓                   ↓                    ↓                  ↓              ↓
   User Input      RVC/ElevenLabs/OpenAI    TTS/Conversion     FFmpeg Filters   WAV/MP3
```

### Provider Interface

```typescript
interface SingingProvider {
  id: string;
  label: string;
  synthesize(request: ProviderRequest): Promise<ProviderResponse>;
}
```

Implement this interface to add custom providers!

---

## 🤝 Contributing

Have ideas for improving voice cloning?

- Add new providers (Uberduck, Coqui, XTTS, etc.)
- Enhance voice analysis algorithms
- Improve embedding quality
- Add real-time processing
- Optimize for speed and quality

---

**Welcome to the future of vocal production. Clone any voice. Create any song.** ⬢
