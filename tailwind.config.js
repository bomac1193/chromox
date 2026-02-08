import { join } from 'path';

export default {
  content: [join(__dirname, 'index.html'), join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        // Swanblade Light Palette
        canvas: '#FAFAFA',
        surface: '#FFFFFF',
        elevated: '#FFFFFF',
        overlay: '#F5F5F5',
        'border-default': '#E0E0E0',
        'border-subtle': '#EBEBEB',
        'border-emphasis': '#0A0A0A',
        primary: '#0A0A0A',
        secondary: '#6A6A6A',
        muted: '#9A9A9A',
        disabled: '#CCCCCC',
        // Black accent (purple reserved for waveforms)
        accent: '#0A0A0A',
        'accent-hover': '#2A2A2A',
        'accent-subtle': 'rgba(10, 10, 10, 0.08)',
        // Waveform color (tyrian purple)
        waveform: '#66023C',
        'waveform-hover': '#520230',
        // Status colors
        success: '#1A7F37',
        error: '#CF222E',
        warning: '#9A6700',
        info: '#0969DA'
      },
      fontFamily: {
        // Swanblade Typography Stack
        sans: ['Sohne', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        ui: ['Sohne', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      },
      borderRadius: {
        // Swanblade: Sharp edges (no rounded corners)
        'none': '0',
        'sm': '2px',
        'DEFAULT': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'full': '9999px'
      },
      spacing: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '48px',
        '2xl': '64px',
        '3xl': '96px'
      }
    }
  },
  plugins: []
};
