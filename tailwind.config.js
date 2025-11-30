import { join } from 'path';

export default {
  content: [join(__dirname, 'index.html'), join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#060606'
        },
        neon: '#4de5ff',
        magma: '#ff3f81'
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'system-ui']
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.04) inset'
      }
    }
  },
  plugins: []
};
