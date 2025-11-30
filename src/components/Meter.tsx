import { useEffect, useState } from 'react';

type MeterProps = {
  active?: boolean;
};

export function Meter({ active }: MeterProps) {
  const [progress, setProgress] = useState(0.2);

  useEffect(() => {
    if (!active) {
      setProgress(0.2);
      return;
    }
    const interval = setInterval(() => {
      const t = Date.now() / 600;
      setProgress((Math.sin(t) + 1) / 2);
    }, 80);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/15 bg-slate-950/70">
      <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-r from-purple-500/10 via-cyan-400/10 to-purple-500/10 blur-xl" />
      <div
        className="relative z-10 h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all duration-150"
        style={{ width: `${Math.max(5, Math.round(progress * 100))}%` }}
      />
    </div>
  );
}
