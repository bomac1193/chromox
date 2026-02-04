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
    <div className="relative h-4 w-full overflow-hidden rounded-full border border-border-default bg-canvas">
      <div
        className="relative z-10 h-full rounded-full bg-accent transition-all duration-150"
        style={{ width: `${Math.max(5, Math.round(progress * 100))}%` }}
      />
    </div>
  );
}
