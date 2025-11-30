import { useEffect, useState } from 'react';
import { EffectSettings, Persona, RenderHistoryItem, StyleControls } from '../types';
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

const defaultEffects: EffectSettings = {
  engine: 'rave-ddsp-8d',
  clarity: 0.7,
  air: 0.4,
  drive: 0.15,
  width: 0.5,
  noiseReduction: 0.4,
  space: 'studio',
  dynamics: 0.6,
  orbitSpeed: 0.5,
  orbitDepth: 0.75,
  orbitTilt: 0.4
};

type NumericEffectKey = 'clarity' | 'air' | 'drive' | 'width' | 'noiseReduction' | 'dynamics';
const effectSliderConfig: Array<{ key: NumericEffectKey; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'air', label: 'Air' },
  { key: 'drive', label: 'Drive' },
  { key: 'width', label: 'Stereo Width' },
  { key: 'noiseReduction', label: 'Noise Reduction' },
  { key: 'dynamics', label: 'Dynamics' }
];
type OrbitEffectKey = 'orbitSpeed' | 'orbitDepth' | 'orbitTilt';
const orbitSliderConfig: Array<{ key: OrbitEffectKey; label: string; defaultValue: number }> = [
  { key: 'orbitSpeed', label: 'Orbit Speed', defaultValue: 0.5 },
  { key: 'orbitDepth', label: 'Orbit Depth', defaultValue: 0.75 },
  { key: 'orbitTilt', label: 'Orbit Tilt', defaultValue: 0.4 }
];

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
    effects: EffectSettings;
    label?: string;
    accent?: string;
    accentLocked?: boolean;
    guide?: File;
  }) => Promise<{ audioUrl: string; render: RenderHistoryItem }>;
  onRenderComplete: (render: RenderHistoryItem) => void;
  prefill?: RenderHistoryItem | null;
  onPrefillConsumed?: () => void;
  onPreview: (payload: {
    personaId: string;
    lyrics: string;
    controls: StyleControls;
    stylePrompt: string;
    effects: EffectSettings;
    guide?: File;
    previewSeconds?: number;
    accent?: string;
    accentLocked?: boolean;
  }) => Promise<{ audioUrl: string }>;
};

export function StudioPanel({
  personas,
  activePersonaId,
  onPersonaChange,
  onRewrite,
  onRender,
  onRenderComplete,
  prefill,
  onPrefillConsumed,
  onPreview
}: Props) {
  const [lyrics, setLyrics] = useState('Layer me in prismatic light...');
  const [stylePrompt, setStylePrompt] = useState('holographic croon, velvet aggression');
  const [controls, setControls] = useState<StyleControls>(defaultControls);
  const [effects, setEffects] = useState<EffectSettings>(defaultEffects);
  const [label, setLabel] = useState('');
  const [accent, setAccent] = useState('auto');
  const [accentLocked, setAccentLocked] = useState(false);
  const [guide, setGuide] = useState<File | undefined>(undefined);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);

  useEffect(() => {
    if (prefill) {
      setLyrics(prefill.lyrics);
      setStylePrompt(prefill.stylePrompt);
      setControls(prefill.controls);
      setEffects(prefill.effects);
      setLabel(prefill.label ?? '');
      setAccent(prefill.accent ?? 'auto');
      setAccentLocked(prefill.accentLocked ?? false);
      onPrefillConsumed?.();
    }
  }, [prefill?.id]);

  async function handleRewrite() {
    const personaName = personas.find((p) => p.id === activePersonaId)?.name ?? 'Chromox';
    const result = await onRewrite(lyrics, `${personaName} :: ${stylePrompt}`);
    setLyrics(result);
  }

  async function handleRender() {
    if (!activePersonaId) return;
    setBusy(true);
    try {
      const result = await onRender({
        personaId: activePersonaId,
        lyrics,
        controls,
        stylePrompt,
        effects,
        label,
        accent: accent === 'auto' ? undefined : accent,
        accentLocked,
        guide
      });
      setOutputUrl(result.audioUrl);
      onRenderComplete(result.render);
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview() {
    if (!activePersonaId) return;
    setPreviewBusy(true);
    try {
      const result = await onPreview({
        personaId: activePersonaId,
        lyrics,
        controls,
        stylePrompt,
        effects,
        accent: accent === 'auto' ? undefined : accent,
        accentLocked,
        guide,
        previewSeconds: 12
      });
      setPreviewUrl(result.audioUrl);
    } finally {
      setPreviewBusy(false);
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                Session Tag / Collection
              </label>
              <input
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Neon Ballad Pack"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                Accent
              </label>
              <select
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              >
                <option value="auto">Auto / Persona Default</option>
                <option value="uk-london">British · London</option>
                <option value="us-west">American · West Coast</option>
                <option value="us-south">American · Southern</option>
                <option value="au-melbourne">Australian · Melbourne</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <input
              type="checkbox"
              className="accent-cyan-400"
              checked={accentLocked}
              onChange={(e) => setAccentLocked(e.target.checked)}
            />
            Lock Accent
          </label>

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
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Effects & Mastering
            </label>
            <div className="glass-card space-y-4 rounded-xl p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {effectSliderConfig.map(({ key, label: sliderLabel }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
                      <span>{sliderLabel}</span>
                      <span>{Math.round(effects[key] * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={effects[key]}
                      onChange={(e) =>
                        setEffects((prev) => ({
                          ...prev,
                          [key]: parseFloat(e.target.value)
                        }))
                      }
                      className="mt-1 w-full accent-cyan-400"
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-white/60">Engine</p>
                  <select
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    value={effects.engine}
                    onChange={(e) =>
                      setEffects((prev) => ({ ...prev, engine: e.target.value as EffectSettings['engine'] }))
                    }
                  >
                    <option value="rave-ddsp-8d">RAVE + DDSP + 8D Orbit</option>
                    <option value="rave-ddsp">RAVE + DDSP</option>
                    <option value="resonance-8d">Resonance 8D Spatializer</option>
                    <option value="chromox-labs">Chromox Labs DSP</option>
                    <option value="izotope-nectar">iZotope Nectar</option>
                    <option value="waves-clarity">Waves Clarity Vx</option>
                    <option value="antelope-synergy">Antelope Synergy Core</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-white/60">Space</p>
                  <select
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    value={effects.space}
                    onChange={(e) =>
                      setEffects((prev) => ({ ...prev, space: e.target.value as EffectSettings['space'] }))
                    }
                  >
                    <option value="dry">Dry Booth</option>
                    <option value="studio">Studio Plate</option>
                    <option value="hall">Concert Hall</option>
                    <option value="arena">Arena Bloom</option>
                  </select>
                </div>
              </div>
              {(effects.engine.includes('8d') || effects.engine === 'resonance-8d') && (
                <div className="grid gap-4 md:grid-cols-3">
                  {orbitSliderConfig.map(({ key, label: orbitLabel, defaultValue }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
                        <span>{orbitLabel}</span>
                        <span>{Math.round((effects[key] ?? defaultValue) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={effects[key] ?? defaultValue}
                        onChange={(e) =>
                          setEffects((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value)
                          }))
                        }
                        className="mt-1 w-full accent-rose-400"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-white/50">
                Powered by Chromox DSP with bridges for Nectar, Waves Clarity, and Synergy Core. All renders
                are bounced to 24-bit WAV automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render Section */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <button
              onClick={handlePreview}
              disabled={!activePersonaId || previewBusy}
              className="glass-card-hover flex-1 rounded-xl py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {previewBusy ? '⏳ Previewing...' : '🎧 Preview 12s'}
            </button>
            <button
              onClick={handleRender}
              disabled={!activePersonaId || busy}
              className="glass-button flex-1 rounded-xl py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? '⏳ Rendering Voice...' : '🎵 Render Vocal'}
            </button>
          </div>

          <Meter active={busy} />

          {previewUrl && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                Preview
              </label>
              <AudioPlayer src={previewUrl} />
            </div>
          )}

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
