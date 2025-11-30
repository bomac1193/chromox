import { useEffect, useRef } from 'react';

type Props = {
  src?: string;
};

export function AudioPlayer({ src }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (ref.current && src) {
      ref.current.load();
    }
  }, [src]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
        <span>Output</span>
        <span className="text-neon">Persona Synth</span>
      </div>
      <audio controls ref={ref} className="mt-3 w-full">
        {src && <source src={src} type="audio/wav" />}
      </audio>
    </div>
  );
}
