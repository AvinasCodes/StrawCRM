/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#011662',
          royal: '#011E79',
          electric: '#0B63F6',
          light: '#3B95FF',
          electricLight: '#3B95FF',
          cyan: '#22D3EE',
          dark: '#020B27',
          surface: '#F7F9FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          text: '#0B132B',
        },
        neu: {
          base: '#E8EEF5',
          dark: '#CBD5E1',
          surface: '#E2E8F0',
          border: 'rgba(255, 255, 255, 0.7)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(1, 22, 98, 0.05), 0 1px 2px -1px rgba(1, 22, 98, 0.05)',
        'card': '0 4px 6px -1px rgba(1, 22, 98, 0.05), 0 2px 4px -2px rgba(1, 22, 98, 0.05)',
        'elevated': '0 10px 25px -5px rgba(1, 30, 121, 0.08), 0 8px 10px -6px rgba(1, 30, 121, 0.04)',
        'glow': '0 0 25px -5px rgba(34, 211, 238, 0.35)',
        'blue-glow': '0 0 35px -5px rgba(11, 99, 246, 0.4)',
        /* Neumorphism (Soft UI) Tokens */
        'neu-flat': '5px 5px 12px rgba(166, 180, 200, 0.4), -2px -2px 6px rgba(255, 255, 255, 0.35)',
        'neu-card': '6px 6px 16px rgba(166, 180, 200, 0.4), -2px -2px 8px rgba(255, 255, 255, 0.3)',
        'neu-card-hover': '8px 8px 20px rgba(166, 180, 200, 0.5), -3px -3px 10px rgba(255, 255, 255, 0.4)',
        'neu-inset': 'inset 3px 3px 6px rgba(166, 180, 200, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.5)',
        'neu-inset-deep': 'inset 4px 4px 10px rgba(166, 180, 200, 0.55), inset -3px -3px 8px rgba(255, 255, 255, 0.5)',
        'neu-btn': '3px 3px 8px rgba(166, 180, 200, 0.4), -1.5px -1.5px 5px rgba(255, 255, 255, 0.4)',
        'neu-btn-pressed': 'inset 2px 2px 5px rgba(166, 180, 200, 0.55), inset -2px -2px 5px rgba(255, 255, 255, 0.5)',
        'neu-icon': '2px 2px 6px rgba(166, 180, 200, 0.4), -1.5px -1.5px 4px rgba(255, 255, 255, 0.4)',
        'neu-icon-inset': 'inset 2px 2px 4px rgba(166, 180, 200, 0.45), inset -1px -1px 3px rgba(255, 255, 255, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
