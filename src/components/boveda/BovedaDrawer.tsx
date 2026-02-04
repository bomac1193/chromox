import { Dialog } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { Persona, Relic, RelicPackSummary, SonicGenomeSummary, SonicArchetype } from '../../types';
import { fetchPersonaRelics, fetchRelicPacks, fetchSonicGenome, fetchSonicArchetypes } from '../../lib/api';
import { RelicCard } from './RelicCard';
import { Reliquary } from './Reliquary';
import { GeneratorPanel } from './GeneratorPanel';
import { ShieldIcon, DnaIcon } from '../Icons';

type Props = {
  open: boolean;
  onClose: () => void;
  personas: Persona[];
  onCreatePersona?: (data: {
    name: string;
    bio: string;
    voice: string;
    color: string;
    personaTags: string[];
    toneAllowed: string[];
    toneForbidden: string[];
    systemPrompt: string;
    lcosData: unknown;
  }) => Promise<void>;
  onCreateRelic?: (personaId: string, relic: { name: string; description: string; lore: string; tier: number; icon: string }) => Promise<void>;
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  'first-render': 'First Render',
  'ten-renders': 'Ten Renders',
  'fifty-renders': 'Fifty Renders',
  'first-like': 'First Like',
  'first-mint': 'First Mint',
  'streak-3': '3-Day Streak',
  'streak-7': '7-Day Streak',
  'effect-explorer': 'Effect Explorer',
  'guide-explorer': 'Guide Explorer',
  'glyph-revealed': 'Glyph Revealed'
};

export function BovedaDrawer({ open, onClose, personas, onCreatePersona, onCreateRelic }: Props) {
  const [tab, setTab] = useState<'genome' | 'relics' | 'reliquary'>('genome');
  const [loading, setLoading] = useState(false);

  // Genome state
  const [genome, setGenome] = useState<SonicGenomeSummary | null>(null);
  const [archetypes, setArchetypes] = useState<Record<string, SonicArchetype>>({});

  // Relics state
  const [relicsByPersona, setRelicsByPersona] = useState<Record<string, Relic[]>>({});
  const [packs, setPacks] = useState<RelicPackSummary[]>([]);


  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  async function loadData() {
    setLoading(true);
    try {
      const [genomeData, archetypeData, packsData, ...relicResults] = await Promise.all([
        fetchSonicGenome(),
        fetchSonicArchetypes(),
        fetchRelicPacks(),
        ...personas.map((p) => fetchPersonaRelics(p.id).then((relics) => ({ personaId: p.id, relics })))
      ]);
      setGenome(genomeData);
      setArchetypes(archetypeData);
      setPacks(packsData);
      const map: Record<string, Relic[]> = {};
      for (const result of relicResults) {
        if (result.relics.length > 0) {
          map[result.personaId] = result.relics;
        }
      }
      setRelicsByPersona(map);
    } catch (error) {
      console.error('[Boveda] Failed to load', error);
    } finally {
      setLoading(false);
    }
  }


  const totalRelics = Object.values(relicsByPersona).reduce((sum, r) => sum + r.length, 0);

  // Genome derived values
  const primary = genome?.archetype.primary;
  const secondary = genome?.archetype.secondary;
  const gam = genome?.gamification;
  const distEntries = genome
    ? Object.entries(genome.archetype.distribution).sort((a, b) => b[1] - a[1])
    : [];
  const maxDist = distEntries.length > 0 ? Math.max(...distEntries.map(([, v]) => Math.abs(v)), 1) : 1;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border-default bg-canvas shadow-2xl">
        {/* Header */}
        <div className="border-b border-border-default px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <ShieldIcon className="text-accent" size={18} />
              </div>
              <div>
                <Dialog.Title className="font-display text-xl font-semibold">Boveda</Dialog.Title>
                <p className="text-sm text-secondary">
                  {primary
                    ? `${primary.glyph} · ${primary.title}`
                    : 'Voice Identity Vault'}
                  {totalRelics > 0 && ` · ${totalRelics} relic${totalRelics !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-sm text-muted transition hover:text-primary">
              Close
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1">
            {(['genome', 'relics', 'reliquary'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${
                  tab === t ? 'bg-accent/15 text-accent' : 'text-muted hover:text-secondary'
                }`}
              >
                {t === 'genome' ? 'Genome' : t === 'relics' ? 'Relics' : 'Reliquary'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted">Loading boveda...</p>
            </div>
          )}

          {/* ── GENOME TAB ──────────────────────────────────────── */}
          {!loading && tab === 'genome' && genome && (
            <div className="space-y-6">
              {/* Primary Archetype Card */}
              <div
                className="rounded-2xl border p-5"
                style={{ borderColor: primary ? `${primary.color}40` : undefined, backgroundColor: primary ? `${primary.color}08` : undefined }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
                    style={{ backgroundColor: primary ? `${primary.color}20` : 'rgba(160,160,160,0.1)', color: primary?.color }}
                  >
                    {primary?.glyph ?? 'VOID'}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      {primary?.designation ?? 'NULL'} · {primary?.creativeMode ?? 'Receptive'}
                    </p>
                    <h3 className="font-display text-lg font-semibold" style={{ color: primary?.color }}>
                      {primary?.title ?? 'The Receptive Presence'}
                    </h3>
                    <p className="mt-1 text-sm text-secondary">
                      {primary?.essence ?? 'Open, unclassified. Pure potential.'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Confidence</span>
                      <div className="h-1.5 flex-1 rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round(genome.archetype.confidence * 100)}%`, backgroundColor: primary?.color ?? '#A0A0A0' }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-muted">
                        {Math.round(genome.archetype.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                {primary?.shadow && (
                  <p className="mt-3 text-xs italic text-muted">Shadow: {primary.shadow}</p>
                )}
              </div>

              {/* Secondary Archetype */}
              {secondary && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Secondary Archetype</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-lg font-bold" style={{ color: secondary.color }}>
                      {secondary.glyph}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: secondary.color }}>
                        {secondary.title}
                      </p>
                      <p className="text-xs text-muted">{secondary.essence}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Distribution Grid */}
              {distEntries.length > 0 && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Archetype Distribution
                  </p>
                  <div className="space-y-2">
                    {distEntries.map(([designation, value]) => {
                      const arch = archetypes[designation];
                      const pct = Math.max(0, (value / maxDist) * 100);
                      return (
                        <div key={designation} className="flex items-center gap-2">
                          <span className="w-12 text-right font-mono text-[10px] text-muted">
                            {arch?.glyph ?? designation}
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-elevated">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: arch?.color ?? '#A0A0A0' }}
                            />
                          </div>
                          <span className="w-8 font-mono text-[10px] text-muted">
                            {value.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gamification */}
              {gam && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Tier: {gam.tierName}
                    </p>
                    <span className="font-mono text-sm font-semibold text-accent">
                      {gam.xp} XP
                    </span>
                  </div>
                  {gam.nextTierName && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>{gam.tierName}</span>
                        <span>{gam.nextTierName} ({gam.nextTierXP} XP)</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${Math.min(100, (gam.xp / (gam.nextTierXP ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-elevated p-2">
                      <p className="text-lg font-semibold text-primary">{gam.totalRenders}</p>
                      <p className="text-[9px] uppercase tracking-wide text-muted">Renders</p>
                    </div>
                    <div className="rounded-lg bg-elevated p-2">
                      <p className="text-lg font-semibold text-primary">{gam.totalLikes}</p>
                      <p className="text-[9px] uppercase tracking-wide text-muted">Likes</p>
                    </div>
                    <div className="rounded-lg bg-elevated p-2">
                      <p className="text-lg font-semibold text-primary">{gam.streak}</p>
                      <p className="text-[9px] uppercase tracking-wide text-muted">Streak</p>
                    </div>
                  </div>

                  {gam.achievements.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">Achievements</p>
                      <div className="flex flex-wrap gap-2">
                        {gam.achievements.map((id) => (
                          <span
                            key={id}
                            className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-medium text-accent"
                          >
                            {ACHIEVEMENT_LABELS[id] ?? id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Sonic Keywords */}
              {genome.topKeywords.length > 0 && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Top Sonic Keywords
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {genome.topKeywords.map(({ keyword, score, count }) => (
                      <span
                        key={keyword}
                        className={`rounded-full border px-3 py-1 text-[10px] font-medium ${
                          score > 0
                            ? 'border-accent/30 bg-accent/10 text-accent'
                            : 'border-error/30 bg-error/10 text-error'
                        }`}
                      >
                        {keyword} ({score > 0 ? '+' : ''}{score}, {count}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sonic Patterns */}
              {(genome.sonicPatterns.dominantTextures.length > 0 ||
                genome.sonicPatterns.preferredMoods.length > 0 ||
                genome.sonicPatterns.productionStyle.length > 0) && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Sonic Patterns
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {genome.sonicPatterns.dominantTextures.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Textures</p>
                        <p className="text-sm text-primary">{genome.sonicPatterns.dominantTextures.join(', ')}</p>
                      </div>
                    )}
                    {genome.sonicPatterns.preferredMoods.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Moods</p>
                        <p className="text-sm text-primary">{genome.sonicPatterns.preferredMoods.join(', ')}</p>
                      </div>
                    )}
                    {genome.sonicPatterns.productionStyle.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Production</p>
                        <p className="text-sm text-primary">{genome.sonicPatterns.productionStyle.join(', ')}</p>
                      </div>
                    )}
                    {genome.sonicPatterns.vocalPreference.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Vocal</p>
                        <p className="text-sm text-primary">{genome.sonicPatterns.vocalPreference.join(', ')}</p>
                      </div>
                    )}
                    {genome.sonicPatterns.spatialPreference.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Space</p>
                        <p className="text-sm text-primary">{genome.sonicPatterns.spatialPreference.join(', ')}</p>
                      </div>
                    )}
                    {genome.sonicPatterns.avoidTextures.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Avoid</p>
                        <p className="text-sm text-error">{genome.sonicPatterns.avoidTextures.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tuning / governance metrics */}
              {gam && (gam.uniqueEffects.length > 0 || gam.uniqueGuides.length > 0) && (
                <div className="rounded-xl border border-border-default bg-surface p-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Exploration
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-elevated p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted">Unique Effects</p>
                      <p className="text-xl font-semibold text-primary">{gam.uniqueEffects.length}</p>
                      {gam.uniqueEffects.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {gam.uniqueEffects.map((e) => (
                            <span key={e} className="rounded-full border border-border-default px-2 py-0.5 text-[9px] text-muted">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg bg-elevated p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted">Unique Guides</p>
                      <p className="text-xl font-semibold text-primary">{gam.uniqueGuides.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats footer */}
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>{genome.signalCount} signals recorded</span>
                <span>
                  {genome.lastUpdated
                    ? `Updated ${new Date(genome.lastUpdated).toLocaleDateString()}`
                    : 'No activity yet'}
                </span>
              </div>
            </div>
          )}

          {!loading && tab === 'genome' && !genome && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DnaIcon className="mb-3 text-muted" size={32} />
              <p className="text-sm font-medium text-secondary">Genome not initialized</p>
              <p className="mt-1 text-xs text-muted">
                Start rendering to begin building your sonic identity
              </p>
            </div>
          )}

          {/* ── RELICS TAB ──────────────────────────────────────── */}
          {!loading && tab === 'relics' && (
            <div className="space-y-6">
              {/* Character & Relic Generator */}
              <GeneratorPanel
                onAcceptPersona={onCreatePersona ?? (async () => {})}
                onAcceptRelic={onCreateRelic ? async (personaId, relic) => {
                  await onCreateRelic(personaId, relic);
                  await loadData();
                } : undefined}
                personas={personas}
              />

              {/* Relics grouped by persona */}
              {personas.map((persona) => {
                const relics = relicsByPersona[persona.id];
                if (!relics || relics.length === 0) return null;
                return (
                  <div key={persona.id}>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                      {persona.name} ({relics.length})
                    </h3>
                    <div className="space-y-3">
                      {relics.map((relic) => (
                        <RelicCard key={relic.id} relic={relic} variant="generated" />
                      ))}
                    </div>
                  </div>
                );
              })}

              {totalRelics === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-surface p-12 text-center">
                  <ShieldIcon className="mb-3 text-muted" size={32} />
                  <p className="text-sm font-medium text-secondary">No relics yet</p>
                  <p className="mt-1 text-xs text-muted">
                    Like 5 renders for a persona to auto-generate relics, or use the generator above in Relic mode
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── RELIQUARY TAB ───────────────────────────────────── */}
          {!loading && tab === 'reliquary' && (
            <Reliquary packs={packs} onUnlock={() => loadData()} />
          )}
        </div>
      </div>
    </Dialog>
  );
}
