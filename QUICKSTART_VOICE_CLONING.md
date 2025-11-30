# ⬢ Chromox Voice Cloning - Quick Start

## Clone Your First Voice in 5 Minutes

### Step 1: Start Chromox

```bash
# Terminal 1 - Start backend
cd chromox/backend
npm run dev

# Terminal 2 - Start frontend
cd chromox
npm run dev
```

Open http://localhost:5173 in your browser.

---

### Step 2: Prepare a Vocal Stem

**Best source:** Isolated vocals (acapella) work best

**Where to get them:**
- Extract from songs using **Spleeter**, **Demucs**, or **LALAL.AI**
- Record your own vocals
- Download royalty-free acapellas

**Tip:** 15-30 seconds of clean vocals is ideal

---

### Step 3: Clone the Voice

1. Click the **⬢ Clone** button in the Persona Vault
2. **Drag-and-drop** your vocal file (or click to browse)
3. Click **"Analyze Voice"** and wait 5-10 seconds
4. Review the extracted voice stats:
   - Pitch range
   - Brightness
   - Breathiness
   - Vibrato rate
5. Enter a name: e.g., "Stellar Voice"
6. Click **"⬢ Clone & Save"**

**Done!** Your voice persona is now saved.

---

### Step 4: Generate New Vocals

1. Select your cloned persona in the **Studio Panel**
2. Write any lyrics you want:
   ```
   Stars align in cosmic harmony
   Voices echo through the void
   Dreams unfold in symphonies
   ```
3. Adjust style controls if desired
4. Click **"Render"**

**Magic!** Your AI will sing those lyrics in the exact voice you cloned.

---

## 🎛️ Advanced Options

### Use Different Providers

For **ultra-high quality**, add API keys to your `.env`:

```bash
# For professional singing synthesis
ELEVENLABS_API_KEY=sk_your_key_here

# For advanced TTS
OPENAI_API_KEY=sk_your_key_here

# For RVC voice conversion (requires installation)
RVC_PATH=/opt/RVC
```

Then update your persona provider in the database or when creating.

---

### Refine Voice Quality

Upload **multiple samples** to improve quality:

```bash
POST http://localhost:4414/api/voice-clone/retrain/:personaId

FormData:
  vocals: [sample1.wav, sample2.wav, sample3.wav]
```

More samples = better voice accuracy!

---

### Adjust Voice Style

After cloning, you can still control:

- **Brightness** (0-1) - Add clarity and presence
- **Breathiness** (0-1) - Intimate, airy quality
- **Energy** (0-1) - Vocal intensity
- **Formant** (-1 to 1) - Shift pitch/gender
- **Vibrato Depth/Rate** - Control pitch modulation

---

## 🔥 Pro Tips

### Best Vocal Quality

- Use **WAV or AIFF** format (lossless)
- Minimum **44.1kHz sample rate**
- Clean, **dry vocals** (no reverb or effects)
- Consistent **microphone distance**
- Wide **pitch range** in the sample

### Getting Clean Vocals

If you only have full songs:

1. Use **Spleeter** (free):
   ```bash
   pip install spleeter
   spleeter separate -p spleeter:4stems mysong.mp3
   ```

2. Or use **LALAL.AI** (web-based, very easy)

3. Or use **Demucs** (best quality):
   ```bash
   pip install demucs
   demucs mysong.mp3
   ```

---

## 🎯 Example Workflow

### Scenario: Clone a Singer from Spotify

1. **Find a song** with great isolated vocals on YouTube
2. **Download** as MP3 using youtube-dl or similar
3. **Extract vocals**:
   ```bash
   spleeter separate -p spleeter:2stems song.mp3
   # → Creates song/vocals.wav
   ```
4. **Clone in Chromox**:
   - Upload `vocals.wav`
   - Name it "Dream Singer"
   - Save persona
5. **Create new song**:
   - Write original lyrics
   - Select "Dream Singer" persona
   - Render
6. **You now have** that singer's voice on your custom lyrics!

---

## 🚨 Common Issues

### "Voice analysis failed"
→ Check audio file is valid (try converting to WAV)

### "No vocal detected"
→ Ensure the file contains vocals, not just instruments

### "Low quality output"
→ Use longer samples (15-30s) and add API keys for providers

### "Provider unavailable"
→ Check your `.env` file has API keys set

---

## 📚 Next Steps

- Read the [full Voice Cloning Guide](VOICE_CLONING.md)
- Explore different providers (RVC, ElevenLabs, OpenAI)
- Experiment with style controls
- Train with multiple samples for refinement

---

**That's it! You're now a voice cloning wizard.** ⬢✨

Happy creating!
