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
      className={`glass-card glass-card-hover group relative overflow-hidden rounded-2xl p-5 text-left ${
        active ? '!border-cyan-400/50 !shadow-[0_0_30px_rgba(34,211,238,0.3)]' : ''
      }`}
    >
      {/* Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {persona.is_cloned && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                <span className="neon-text text-sm">⬢</span>
              </div>
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              {persona.is_cloned ? 'Cloned' : 'Persona'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-cyan-400/60">#{persona.id.slice(0, 6)}</span>
        </div>

        {/* Name */}
        <h3 className="mb-2 text-lg font-bold tracking-tight text-white">{persona.name}</h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/60">{persona.description}</p>

        {/* Voice Stats (if cloned) */}
        {persona.is_cloned && persona.voice_profile && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Pitch</p>
              <p className="text-xs font-semibold text-cyan-400">
                {persona.voice_profile.characteristics.pitchRange.mean.toFixed(0)} Hz
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Brightness</p>
              <p className="text-xs font-semibold text-cyan-400">
                {(persona.voice_profile.characteristics.brightness * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/40">
          <span className="font-medium">{persona.provider}</span>
          <span>{new Date(persona.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Active Indicator */}
      {active && (
        <div className="absolute right-3 top-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        </div>
      )}
    </button>
  );
}
