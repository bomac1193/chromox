import { useEffect, useState } from 'react';
import { Persona, RenderHistoryItem, StyleControls } from './types';
import { StudioPanel } from './components/StudioPanel';
import { CreatePersonaModal } from './components/CreatePersonaModal';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import {
  API_HOST,
  createPersona,
  fetchPersonas,
  fetchRenderHistory,
  renderPerformance,
  replayRender,
  rewriteLyrics,
  previewPerformance
} from './lib/api';
import { DownloadLibraryDrawer } from './components/DownloadLibraryDrawer';

export default function App() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | undefined>(undefined);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [renderHistory, setRenderHistory] = useState<RenderHistoryItem[]>([]);
  const [prefillJob, setPrefillJob] = useState<RenderHistoryItem | null>(null);
  function handlePrefillConsumed() {
    setPrefillJob(null);
  }

  useEffect(() => {
    refresh();
    refreshDownloads();
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
    image?: File | null;
  }) {
    const persona = await createPersona(payload);
    setPersonas((prev) => [...prev, persona]);
    setForgeOpen(false);
  }

  async function refreshDownloads() {
    const history = await fetchRenderHistory();
    setRenderHistory(history);
  }

  function handleRenderComplete(job: RenderHistoryItem) {
    setRenderHistory((prev) => [job, ...prev]);
  }

  function handleLoadJob(job: RenderHistoryItem) {
    setActivePersonaId(job.personaId);
    setPrefillJob(job);
    setDownloadsOpen(false);
  }

  const activePersona = personas.find((p) => p.id === activePersonaId);
  const activePersonaImage = activePersona?.image_url ? `${API_HOST}${activePersona.image_url}` : undefined;

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
              <span className="neon-text text-xl font-bold">⬢</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Chromox</h1>
              <p className="text-xs text-white/50">Voice Cloning Studio</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDownloadsOpen(true)}
              className="glass-card-hover rounded-lg px-4 py-2 text-sm font-semibold"
            >
              📁 Downloads
            </button>
            <button
              onClick={() => setCloneOpen(true)}
              className="glass-button rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <span className="neon-text">⬢</span> Clone Voice
            </button>
            <button
              onClick={() => setForgeOpen(true)}
              className="glass-card-hover rounded-lg px-4 py-2 text-sm font-semibold"
            >
              + New Persona
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Two-Column Layout */}
      <div className="mx-auto flex max-w-[1800px] gap-6 p-6">
        {/* Left Column: Persona Selector */}
        <aside className="w-80 shrink-0">
          <div className="frosted-panel sticky top-6 rounded-2xl p-4">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/80">Personas</h2>
              <p className="text-xs text-white/50">{personas.length} voice{personas.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Persona Tiles */}
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {personas.map((persona) => {
                const imageSrc = persona.image_url ? `${API_HOST}${persona.image_url}` : undefined;
                return (
                  <button
                    key={persona.id}
                    onClick={() => setActivePersonaId(persona.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      activePersonaId === persona.id
                        ? 'border-cyan-400/50 bg-white/20 shadow-lg ring-1 ring-cyan-400/40'
                        : 'border-white/10 bg-white/5 hover:-translate-y-px hover:border-white/30 hover:bg-white/15 hover:shadow-lg'
                    }`}
                  >
                    {/* Avatar/Icon */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                        imageSrc
                          ? 'border border-white/10 bg-black/40'
                          : persona.is_cloned
                            ? 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20'
                            : 'bg-white/10'
                      }`}
                    >
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={`${persona.name} avatar`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : persona.is_cloned ? (
                        <span className="neon-text text-sm">⬢</span>
                      ) : (
                        <span className="text-sm">🎤</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-white">{persona.name}</h3>
                        {activePersonaId === persona.id && (
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        )}
                      </div>
                      <p className="truncate text-xs text-white/60">{persona.description}</p>

                      {/* Tags */}
                      <div className="mt-1.5 flex gap-1">
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                          {persona.provider}
                        </span>
                        {persona.is_cloned && (
                          <span className="neon-text rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-medium">
                            Cloned
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Empty State */}
              {personas.length === 0 && (
                <div className="glass-dropzone flex flex-col items-center justify-center rounded-xl p-8 text-center">
                  <div className="mb-2 text-3xl opacity-40">⬢</div>
                  <p className="text-sm font-medium text-white/60">No personas yet</p>
                  <p className="mt-1 text-xs text-white/40">Clone a voice to begin</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Column: Detail Panel (Studio) */}
        <main className="min-w-0 flex-1">
          {activePersona ? (
            <div className="frosted-panel rounded-2xl p-6">
              {/* Persona Header */}
              <div className="mb-6 flex items-start justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    {activePersonaImage ? (
                      <img
                        src={activePersonaImage}
                        alt={`${activePersona.name} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : activePersona.is_cloned ? (
                      <span className="neon-text text-3xl">⬢</span>
                    ) : (
                      <span className="text-3xl">🎤</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">{activePersona.name}</h2>
                    <p className="mt-1 text-sm text-white/60">{activePersona.description}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white/70">
                        {activePersona.provider}
                      </span>
                      {activePersona.is_cloned && (
                        <span className="neon-text rounded-lg bg-cyan-400/10 px-2 py-1 text-xs font-medium">
                          Voice Clone
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Studio Panel */}
              <StudioPanel
                personas={personas}
                activePersonaId={activePersonaId}
                onPersonaChange={setActivePersonaId}
                onRewrite={rewriteLyrics}
                onRender={renderPerformance}
                onRenderComplete={handleRenderComplete}
                prefill={prefillJob}
                onPrefillConsumed={handlePrefillConsumed}
                onPreview={previewPerformance}
              />
            </div>
          ) : (
            <div className="frosted-panel flex h-[600px] flex-col items-center justify-center rounded-2xl p-12 text-center">
              <div className="mb-4 text-6xl opacity-30">⬢</div>
              <h3 className="text-xl font-bold text-white">No Persona Selected</h3>
              <p className="mt-2 text-sm text-white/60">
                Select a persona from the left or create a new one
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setCloneOpen(true)}
                  className="glass-button rounded-lg px-5 py-2.5 text-sm font-semibold"
                >
                  <span className="neon-text">⬢</span> Clone Voice
                </button>
                <button
                  onClick={() => setForgeOpen(true)}
                  className="glass-card-hover rounded-lg px-5 py-2.5 text-sm font-semibold"
                >
                  + New Persona
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreatePersonaModal open={forgeOpen} onClose={() => setForgeOpen(false)} onSubmit={handleCreate} />
      <VoiceCloneModal open={cloneOpen} onClose={() => setCloneOpen(false)} onPersonaCreated={refresh} />
      <DownloadLibraryDrawer
        open={downloadsOpen}
        onClose={() => setDownloadsOpen(false)}
        jobs={renderHistory}
        personas={personas}
        onSelectJob={handleLoadJob}
        onReplay={async (jobId) => {
          const result = await replayRender(jobId);
          handleRenderComplete(result.render);
          return result;
        }}
        refreshJobs={refreshDownloads}
      />
    </div>
  );
}
