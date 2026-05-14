import type { Config } from 'tailwindcss';

// Mostrador design tokens — almacén de barrio + cypherpunk
// Paleta: papel manila / tinta / amarillo Lightning
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Papel & tinta
        paper: {
          DEFAULT: '#F5EFE0', // papel manila — fondo principal
          dark: '#E8DEC5',
          warm: '#FBF6E9',
        },
        ink: {
          DEFAULT: '#1A1A17', // negro casi sin azul, color de tinta antigua
          soft: '#3D3D38',
          mute: '#7A7770',
        },
        // Lightning yellow — el acento que pega
        bolt: {
          DEFAULT: '#FFD400',
          dark: '#E6BD00',
          glow: 'rgba(255, 212, 0, 0.18)',
        },
        // Estados
        ok: '#2D6A4F',
        warn: '#D4A017',
        err: '#9B2226',
      },
      fontFamily: {
        // Display: Fraunces — humano, cálido, con personalidad
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        // Body: Inter Tight — pero no Inter genérico, su variante condensada
        sans: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
        // Mono: para sats, hashes, todo lo técnico
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'paper': '4px 4px 0 0 #1A1A17',
        'paper-sm': '2px 2px 0 0 #1A1A17',
        'paper-lg': '8px 8px 0 0 #1A1A17',
        'bolt': '0 0 0 3px rgba(255, 212, 0, 0.3)',
      },
      animation: {
        'pulse-bolt': 'pulse-bolt 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'pulse-bolt': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.03)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.09 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
} satisfies Config;
