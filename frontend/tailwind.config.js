/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f', // main dark background
        accentBg: '#0f111a',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.05)',
        glowBorder: 'rgba(37, 99, 235, 0.3)',
        primary: {
          DEFAULT: '#6D5DFB', // Primary vibrant purple
          hover: '#5B4CE2',
        },
        violet: {
          DEFAULT: '#8B5CF6', // Purple fuchsia
          hover: '#7C3AED',
        },
        blueGlow: '#6D5DFB', // Purple glow
        cyanAccent: '#a78bfa', // Muted violet accent
        textPrimary: '#F8FAFC',
        textSecondary: '#A1A1AA',
        textMuted: '#71717A',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}