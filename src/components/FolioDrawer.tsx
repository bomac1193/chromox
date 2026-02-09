import { Dialog } from '@headlessui/react';
import { useRef, useState, useMemo, DragEvent } from 'react';
import { API_HOST } from '../lib/api';
import { FolioClip } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { BookmarkIcon, TrashIcon, UploadIcon, SearchIcon, FilterIcon, SortIcon } from './Icons';

type SortOption = 'recent' | 'oldest' | 'az' | 'za';
type SourceFilter = 'all' | 'render' | 'upload' | 'guide';
type GroupBy = 'none' | 'persona' | 'source' | 'date';

interface ClipGroup {
  label: string;
  clips: FolioClip[];
}

type Props = {
  open: boolean;
  onClose: () => void;
  clips: FolioClip[];
  selectedClipId?: string;
  onSelectClip: (clipId: string) => void;
  onRemoveClip: (clipId: string) => Promise<void>;
  onUploadClip: (file: File, name: string) => Promise<void>;
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

  // Search, sort, filter, group state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('persona');

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter and sort clips
  const filteredClips = useMemo(() => {
    let result = [...clips];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        clip =>
          clip.name.toLowerCase().includes(query) ||
          clip.sourcePersonaName?.toLowerCase().includes(query) ||
          clip.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply source filter
    if (sourceFilter === 'guide') {
      result = result.filter(clip => clip.id.startsWith('guide_'));
    } else if (sourceFilter !== 'all') {
      result = result.filter(clip => !clip.id.startsWith('guide_') && clip.source === sourceFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'oldest':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'az':
          return a.name.localeCompare(b.name);
        case 'za':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [clips, searchQuery, sortBy, sourceFilter]);

  // Group clips
  const groupedClips = useMemo((): ClipGroup[] => {
    if (groupBy === 'none') {
      return [{ label: '', clips: filteredClips }];
    }

    const groups = new Map<string, FolioClip[]>();

    for (const clip of filteredClips) {
      let key: string;

      switch (groupBy) {
        case 'persona':
          key = clip.sourcePersonaName || 'Uploaded';
          break;
        case 'source':
          if (clip.id.startsWith('guide_')) {
            key = '🎤 Guide Samples';
          } else if (clip.source === 'render') {
            key = '🎬 Renders';
          } else {
            key = '📤 Uploads';
          }
          break;
        case 'date':
          const date = new Date(clip.added_at);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) key = 'Today';
          else if (diffDays === 1) key = 'Yesterday';
          else if (diffDays < 7) key = 'This Week';
          else if (diffDays < 30) key = 'This Month';
          else key = 'Older';
          break;
        default:
          key = 'All';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(clip);
    }

    // Convert to array and sort groups
    const result: ClipGroup[] = [];

    if (groupBy === 'date') {
      // Order: Today, Yesterday, This Week, This Month, Older
      const dateOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
      for (const label of dateOrder) {
        if (groups.has(label)) {
          result.push({ label, clips: groups.get(label)! });
        }
      }
    } else if (groupBy === 'source') {
      // Order: Guide Samples, Renders, Uploads
      const sourceOrder = ['🎤 Guide Samples', '🎬 Renders', '📤 Uploads'];
      for (const label of sourceOrder) {
        if (groups.has(label)) {
          result.push({ label, clips: groups.get(label)! });
        }
      }
    } else {
      // Alphabetical for persona
      const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        if (a === 'Uploaded') return 1;
        if (b === 'Uploaded') return -1;
        return a.localeCompare(b);
      });
      for (const key of sortedKeys) {
        result.push({ label: key, clips: groups.get(key)! });
      }
    }

    return result;
  }, [filteredClips, groupBy]);

  // Count by source
  const guideCount = clips.filter(c => c.id.startsWith('guide_')).length;
  const renderCount = clips.filter(c => !c.id.startsWith('guide_') && c.source === 'render').length;
  const uploadCount = clips.filter(c => !c.id.startsWith('guide_') && c.source === 'upload').length;

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

  // Drag and drop handlers
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        setPendingFile(file);
        setUploadName(file.name.replace(/\.[^.]+$/, ''));
      }
    }
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
                  {clips.length} clip{clips.length !== 1 ? 's' : ''} • {guideCount} guides • {renderCount} renders • {uploadCount} uploads
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-sm text-muted transition hover:text-primary">
              Close
            </button>
          </div>
        </div>

        {/* Upload section with drag-drop */}
        <div
          className={`border-b border-border-default px-6 py-4 transition ${
            isDragOver ? 'bg-accent/10' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            Upload to Folio {isDragOver && <span className="text-accent">— Drop file here</span>}
          </p>

          {/* Drag-drop zone when no file pending */}
          {!pendingFile && (
            <div
              className={`mb-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-6 transition ${
                isDragOver
                  ? 'border-accent bg-accent/5'
                  : 'border-border-default hover:border-border-emphasis hover:bg-surface'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-center">
                <UploadIcon size={24} className="mx-auto mb-2 text-muted" />
                <p className="text-sm text-secondary">
                  Drop audio file here or <span className="text-accent">browse</span>
                </p>
                <p className="mt-1 text-[10px] text-muted">MP3, WAV, M4A, OGG supported</p>
              </div>
            </div>
          )}

          {/* File selected state */}
          {pendingFile && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
                <span className="text-sm text-accent">📎</span>
                <span className="flex-1 truncate text-sm text-primary">{pendingFile.name}</span>
                <button
                  onClick={() => {
                    setPendingFile(null);
                    setUploadName('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="text-xs text-muted hover:text-error"
                >
                  ✕
                </button>
              </div>
              <input
                className="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-primary placeholder-disabled focus:border-accent focus:outline-none sm:w-48"
                placeholder="Clip name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium uppercase tracking-wide text-canvas transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UploadIcon size={12} />
                {uploading ? 'Uploading...' : 'Add to Folio'}
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPendingFile(file);
                if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
              }
            }}
          />
        </div>

        {/* Search and filters */}
        <div className="border-b border-border-default px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-surface py-2 pl-9 pr-3 text-sm text-primary placeholder-disabled focus:border-accent focus:outline-none"
              />
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-1">
              <FilterIcon size={12} className="text-muted" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                className="rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
              >
                <option value="all">All Sources</option>
                <option value="guide">Guide Samples ({guideCount})</option>
                <option value="render">Renders ({renderCount})</option>
                <option value="upload">Uploads ({uploadCount})</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <SortIcon size={12} className="text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
              >
                <option value="recent">Recent First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </div>

            {/* Group By */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">Group:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
              >
                <option value="persona">By Persona</option>
                <option value="source">By Source</option>
                <option value="date">By Date</option>
                <option value="none">No Grouping</option>
              </select>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchQuery || sourceFilter !== 'all') && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
              <span>Showing {filteredClips.length} of {clips.length} clips</span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('all');
                }}
                className="text-accent hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Clip list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {groupedClips.map((group, groupIndex) => (
              <div key={group.label || groupIndex}>
                {/* Group header */}
                {group.label && (
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                      {group.label}
                    </h3>
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted">
                      {group.clips.length}
                    </span>
                    <div className="h-px flex-1 bg-border-default" />
                  </div>
                )}

                {/* Clips in group */}
                <div className="space-y-3">
                  {group.clips.map((clip) => {
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
                              <span className={
                                clip.id.startsWith('guide_')
                                  ? 'text-purple-400'
                                  : clip.source === 'render'
                                    ? 'text-blue-400'
                                    : 'text-green-400'
                              }>
                                {clip.id.startsWith('guide_')
                                  ? '🎤 Guide'
                                  : clip.source === 'render'
                                    ? '🎬 Render'
                                    : '📤 Upload'}
                              </span>
                              {clip.duration && (
                                <span>• {formatDuration(clip.duration)}</span>
                              )}
                              <span>• {new Date(clip.added_at).toLocaleDateString()}</span>
                            </div>
                            {clip.tags && clip.tags.length > 0 && !clip.tags.every(t => t === 'guide-sample') && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {clip.tags.filter(t => t !== 'guide-sample').map((tag) => (
                                  <button
                                    key={tag}
                                    onClick={() => setSearchQuery(tag)}
                                    className="rounded-full border border-border-subtle bg-elevated px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent"
                                  >
                                    {tag}
                                  </button>
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
                          {/* Only show remove for folio clips, not guide samples */}
                          {!clip.id.startsWith('guide_') && (
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredClips.length === 0 && clips.length > 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-surface p-12 text-center">
                <SearchIcon className="mb-3 text-muted" size={32} />
                <p className="text-sm font-medium text-secondary">No matching clips</p>
                <p className="mt-1 text-xs text-muted">
                  Try adjusting your search or filters
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSourceFilter('all');
                  }}
                  className="mt-3 text-xs text-accent hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {clips.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-surface p-12 text-center">
                <BookmarkIcon className="mb-3 text-muted" size={32} />
                <p className="text-sm font-medium text-secondary">Your folio is empty</p>
                <p className="mt-1 text-xs text-muted">
                  Drag & drop audio files above, or save renders from the Download Library
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
