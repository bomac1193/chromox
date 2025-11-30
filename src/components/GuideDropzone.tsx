import { useState, DragEvent } from 'react';

type Props = {
  onFile: (file: File) => void;
};

export function GuideDropzone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 text-center text-sm text-white/60 transition ${
        dragging ? 'border-neon/70 bg-neon/10 text-neon' : 'bg-white/5'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <p>Drop guide vocal or click to browse</p>
      <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">WAV • AIFF • MP3</p>
    </div>
  );
}
