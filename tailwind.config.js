import { join } from 'path';

export default {
  content: [join(__dirname, 'index.html'), join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        canvas: '#09090B',
        surface: '#111114',
        elevated: '#1A1A1F',
        overlay: '#252529',
        'border-default': '#27272A',
        'border-subtle': '#1E1E22',
        'border-emphasis': '#3F3F46',
        primary: '#F4F4F5',
        secondary: '#A1A1AA',
        muted: '#71717A',
        disabled: '#3F3F46',
        accent: '#93C5FD',
        'accent-hover': '#7BB5F5',
        success: '#4ADE80',
        error: '#F87171',
        info: '#93C5FD'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
