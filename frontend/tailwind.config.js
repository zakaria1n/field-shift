/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#0E2921',
          dark: '#081A15',
          light: '#163E32',
          surface: '#1A4538',
        },
        leaf: {
          DEFAULT: '#229E65',
          hover: '#1B8554',
          soft: '#E8F7F0',
          dark: '#167345',
        },
        cream: {
          DEFAULT: '#F7F8F3',
          card: '#FFFFFF',
          warm: '#F2F4EB',
        },
        mint: '#BCE6CE',
        sky: {
          DEFAULT: '#3B8EA5',
          soft: '#EAF4F7',
          deep: '#286374',
        },
        amber: {
          DEFAULT: '#D9943B',
          soft: '#FEF6E9',
          dark: '#A66A1D',
        },
        ink: {
          DEFAULT: '#142922',
          muted: '#4A6359',
          light: '#7D968D',
          faint: '#A6BCB4',
        },
        line: {
          DEFAULT: '#DFE8E1',
          subtle: '#EEF4EF',
          strong: '#C2D5C7',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Cairo', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Cairo', 'sans-serif'],
        ar: ['Cairo', '"Noto Sans Arabic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '1.25rem',
        '2card': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(14, 41, 33, 0.05), 0 2px 6px -1px rgba(14, 41, 33, 0.03)',
        'card-hover': '0 16px 36px -4px rgba(14, 41, 33, 0.12), 0 4px 12px -2px rgba(14, 41, 33, 0.05)',
        glow: '0 0 30px rgba(34, 158, 101, 0.25)',
        'glow-sky': '0 0 30px rgba(59, 142, 165, 0.25)',
        'glow-amber': '0 0 30px rgba(217, 148, 59, 0.25)',
        glass: '0 8px 32px 0 rgba(14, 41, 33, 0.08)',
      },
      backgroundImage: {
        'topo-pattern': "radial-gradient(circle at 1px 1px, rgba(22, 62, 50, 0.06) 1px, transparent 0)",
        'hero-gradient': 'linear-gradient(135deg, rgba(8, 26, 21, 0.94) 0%, rgba(14, 41, 33, 0.85) 60%, rgba(22, 62, 50, 0.70) 100%)',
      },
    },
  },
  plugins: [],
}
