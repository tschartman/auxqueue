import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: 'rgba(255,255,255,0.03)',
        'surface-hover': 'rgba(255,255,255,0.06)',
        border: 'rgba(255,255,255,0.06)',
        'border-strong': 'rgba(255,255,255,0.12)',
        accent: '#ffd93d',
        'accent-dim': 'rgba(255,217,61,0.15)',
        success: '#6bff6b',
        'success-dim': 'rgba(107,255,107,0.15)',
        error: '#ff6b6b',
        'error-dim': 'rgba(255,107,107,0.15)',
        primary: '#ff6b6b',
        'primary-end': '#ff8e53',
        muted: 'rgba(255,255,255,0.4)',
        subtle: 'rgba(255,255,255,0.25)',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
        'gradient-primary-hover': 'linear-gradient(135deg, #ff5555, #ff7a3a)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(255, 107, 107, 0.3)',
        'glow-sm': '0 0 10px rgba(255, 107, 107, 0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config;
