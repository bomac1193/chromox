import { useState } from 'react';
import { Persona, StyleControls } from '../types';
import { StyleGrid } from './StyleGrid';
import { GuideDropzone } from './GuideDropzone';
import { Meter } from './Meter';
import { AudioPlayer } from './AudioPlayer';

const defaultControls: StyleControls = {
  brightness: 0.5,
  breathiness: 0.4,
  energy: 0.6,
  formant: 0,
  vibratoDepth: 0.4,
  vibratoRate: 0.4,
  roboticism: 0.2,
  glitch: 0.15,
  stereoWidth: 0.7
};

type Props = {
  personas: Persona[];
  activePersonaId?: string;
  onPersonaChange: (id: string) => void;
  onRewrite: (lyrics: string, stylePrompt: string) => Promise<string>;
  onRender: (payload: {
    personaId: string;
    lyrics: string;
    controls: StyleControls;
    stylePrompt: string;
    guide?: File;
  }) => Promise<{ audioUrl: string }>;
};

export function StudioPanel({ personas, activePersonaId, onPersonaChange, onRewrite, onRender }: Props) {
  const [lyrics, setLyrics] = useState('Layer me in prismatic light...');
  const [stylePrompt, setStylePrompt] = useState('holographic croon, velvet aggression');
  const [controls, setControls] = useState<StyleControls>(defaultControls);
  const [guide, setGuide] = useState<File | undefined>(undefined);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function handleRewrite() {
    const personaName = personas.find((p) => p.id === activePersonaId)?.name ?? 'Chromox';
    const result = await onRewrite(lyrics, `${personaName} :: ${stylePrompt}`);
    setLyrics(result);
  }

  async function handleRender() {
    if (!activePersonaId) return;
    setBusy(true);
    try {
      const result = await onRender({ personaId: activePersonaId, lyrics, controls, stylePrompt, guide });
      setOutputUrl(result.audioUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Lyrics & Style Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Lyrics & Prompt */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Lyrics
            </label>
            <textarea
              className="glass-input h-48 w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed text-white placeholder-white/30"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Enter your lyrics..."
            />
            <button
              onClick={handleRewrite}
              className="glass-card-hover mt-3 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            >
              ✨ Rewrite with AI
            </button>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Style Prompt
            </label>
            <input
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="e.g., ethereal, dreamy, powerful..."
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Guide Vocal (Optional)
            </label>
            <GuideDropzone onFile={setGuide} />
          </div>
        </div>

        {/* Right: Style Controls */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Voice Controls
            </label>
            <div className="glass-card rounded-xl p-4">
              <StyleGrid controls={controls} onChange={setControls} />
            </div>
          </div>
        </div>
      </div>

      {/* Render Section */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col gap-4">
          <button
            onClick={handleRender}
            disabled={!activePersonaId || busy}
            className="glass-button w-full rounded-xl py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? '⏳ Rendering Voice...' : '🎵 Render Vocal'}
          </button>

          <Meter active={busy} />

          {outputUrl && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                Output
              </label>
              <AudioPlayer src={outputUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
