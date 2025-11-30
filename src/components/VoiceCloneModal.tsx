import { Dialog } from '@headlessui/react';
import { useEffect, useRef, useState, DragEvent } from 'react';
import { StyleControls } from '../types';
import { API_HOST } from '../lib/api';

type AnalysisResult = {
  success: boolean;
  profile: any;
  suggestedControls: StyleControls;
  message: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPersonaCreated: () => void;
};

export function VoiceCloneModal({ open, onClose, onPersonaCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vocalFile, setVocalFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [personaImage, setPersonaImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (personaImage) {
      const url = URL.createObjectURL(personaImage);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreview(null);
  }, [personaImage]);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setVocalFile(file);
      setError('');
    }
  }

  async function handleAnalyze() {
    if (!vocalFile) return;

    setAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('vocal', vocalFile);

      const response = await fetch(`${API_HOST}/api/voice-clone/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreatePersona() {
    if (!vocalFile || !name) return;

    setCreating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('vocal', vocalFile);
      formData.append('name', name);
      formData.append('description', description || `Cloned voice from ${vocalFile.name}`);
      if (personaImage) {
        formData.append('image', personaImage);
      }

      const response = await fetch(`${API_HOST}/api/voice-clone/create-persona`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Persona creation failed');
      }

      const result = await response.json();
      console.log('Persona created:', result);

      // Reset and close
      resetForm();
      onPersonaCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setName('');
    setDescription('');
    setVocalFile(null);
    setAnalysis(null);
    setError('');
    setPersonaImage(null);
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <Dialog.Panel className="frosted-panel w-full max-w-2xl rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                <span className="neon-text text-3xl">⬢</span>
              </div>
              <div>
                <Dialog.Title className="text-2xl font-bold tracking-tight text-white">
                  Clone Voice Persona
                </Dialog.Title>
                <p className="text-sm text-white/50">Extract and save voice characteristics</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Dropzone */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-white/80">Upload Vocal Stem</label>
              <div
                className={`glass-dropzone ${dragging ? 'glass-dropzone-active' : ''} ${
                  vocalFile ? '!border-cyan-400/50' : ''
                } flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl transition-all`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) setVocalFile(file);
                  };
                  input.click();
                }}
              >
                {vocalFile ? (
                  <div className="text-center">
                    <div className="mb-2 text-5xl">🎤</div>
                    <p className="neon-text text-lg font-bold">{vocalFile.name}</p>
                    <p className="mt-2 text-sm text-white/50">
                      {(vocalFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-4 text-6xl opacity-40">📁</div>
                    <p className="text-base font-medium text-white/70">Drop vocal stem or click to browse</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.4em] text-white/40">
                      WAV · AIFF · MP3 · FLAC
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="glass-card rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                    Voice Analysis Complete
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Pitch Range</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {analysis.profile.characteristics.pitchRange.min.toFixed(0)} -{' '}
                      {analysis.profile.characteristics.pitchRange.max.toFixed(0)} Hz
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Brightness</p>
                    <p className="mt-1 text-lg font-bold text-cyan-400">
                      {(analysis.profile.characteristics.brightness * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Breathiness</p>
                    <p className="mt-1 text-lg font-bold text-cyan-400">
                      {(analysis.profile.characteristics.breathiness * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Vibrato</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {analysis.profile.characteristics.vibratoRate.toFixed(1)} Hz
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Name & Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">Persona Name</label>
                <input
                  className="glass-input w-full rounded-xl px-4 py-3 text-white placeholder-white/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Stellar Voice, Dream Singer..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">Description</label>
                <input
                  className="glass-input w-full rounded-xl px-4 py-3 text-white placeholder-white/30"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                />
              </div>
            </div>

            {/* Persona Image */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">Persona Image</label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Persona preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl text-white/40">🌀</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-lg border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:border-white/50"
                  >
                    Upload
                  </button>
                  {personaImage && (
                    <button
                      type="button"
                      onClick={() => setPersonaImage(null)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/60 hover:border-white/30 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setPersonaImage(file ?? null);
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 backdrop-blur-xl">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {!analysis ? (
                <button
                  onClick={handleAnalyze}
                  disabled={!vocalFile || analyzing}
                  className="glass-card-hover flex-1 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-40"
                >
                  {analyzing ? '⏳ Analyzing Voice...' : '🔍 Analyze Voice'}
                </button>
              ) : (
                <button
                  onClick={handleCreatePersona}
                  disabled={!name || creating}
                  className="glass-button flex-1 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-40"
                >
                  {creating ? '⏳ Cloning Voice...' : '⬢ Clone & Save Persona'}
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="glass-card-hover rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white/70 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Info */}
            <div className="glass-card rounded-xl p-5">
              <p className="mb-3 text-sm font-bold text-white/80">How Voice Cloning Works:</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex gap-2">
                  <span className="neon-text">•</span>
                  <span>Upload clean vocal stems (isolated vocals work best)</span>
                </li>
                <li className="flex gap-2">
                  <span className="neon-text">•</span>
                  <span>AI analyzes pitch, timbre, vibrato, and voice characteristics</span>
                </li>
                <li className="flex gap-2">
                  <span className="neon-text">•</span>
                  <span>Voice profile is saved with neural embeddings</span>
                </li>
                <li className="flex gap-2">
                  <span className="neon-text">•</span>
                  <span>Generate unlimited vocals with any lyrics in this voice!</span>
                </li>
              </ul>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
