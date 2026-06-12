/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#05050A', // main dark background
        accentBg: '#080816',
        cardBg: 'rgba(255, 255, 255, 0.04)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        glowBorder: 'rgba(139, 92, 246, 0.35)',
        primary: {
          DEFAULT: '#6D5DFB', // Primary purple
          hover: '#5B4CE2',
        },
        violet: {
          DEFAULT: '#8B5CF6', // Electric violet
          hover: '#7C3AED',
        },
        blueGlow: '#3B82F6', // Blue glow
        cyanAccent: '#38BDF8', // Soft cyan accent
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