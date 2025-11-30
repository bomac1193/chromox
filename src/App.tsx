import { useEffect, useState } from 'react';
import { Persona, StyleControls } from './types';
import { PersonaLibrary } from './components/PersonaLibrary';
import { StudioPanel } from './components/StudioPanel';
import { CreatePersonaModal } from './components/CreatePersonaModal';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import { createPersona, fetchPersonas, renderPerformance, rewriteLyrics } from './lib/api';

export default function App() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | undefined>(undefined);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const data = await fetchPersonas();
    setPersonas(data);
    if (!activePersonaId && data.length) {
      setActivePersonaId(data[0].id);
    }
  }

  async function handleCreate(payload: {
    name: string;
    description: string;
    voice_model_key: string;
    provider: string;
    default_style_controls: StyleControls;
  }) {
    const persona = await createPersona(payload);
    setPersonas((prev) => [...prev, persona]);
    setForgeOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.6em] text-white/40">Chromox</p>
          <h1 className="text-4xl font-semibold">Vocal Persona Forge</h1>
          <p className="text-sm text-white/60">
            A compact workstation for sculpting AI voices with the Nebula Tone Network.
          </p>
        </header>
        <PersonaLibrary
          personas={personas}
          activePersonaId={activePersonaId}
          onSelect={setActivePersonaId}
          onCreate={() => setForgeOpen(true)}
          onCloneVoice={() => setCloneOpen(true)}
        />
        <StudioPanel
          personas={personas}
          activePersonaId={activePersonaId}
          onPersonaChange={setActivePersonaId}
          onRewrite={rewriteLyrics}
          onRender={renderPerformance}
        />
      </div>
      <CreatePersonaModal open={forgeOpen} onClose={() => setForgeOpen(false)} onSubmit={handleCreate} />
      <VoiceCloneModal open={cloneOpen} onClose={() => setCloneOpen(false)} onPersonaCreated={refresh} />
    </div>
  );
}
