import { Dialog } from '@headlessui/react';
import { useState, DragEvent } from 'react';
import { StyleControls } from '../types';

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

      const response = await fetch('http://localhost:4414/api/voice-clone/analyze', {
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

      const response = await fetch('http://localhost:4414/api/voice-clone/create-persona', {
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
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-2xl border border-neon/30 bg-black/95 p-6 shadow-[0_0_80px_rgba(0,255,180,0.15)]">
          <Dialog.Title className="mb-6 text-2xl font-semibold text-neon">
            ⬢ Clone Voice Persona
          </Dialog.Title>

          <div className="space-y-5">
            {/* Dropzone */}
            <div>
              <label className="mb-2 block text-sm text-white/70">Upload Vocal Stem</label>
              <div
                className={`flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
                  dragging
                    ? 'border-neon bg-neon/10'
                    : vocalFile
                      ? 'border-neon/50 bg-neon/5'
                      : 'border-white/15 bg-white/5'
                }`}
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
                    <p className="text-neon">✓ {vocalFile.name}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {(vocalFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-white/60">Drop vocal stem or click to browse</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.5em] text-white/40">
                      WAV • AIFF • MP3 • FLAC
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="rounded-lg border border-neon/20 bg-neon/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neon">
                  Voice Analysis Complete
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                  <div>
                    Pitch Range:{' '}
                    <span className="text-white">
                      {analysis.profile.characteristics.pitchRange.min.toFixed(0)} -{' '}
                      {analysis.profile.characteristics.pitchRange.max.toFixed(0)} Hz
                    </span>
                  </div>
                  <div>
                    Brightness:{' '}
                    <span className="text-white">
                      {(analysis.profile.characteristics.brightness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    Breathiness:{' '}
                    <span className="text-white">
                      {(analysis.profile.characteristics.breathiness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    Vibrato:{' '}
                    <span className="text-white">
                      {analysis.profile.characteristics.vibratoRate.toFixed(1)} Hz
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Name & Description */}
            <div>
              <label className="block text-sm text-white/70">
                Persona Name
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Stellar Voice, Dark Prophet..."
                />
              </label>
            </div>

            <div>
              <label className="block text-sm text-white/70">
                Description (Optional)
                <textarea
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this voice persona..."
                />
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!analysis ? (
                <button
                  onClick={handleAnalyze}
                  disabled={!vocalFile || analyzing}
                  className="flex-1 rounded-md border border-white/20 bg-white/10 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white hover:bg-white/15 disabled:opacity-30"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze Voice'}
                </button>
              ) : (
                <button
                  onClick={handleCreatePersona}
                  disabled={!name || creating}
                  className="flex-1 rounded-md border border-neon/30 bg-neon/20 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-neon hover:bg-neon/30 disabled:opacity-30"
                >
                  {creating ? 'Cloning...' : '⬢ Clone & Save'}
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            {/* Info */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
              <p className="mb-1 font-semibold text-white/70">How it works:</p>
              <ul className="space-y-1 pl-4">
                <li>• Upload a clean vocal stem (isolated vocals work best)</li>
                <li>• Voice analysis extracts pitch, timbre, and vocal characteristics</li>
                <li>• Persona is saved with voice embedding for future synthesis</li>
                <li>• Use any lyrics to generate new vocals in this voice</li>
              </ul>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
