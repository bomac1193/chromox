import { Dialog } from '@headlessui/react';
import { useMemo, useState } from 'react';
import { API_HOST } from '../lib/api';
import { Persona, RenderHistoryItem } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  jobs: RenderHistoryItem[];
  personas: Persona[];
  onSelectJob: (job: RenderHistoryItem) => void;
  onReplay: (jobId: string) => Promise<{ audioUrl: string; render: RenderHistoryItem }>;
  refreshJobs: () => Promise<void> | void;
};

export function DownloadLibraryDrawer({
  open,
  onClose,
  jobs,
  personas,
  onSelectJob,
  onReplay,
  refreshJobs
}: Props) {
  const [search, setSearch] = useState('');
  const [personaFilter, setPersonaFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesPersona = personaFilter === 'all' || job.personaId === personaFilter;
      const query = search.toLowerCase();
      const matchesSearch =
        job.personaName.toLowerCase().includes(query) ||
        job.lyrics.toLowerCase().includes(query) ||
        (job.label?.toLowerCase().includes(query) ?? false);
      return matchesPersona && matchesSearch;
    });
  }, [jobs, personaFilter, search]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-black/80 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Dialog.Title className="text-2xl font-bold text-white">Download Library</Dialog.Title>
            <p className="text-sm text-white/60">High-resolution 24-bit renders with recallable settings.</p>
          </div>
          <button onClick={onClose} className="text-sm text-white/60 hover:text-white">
            Close
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            className="glass-input rounded-xl px-3 py-2 text-sm text-white placeholder-white/40"
            placeholder="Search lyrics, persona, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="glass-input rounded-xl px-3 py-2 text-sm text-white"
            value={personaFilter}
            onChange={(e) => setPersonaFilter(e.target.value)}
          >
            <option value="all">All Personas</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => refreshJobs()}
            className="glass-card-hover rounded-xl px-3 py-2 text-sm font-semibold uppercase tracking-wider text-white"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className="glass-card rounded-2xl border border-white/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40">{job.personaName}</p>
                  <h3 className="text-lg font-semibold text-white">{job.label || 'Untitled Session'}</h3>
                  <p className="text-xs text-white/50">{new Date(job.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`${job.audioUrl.startsWith('http') ? job.audioUrl : `${API_HOST}${job.audioUrl}`}`}
                    download
                    className="glass-button rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                  >
                    24-bit WAV
                  </a>
                  <button
                    onClick={() => onSelectJob(job)}
                    className="glass-card-hover rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    Load in Studio
                  </button>
                  <button
                    onClick={async () => {
                      setBusyId(job.id);
                      try {
                        await onReplay(job.id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === job.id}
                    className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white disabled:opacity-50"
                  >
                    {busyId === job.id ? 'Re-rendering...' : 'Reprint'}
                  </button>
                </div>
              </div>
              <p className="mt-3 max-h-16 overflow-hidden text-sm text-white/70">{job.lyrics}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Style: <span className="text-white/80">{job.stylePrompt}</span>
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Engine: <span className="text-white/80">{job.effects.engine}</span>
                </span>
                {job.accent && (
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    Accent: <span className="text-white/80">{job.accent}</span>
                    {job.accentLocked ? ' 🔒' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 p-6 text-center text-white/60">
              No renders yet. Create one in the studio to populate your library.
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
