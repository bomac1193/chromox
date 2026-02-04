import { Dialog } from '@headlessui/react';
import { useRef, useState } from 'react';
import { API_HOST } from '../lib/api';
import { FolioClip } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { BookmarkIcon, TrashIcon, UploadIcon } from './Icons';

type Props = {
  open: boolean;
  onClose: () => void;
  clips: FolioClip[];
  selectedClipId?: string;
  onSelectClip: (clipId: string) => void;
  onRemoveClip: (clipId: string) => Promise<void>;
  onUploadClip: (file: File, name: string) => Promise<void>;
};

export function FolioDrawer({
  open,
  onClose,
  clips,
  selectedClipId,
  onSelectClip,
  onRemoveClip,
  onUploadClip
}: Props) {
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await onUploadClip(pendingFile, uploadName || pendingFile.name);
      setPendingFile(null);
      setUploadName('');
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }

  function handleUseAndClose(clipId: string) {
    onSelectClip(clipId);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border-default bg-canvas shadow-2xl">
        {/* Header */}
        <div className="border-b border-border-default px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <BookmarkIcon className="text-accent" size={18} />
              </div>
              <div>
                <Dialog.Title className="font-display text-xl font-semibold">Folio Collection</Dialog.Title>
                <p className="text-sm text-secondary">
                  {clips.length} clip{clips.length !== 1 ? 's' : ''} saved across all personas
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-sm text-muted transition hover:text-primary">
              Close
            </button>
          </div>
        </div>

        {/* Upload section */}
        <div className="border-b border-border-default px-6 py-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Upload to Folio</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPendingFile(file);
                    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
                  }
                }}
                className="w-full text-sm text-secondary file:mr-3 file:rounded-lg file:border file:border-border-default file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:uppercase file:tracking-wide file:text-secondary file:transition hover:file:bg-overlay"
              />
            </div>
            <input
              className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary placeholder-disabled focus:border-accent focus:outline-none sm:w-48"
              placeholder="Clip name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
            <button
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium uppercase tracking-wide text-canvas transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UploadIcon size={12} />
              {uploading ? 'Uploading...' : 'Add to Folio'}
            </button>
          </div>
        </div>

        {/* Clip list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {clips.map((clip) => {
              const isSelected = selectedClipId === clip.id;
              return (
                <div
                  key={clip.id}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border-default bg-surface hover:border-border-emphasis'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BookmarkIcon size={14} className={isSelected ? 'text-accent' : 'text-muted'} />
                        <p className="truncate text-sm font-medium text-primary">{clip.name}</p>
                        {isSelected && (
                          <span className="shrink-0 rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                            Active Guide
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted">
                        <span>{clip.source === 'render' ? 'From render' : 'Uploaded'}</span>
                        {clip.sourcePersonaName && <span>Persona: {clip.sourcePersonaName}</span>}
                        <span>{new Date(clip.added_at).toLocaleDateString()}</span>
                      </div>
                      {clip.tags && clip.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {clip.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border-subtle bg-elevated px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <AudioPlayer
                      src={clip.audioUrl.startsWith('http') ? clip.audioUrl : `${API_HOST}${clip.audioUrl}`}
                      label={clip.name}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseAndClose(clip.id)}
                      className={`rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${
                        isSelected
                          ? 'bg-accent text-canvas'
                          : 'border border-accent/40 text-accent hover:border-accent hover:bg-accent/5'
                      }`}
                    >
                      {isSelected ? 'Currently Selected' : 'Use as Guide'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setRemovingId(clip.id);
                        try {
                          await onRemoveClip(clip.id);
                        } finally {
                          setRemovingId(null);
                        }
                      }}
                      disabled={removingId === clip.id}
                      className="flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted transition hover:border-error/40 hover:text-error disabled:opacity-40"
                    >
                      <TrashIcon size={12} />
                      {removingId === clip.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}

            {clips.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-surface p-12 text-center">
                <BookmarkIcon className="mb-3 text-muted" size={32} />
                <p className="text-sm font-medium text-secondary">Your folio is empty</p>
                <p className="mt-1 text-xs text-muted">
                  Upload audio clips above, or save renders from the Download Library
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
