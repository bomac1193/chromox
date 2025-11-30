import * as Slider from '@radix-ui/react-slider';

type StyleSliderProps = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

export function StyleSlider({ label, min = 0, max = 1, step = 0.01, value, onChange }: StyleSliderProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.6em] text-white/50">
        <span>{label}</span>
        <span className="font-mono text-neon">{value.toFixed(2)}</span>
      </div>
      <Slider.Root
        className="relative flex h-6 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      >
        <Slider.Track className="relative h-[2px] flex-1 rounded-full bg-white/10">
          <Slider.Range className="absolute h-full bg-neon" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full border border-black bg-neon shadow-[0_0_12px_rgba(77,229,255,0.8)]" />
      </Slider.Root>
    </div>
  );
}
