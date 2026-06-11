import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // IN group - Violet
        'in-primary': '#7c3aed',
        'in-dark': '#1e1033',
        // IS group - Cyan
        'is-primary': '#0891b2',
        'is-dark': '#0c1a1f',
        // EN group - Amber
        'en-primary': '#d97706',
        'en-dark': '#1c1200',
        // ES group - Red
        'es-primary': '#dc2626',
        'es-dark': '#1c0505',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px rgba(124, 58, 237, 0.5)' },
          to: { boxShadow: '0 0 20px rgba(124, 58, 237, 0.9), 0 0 40px rgba(124, 58, 237, 0.3)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
