import { Persona } from '../types';
import { PersonaCard } from './PersonaCard';

type PersonaLibraryProps = {
  personas: Persona[];
  activePersonaId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onCloneVoice: () => void;
};

export function PersonaLibrary({ personas, activePersonaId, onSelect, onCreate, onCloneVoice }: PersonaLibraryProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-gradient-to-b from-black/70 to-black/40 p-4 shadow-panel">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Persona Vault</p>
          <h2 className="text-xl font-semibold text-white">Chromatic Identities</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCloneVoice}
            className="rounded-md border border-neon/30 bg-neon/10 px-3 py-2 text-sm uppercase tracking-[0.3em] text-neon transition hover:bg-neon/20"
          >
            ⬢ Clone
          </button>
          <button
            onClick={onCreate}
            className="rounded-md border border-white/10 px-3 py-2 text-sm uppercase tracking-[0.4em] text-white transition hover:border-neon hover:text-neon"
          >
            Forge
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            active={persona.id === activePersonaId}
            onSelect={onSelect}
          />
        ))}
        {personas.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
            No personas yet. Forge one to begin.
          </div>
        )}
      </div>
    </section>
  );
}
