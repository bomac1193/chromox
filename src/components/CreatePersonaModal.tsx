import { Dialog } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { StyleControls } from '../types';

const baseControls: StyleControls = {
  brightness: 0.5,
  breathiness: 0.5,
  energy: 0.5,
  formant: 0,
  vibratoDepth: 0.4,
  vibratoRate: 0.4,
  roboticism: 0.2,
  glitch: 0.1,
  stereoWidth: 0.5
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    voice_model_key: string;
    provider: string;
    default_style_controls: StyleControls;
    image?: File | null;
  }) => void;
};

export function CreatePersonaModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceKey, setVoiceKey] = useState('');
  const [provider, setProvider] = useState('kits-ai');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreview(null);
  }, [image]);

  function handleSubmit() {
    if (!name || !voiceKey) return;
    onSubmit({
      name,
      description,
      voice_model_key: voiceKey,
      provider,
      default_style_controls: baseControls,
      image
    });
    setName('');
    setDescription('');
    setVoiceKey('');
    setProvider('kits-ai');
    setImage(null);
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 shadow-[0_0_65px_rgba(0,0,0,0.65)]">
          <Dialog.Title className="mb-6 text-2xl font-semibold text-white">Forge Persona Artifact</Dialog.Title>
          <div className="space-y-4">
            <label className="block text-sm text-white/70">
              Name
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm text-white/70">
              Description
              <textarea
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm text-white/70">
              Provider
              <select
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="kits-ai">Kits AI</option>
                <option value="uberduck">Uberduck</option>
                <option value="cantai">Cantai</option>
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Voice Model Key
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-neon focus:outline-none"
                value={voiceKey}
                onChange={(e) => setVoiceKey(e.target.value)}
              />
            </label>
            <div>
              <label className="block text-sm text-white/70">Persona Image</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Persona preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg text-white/50">🎨</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:border-white/40"
                  >
                    Upload
                  </button>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/60 hover:border-white/30 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
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
            <button
              onClick={handleSubmit}
              className="mt-4 w-full rounded-md border border-neon/30 bg-neon/20 py-2 text-sm font-semibold uppercase tracking-[0.5em] text-neon hover:bg-neon/30"
            >
              Forge Artifact
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
