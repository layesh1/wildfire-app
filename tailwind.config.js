/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
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
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':    'fadeUp 0.5s ease forwards',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'marquee':    'marquee 30s linear infinite',
        'phone-rise': 'phoneRise 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        phoneRise: {
          '0%':   { transform: 'translateY(120px)' },
          '100%': { transform: 'translateY(0)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px #16a34a30' },
          '100%': { boxShadow: '0 0 20px #16a34a60, 0 0 40px #16a34a20' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        'forest-radial': 'radial-gradient(ellipse at top, #16a34a08 0%, transparent 70%)',
        'hero-gradient':  'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f0fdf4 100%)',
      }
    },
  },
  plugins: [],
}
