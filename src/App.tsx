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
    <div className="min-h-screen px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="frosted-panel rounded-3xl px-8 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 backdrop-blur-xl">
                <span className="neon-text text-2xl font-bold">⬢</span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">Chromox</p>
                <h1 className="text-3xl font-bold tracking-tight">Vocal Persona Forge</h1>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              Clone any voice, create unlimited vocals with advanced AI synthesis
            </p>
          </div>
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
