import { useState, DragEvent } from 'react';

type Props = {
  onFile: (file: File) => void;
};

export function GuideDropzone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      onFile(droppedFile);
    }
  }

  return (
    <div
      className={`glass-dropzone ${dragging ? 'glass-dropzone-active' : ''} ${
        file ? '!border-cyan-400/50' : ''
      } flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl text-center transition-all`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
          const selectedFile = (e.target as HTMLInputElement).files?.[0];
          if (selectedFile) {
            setFile(selectedFile);
            onFile(selectedFile);
          }
        };
        input.click();
      }}
    >
      {file ? (
        <div>
          <p className="neon-text text-sm font-semibold">{file.name}</p>
          <p className="mt-1 text-xs text-white/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-white/60">Drop guide vocal or click</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-white/40">WAV · MP3 · AIFF</p>
        </div>
      )}
    </div>
  );
}
