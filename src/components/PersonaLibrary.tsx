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
    <section className="frosted-panel rounded-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">Persona Vault</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">Voice Collection</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCloneVoice}
            className="glass-button rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-white"
          >
            <span className="neon-text">⬢</span> Clone Voice
          </button>
          <button
            onClick={onCreate}
            className="glass-card-hover rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-white"
          >
            + New Persona
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            active={persona.id === activePersonaId}
            onSelect={onSelect}
          />
        ))}
        {personas.length === 0 && (
          <div className="glass-dropzone col-span-full flex flex-col items-center justify-center rounded-2xl p-12">
            <div className="mb-3 text-4xl opacity-40">⬢</div>
            <p className="text-sm font-medium text-white/60">No personas yet</p>
            <p className="mt-1 text-xs text-white/40">Clone a voice or forge a new persona to begin</p>
          </div>
        )}
      </div>
    </section>
  );
}
