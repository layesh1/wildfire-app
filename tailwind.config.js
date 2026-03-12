/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          50:  '#fff4ed',
          100: '#ffe6d0',
          200: '#ffc89e',
          300: '#ffa060',
          400: '#ff6a20',
          500: '#f04a00',
          600: '#c93500',
          700: '#a02700',
          800: '#7d2100',
          900: '#661e00',
        },
        ash: {
          50:  '#f7f7f6',
          100: '#e8e8e5',
          200: '#d1d0cb',
          300: '#b3b1aa',
          400: '#8e8b82',
          500: '#737068',
          600: '#5e5b53',
          700: '#4c4a43',
          800: '#3f3e38',
          900: '#26251f',
          950: '#141410',
        },
        signal: {
          safe:    '#22c55e',
          warn:    '#f59e0b',
          danger:  '#ef4444',
          info:    '#3b82f6',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':    'fadeUp 0.5s ease forwards',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px #ff6a2040' },
          '100%': { boxShadow: '0 0 20px #ff6a2080, 0 0 40px #ff6a2020' },
        }
      },
      backgroundImage: {
        'ember-radial': 'radial-gradient(ellipse at top, #c9350010 0%, transparent 70%)',
        'ash-gradient':  'linear-gradient(135deg, #141410 0%, #26251f 50%, #1a1917 100%)',
      }
    },
  },
  plugins: [],
}
