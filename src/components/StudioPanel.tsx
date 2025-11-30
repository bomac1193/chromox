import { useEffect, useState } from 'react';
import { EffectSettings, Persona, RenderHistoryItem, StyleControls } from '../types';
import { StyleGrid } from './StyleGrid';
import { GuideDropzone } from './GuideDropzone';
import { Meter } from './Meter';
import { AudioPlayer } from './AudioPlayer';
import { uploadGuideSample } from '../lib/api';

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
  preset: 'clean',
  clarity: 0.7,
  air: 0.4,
  drive: 0.15,
  width: 0.5,
  noiseReduction: 0.4,
  space: 'studio',
  dynamics: 0.6,
  orbitSpeed: 0.5,
  orbitDepth: 0.75,
  orbitTilt: 0.4,
  bypassEffects: false
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
    guideSampleId?: string;
    guideMatchIntensity?: number;
    guideUseLyrics?: boolean;
    guideTempo?: number;
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
    guideSampleId?: string;
    guideMatchIntensity?: number;
    guideUseLyrics?: boolean;
    guideTempo?: number;
  }) => Promise<{ audioUrl: string }>;
  onGuideLibraryUpdated?: () => void;
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
  onPreview,
  onGuideLibraryUpdated
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
  const [guideMatchIntensity, setGuideMatchIntensity] = useState(0.7);
  const [selectedGuideSampleId, setSelectedGuideSampleId] = useState<string | undefined>(undefined);
  const [guideName, setGuideName] = useState('');
  const [savingGuide, setSavingGuide] = useState(false);
  const [guideUseLyrics, setGuideUseLyrics] = useState(false);
  const [guideTempo, setGuideTempo] = useState(1);
  const activePersona = personas.find((p) => p.id === activePersonaId);
  const guideSamples = activePersona?.guide_samples ?? [];
  const hasGuideSelection = Boolean(selectedGuideSampleId || guide);

  useEffect(() => {
    if (prefill) {
      setLyrics(prefill.lyrics);
      setStylePrompt(prefill.stylePrompt);
      setControls(prefill.controls);
      setEffects(prefill.effects);
      setLabel(prefill.label ?? '');
      setAccent(prefill.accent ?? 'auto');
      setAccentLocked(prefill.accentLocked ?? false);
      setGuideMatchIntensity(prefill.guideMatchIntensity ?? 0.7);
      setSelectedGuideSampleId(prefill.guideSampleId);
      setGuideUseLyrics(prefill.guideUseLyrics ?? false);
      setGuideTempo(prefill.guideTempo ?? 1);
      onPrefillConsumed?.();
    }
  }, [prefill?.id]);

  useEffect(() => {
    setSelectedGuideSampleId(undefined);
    setGuideUseLyrics(false);
    setGuideTempo(1);
  }, [activePersonaId]);

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
        guideSampleId: selectedGuideSampleId,
        guideMatchIntensity,
        guideUseLyrics,
        guideTempo,
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
        guideSampleId: selectedGuideSampleId,
        guideMatchIntensity,
        guideUseLyrics,
        guideTempo,
        guide,
        previewSeconds: 12
      });
      setPreviewUrl(result.audioUrl);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleSaveGuideSample() {
    if (!activePersonaId || !guide) return;
    setSavingGuide(true);
    try {
      const entry = await uploadGuideSample(activePersonaId, guide, guideName || guide.name);
      setSelectedGuideSampleId(entry.id);
      setGuideName('');
      onGuideLibraryUpdated?.();
    } catch (error) {
      console.error('[Guide] Failed to save sample', error);
    } finally {
      setSavingGuide(false);
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

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                Guide Vocal (Optional)
              </label>
              <GuideDropzone onFile={setGuide} />
            </div>
            {guide && activePersonaId && (
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">Save to persona</p>
                <input
                  className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none"
                  placeholder="Guide name"
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                />
                <button
                  onClick={handleSaveGuideSample}
                  disabled={savingGuide}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/80 transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingGuide ? 'Saving…' : 'Save to Persona Library'}
                </button>
              </div>
            )}
            {(guideSamples.length > 0 || guide) && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">Guide Controls</p>
                {guideSamples.length > 0 && (
                  <>
                    <select
                      className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                      value={selectedGuideSampleId ?? ''}
                      onChange={(e) => setSelectedGuideSampleId(e.target.value || undefined)}
                    >
                      <option value="">Use uploaded clip</option>
                      {guideSamples.map((sample) => (
                        <option key={sample.id} value={sample.id}>
                          {sample.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-white/60">
                      Choose a stored guide or leave blank to use the freshly uploaded clip.
                    </p>
                  </>
                )}
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.5em] text-white/60">
                  <input
                    type="checkbox"
                    className="accent-cyan-400"
                    checked={guideUseLyrics}
                    onChange={(e) => setGuideUseLyrics(e.target.checked)}
                    disabled={!hasGuideSelection}
                  />
                  Use guide lyrics
                </label>
                <p className="text-[11px] text-white/50">
                  {hasGuideSelection
                    ? 'When enabled, your typed lyrics are ignored and the guide’s transcription is used.'
                    : 'Upload or select a guide to enable lyric matching.'}
                </p>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">Guide Match Intensity</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/70">
                    <span>Blend</span>
                    <span className="font-mono text-white">{Math.round(guideMatchIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={guideMatchIntensity}
                    onChange={(e) => setGuideMatchIntensity(parseFloat(e.target.value))}
                    disabled={!hasGuideSelection}
                    className="mt-1 w-full accent-cyan-400 disabled:opacity-40"
                  />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">Guide Tempo</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/70">
                    <span>Speed</span>
                    <span className="font-mono text-white">{guideTempo.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6}
                    step={0.05}
                    value={guideTempo}
                    onChange={(e) => setGuideTempo(parseFloat(e.target.value))}
                    disabled={!hasGuideSelection}
                    className="mt-1 w-full accent-cyan-400 disabled:opacity-40"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Style Controls */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
              <span>Voice Controls</span>
              <span>Values are rendered inside each slider</span>
            </div>
            <StyleGrid controls={controls} onChange={setControls} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
              Effects & Mastering
            </label>
            <div className="glass-card space-y-4 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-1 flex-col">
                  <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">FX Preset</p>
                  <select
                    className="mt-1 rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    value={effects.preset ?? 'clean'}
                    onChange={(e) =>
                      setEffects((prev) => ({ ...prev, preset: e.target.value as EffectSettings['preset'] }))
                    }
                  >
                    <option value="clean">Clean Studio</option>
                    <option value="vintage">Vintage Warmth</option>
                    <option value="club">Club Stack</option>
                    <option value="raw">Raw Direct</option>
                    <option value="shimmer-stack">Shimmer Stack</option>
                    <option value="harmonic-orbit">Harmonic Orbit 8D</option>
                    <option value="pitch-warp">Pitch Warp Chorus</option>
                    <option value="choir-cloud">Choir Cloud</option>
                    <option value="8d-swarm">8D Swarm</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.5em] text-white/70">
                  <input
                    type="checkbox"
                    className="accent-cyan-400"
                    checked={effects.bypassEffects ?? false}
                    onChange={(e) => setEffects((prev) => ({ ...prev, bypassEffects: e.target.checked }))}
                  />
                  Bypass
                </label>
              </div>
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
                    className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
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
                    className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
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
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-950 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.6)]">
        <div className="grid gap-4 lg:grid-cols-3">
          <button
            onClick={handlePreview}
            disabled={!activePersonaId || previewBusy}
            className="rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-white/80 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {previewBusy ? 'Previewing…' : 'Preview 12s'}
          </button>
          <button
            onClick={handleRender}
            disabled={!activePersonaId || busy}
            className="rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-slate-950 shadow-[0_20px_60px_rgba(59,130,246,0.55)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Rendering…' : 'Render Vocal'}
          </button>
          <div className="rounded-2xl border border-white/15 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Status</p>
            <p className="text-sm text-white/80">
              {busy
                ? 'Printing chromatic mix…'
                : previewBusy
                  ? 'Sketching preview layers…'
                  : 'Idle • ready for playback'}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <Meter active={busy || previewBusy} />
          <div className="mt-2 grid grid-cols-4 text-[9px] uppercase tracking-[0.5em] text-white/40">
            <span>Tempo {guideTempo.toFixed(2)}x</span>
            <span>Blend {Math.round(guideMatchIntensity * 100)}%</span>
            <span className="text-right">{effects.bypassEffects ? 'Bypass' : effects.preset}</span>
            <span className="text-right">{effects.engine}</span>
          </div>
        </div>

        {(previewUrl || outputUrl) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {previewUrl && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Preview</p>
                <AudioPlayer src={previewUrl} />
              </div>
            )}
            {outputUrl && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Output</p>
                <AudioPlayer src={outputUrl} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
