import { Dialog } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { Persona } from '../types';
import { API_HOST, generatePersonaIdea } from '../lib/api';

type Props = {
  open: boolean;
  persona: Persona | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    data: {
      name: string;
      description: string;
      provider: string;
      voice_model_key: string;
      image?: File | null;
      image_focus_x?: number;
      image_focus_y?: number;
    }
  ) => void | Promise<void>;
};

export function EditPersonaModal({ open, persona, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('kits-ai');
  const [voiceKey, setVoiceKey] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [useMononym, setUseMononym] = useState(false);
  const [imageFocus, setImageFocus] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!persona) return;
    setName(persona.name);
    setDescription(persona.description);
    setProvider(persona.provider);
    setVoiceKey(persona.voice_model_key);
    setImage(null);
    setPreview(persona.image_url ? `${API_HOST}${persona.image_url}` : null);
    setUseMononym(false);
    setImageFocus({
      x: persona.image_focus_x ?? 50,
      y: persona.image_focus_y ?? 50
    });
  }, [persona?.id]);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!image && persona?.image_url) {
      setPreview(`${API_HOST}${persona.image_url}`);
    } else if (!image) {
      setPreview(null);
    }
  }, [image, persona?.image_url]);

  useEffect(() => {
    function stopDragging() {
      setDragging(false);
    }
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchend', stopDragging);
    return () => {
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
    };
  }, []);

  function updateFocusFromPoint(clientX: number, clientY: number) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setImageFocus({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    });
  }

  function handlePointerDown(clientX: number, clientY: number) {
    if (!preview) return;
    setDragging(true);
    updateFocusFromPoint(clientX, clientY);
  }

  function handlePointerMove(clientX: number, clientY: number) {
    if (!dragging) return;
    updateFocusFromPoint(clientX, clientY);
  }

  function handleSubmit() {
    if (!persona) return;
    onSubmit(persona.id, {
      name,
      description,
      provider,
      voice_model_key: voiceKey,
      image,
      image_focus_x: imageFocus.x,
      image_focus_y: imageFocus.y
    });
  }

  async function handleRandomize() {
    if (!persona) return;
    try {
      setRandomizing(true);
      const idea = await generatePersonaIdea({ seed: persona.description, mononym: useMononym });
      setName(idea.name);
      setDescription(idea.description);
    } finally {
      setRandomizing(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-[0_0_65px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold text-white">Edit Persona</Dialog.Title>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-white/60">
                <input
                  type="checkbox"
                  checked={useMononym}
                  onChange={(e) => setUseMononym(e.target.checked)}
                  className="accent-cyan-400"
                />
                Mononym
              </label>
              <button
                type="button"
                onClick={handleRandomize}
                disabled={!persona || randomizing}
                className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {randomizing ? 'Weaving…' : 'AI Randomize'}
              </button>
            </div>
          </div>
          {persona ? (
            <div className="space-y-4 text-sm text-white/80">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.4em] text-white/50">Name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.4em] text-white/50">Description</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.4em] text-white/50">Provider</span>
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="kits-ai">Kits AI</option>
                  <option value="uberduck">Uberduck</option>
                  <option value="cantai">Cantai</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.4em] text-white/50">Voice Model Key</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  value={voiceKey}
                  onChange={(e) => setVoiceKey(e.target.value)}
                />
              </label>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Portrait</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    ref={previewRef}
                    className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5"
                    onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                    onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      handlePointerDown(touch.clientX, touch.clientY);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      handlePointerMove(touch.clientX, touch.clientY);
                    }}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Persona preview"
                        className="h-full w-full select-none object-cover"
                        style={{ objectPosition: `${imageFocus.x}% ${imageFocus.y}%` }}
                      />
                    ) : (
                      <span className="text-lg text-white/50">🎤</span>
                    )}
                    {preview && <div className="pointer-events-none absolute inset-0 border border-white/20 shadow-inner" />}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-white hover:border-white/40"
                    >
                      Upload
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage(null)}
                        className="rounded-md border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/60 hover:border-white/30 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {preview && (
                  <p className="mt-2 text-[11px] text-white/50">Drag to reframe the portrait before saving.</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setImage(file ?? null);
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 hover:border-white/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200 hover:border-cyan-200/70"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/70">Select a persona to edit.</p>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
