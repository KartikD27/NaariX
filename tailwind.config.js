/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        coral: {
          50: '#fff1f0',
          100: '#ffe0dd',
          200: '#fec7c1',
          300: '#fda89f',
          400: '#fb7d6f',
          500: '#f95a47',
          600: '#e63d2a',
          700: '#c52e1e',
          800: '#a3271b',
          900: '#87251c',
          950: '#4a0e08',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'flash': 'flash 0.4s ease-in-out infinite alternate',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.25s ease-out',
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.0)' },
          '100%': { backgroundColor: 'rgba(239, 68, 68, 0.35)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

