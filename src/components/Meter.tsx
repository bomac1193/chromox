import { useEffect, useState } from 'react';

type MeterProps = {
  active?: boolean;
};

export function Meter({ active }: MeterProps) {
  const [levels, setLevels] = useState(() => Array(20).fill(0));

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setLevels((prev) => prev.map((_, idx) => (Math.sin(Date.now() / 150 + idx) + 1) / 2));
    }, 120);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex h-24 gap-1 rounded-xl border border-white/10 bg-gradient-to-b from-black/40 to-black/70 p-2">
      {levels.map((value, index) => (
        <div key={index} className="flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="w-full rounded-full bg-gradient-to-t from-magma to-neon"
            style={{ height: `${Math.round(value * 100)}%` }}
          ></div>
        </div>
      ))}
    </div>
  );
}
