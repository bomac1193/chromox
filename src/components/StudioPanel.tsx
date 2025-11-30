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
    <section className="rounded-2xl border border-white/5 bg-black/70 p-5 shadow-panel">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Persona Synth Core</p>
          <h2 className="text-2xl font-semibold text-white">Chromox Studio</h2>
        </div>
        <select
          className="ml-auto rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-neon focus:outline-none"
          value={activePersonaId}
          onChange={(e) => onPersonaChange(e.target.value)}
        >
          <option value="">Select Persona</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-white/50">Lyrics</label>
            <textarea
              className="mt-2 h-40 w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white focus:border-neon focus:outline-none"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
            />
            <button
              onClick={handleRewrite}
              className="mt-2 rounded-md border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-magma/60 hover:text-magma"
            >
              Rewrite w/ AI
            </button>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-white/50">Style Prompt</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-neon focus:outline-none"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
            />
          </div>
          <GuideDropzone onFile={setGuide} />
        </div>
        <div className="space-y-4">
          <StyleGrid controls={controls} onChange={setControls} />
          <button
            onClick={handleRender}
            disabled={!activePersonaId || busy}
            className="w-full rounded-xl border border-neon/40 bg-gradient-to-r from-neon/20 to-magma/20 py-3 text-sm font-semibold uppercase tracking-[0.6em] text-neon transition hover:from-neon/30 hover:to-magma/30 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
          >
            {busy ? 'Rendering...' : 'Render Persona' }
          </button>
          <Meter active={busy} />
          <AudioPlayer src={outputUrl} />
        </div>
      </div>
    </section>
  );
}
