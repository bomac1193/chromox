import { StyleControls } from '../types';
import { StyleSlider } from './StyleSlider';

type Props = {
  controls: StyleControls;
  onChange: (controls: StyleControls) => void;
};

const sliderSpec: Array<{ key: keyof StyleControls; label: string; min?: number; max?: number }> = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'breathiness', label: 'Breath' },
  { key: 'energy', label: 'Energy' },
  { key: 'formant', label: 'Formant', min: -1, max: 1 },
  { key: 'vibratoDepth', label: 'Vib Depth' },
  { key: 'vibratoRate', label: 'Vib Rate' },
  { key: 'roboticism', label: 'Mech' },
  { key: 'glitch', label: 'Glitch' },
  { key: 'stereoWidth', label: 'Stereo' }
];

export function StyleGrid({ controls, onChange }: Props) {
  function update(key: keyof StyleControls, value: number) {
    onChange({ ...controls, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {sliderSpec.map(({ key, label, min, max }) => (
        <StyleSlider
          key={key}
          label={label}
          value={controls[key]}
          min={min}
          max={max}
          onChange={(v) => update(key, v)}
        />
      ))}
    </div>
  );
}
