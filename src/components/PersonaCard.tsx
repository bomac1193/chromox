import { Persona } from '../types';

type PersonaCardProps = {
  persona: Persona;
  active?: boolean;
  onSelect?: (id: string) => void;
};

export function PersonaCard({ persona, active, onSelect }: PersonaCardProps) {
  return (
    <button
      onClick={() => onSelect?.(persona.id)}
      className={`group flex flex-col gap-2 rounded-lg border border-white/5 bg-black/40 p-4 text-left transition hover:border-neon/40 ${
        active ? 'border-neon/60 shadow-[0_0_20px_rgba(77,229,255,0.15)]' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
        <span>Persona</span>
        <span className="font-mono text-[10px] text-neon/80">#{persona.id.slice(0, 4)}</span>
      </div>
      <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
      <p className="text-sm text-white/60 line-clamp-2">{persona.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
        <span>{persona.provider}</span>
        <span>{new Date(persona.created_at).toLocaleDateString()}</span>
      </div>
    </button>
  );
}
