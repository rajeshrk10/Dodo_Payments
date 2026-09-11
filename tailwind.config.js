/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./checkout.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dodo: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          brand: '#10B981',
          accent: '#059669',
          dark: '#0F172A',
          card: '#1E293B',
        }
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        fadeIn: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        pulseGlow: 'pulseGlow 2s infinite',
      }
    },
  },
  plugins: [],
}
