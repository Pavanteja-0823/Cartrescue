/** @type {import('tailwindcss').Config} */
// PREMIUM "Aurora" theme with DARK + LIGHT variants.
// Every color is a CSS variable (rgb-triple, space separated) declared in
// index.css — `:root` holds the dark "Aurora Night" values and
// `[data-theme='light']` holds "Aurora Light". The dashboard toggles the
// data-theme attribute on <html>; ALL existing color utilities (bg-surface,
// text-ink, border-line, from-accent…) adapt automatically, including
// slash-opacity modifiers via the / <alpha-value> template.
// All animations live ONLY here (no @keyframes in index.css) to avoid collisions.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',          // page canvas
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // card
        'surface-2': 'rgb(var(--c-surface2) / <alpha-value>)', // raised panel
        'surface-3': 'rgb(var(--c-surface3) / <alpha-value>)', // hover / chips
        line: 'rgb(var(--c-line) / <alpha-value>)',       // borders
        ink: 'rgb(var(--c-ink) / <alpha-value>)',         // primary text
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)', // secondary text
        muted: 'rgb(var(--c-muted) / <alpha-value>)',     // tertiary text
        accent: 'rgb(var(--c-accent) / <alpha-value>)',   // signature cyan
        'accent-dark': 'rgb(var(--c-accent-dark) / <alpha-value>)',
        'accent-2': 'rgb(var(--c-accent2) / <alpha-value>)', // sky
        'accent-3': 'rgb(var(--c-accent3) / <alpha-value>)', // blue
        good: 'rgb(var(--c-good) / <alpha-value>)',       // emerald
        warn: 'rgb(var(--c-warn) / <alpha-value>)',       // amber
        bad: 'rgb(var(--c-bad) / <alpha-value>)',         // rose
        purple: 'rgb(var(--c-purple) / <alpha-value>)',   // violet (secondary accent)
        orange: 'rgb(var(--c-orange) / <alpha-value>)',
        sky: 'rgb(var(--c-sky) / <alpha-value>)',
        pink: 'rgb(var(--c-pink) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',       // premium highlight
        teal: 'rgb(var(--c-teal) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(6,11,24,0.28), 0 16px 44px rgba(6,11,24,0.28)',
        float: '0 10px 36px rgba(14,116,144,0.35)',
        glow: '0 0 0 1px rgba(14,116,144,0.20), 0 8px 30px rgba(14,116,144,0.20)',
      },
      keyframes: {
        reveal: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'float-pulse': { '0%,100%': { transform: 'scale(1)', boxShadow: '0 10px 36px rgba(14,116,144,0.35)' }, '50%': { transform: 'scale(1.06)', boxShadow: '0 10px 48px rgba(14,116,144,0.5)' } },
        'bounce-in': { '0%': { opacity: '0', transform: 'translateY(20px) scale(0.96)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'dot-blink': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'aurora-drift': { '0%,100%': { transform: 'translate(0,0) scale(1)', opacity: '0.55' }, '50%': { transform: 'translate(4%, -3%) scale(1.15)', opacity: '0.8' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'float-y': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'ring-pulse': { '0%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.5)' }, '70%': { boxShadow: '0 0 0 12px rgba(34,211,238,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0)' } },
        'float-up': { '0%': { transform: 'translateY(20px)', opacity: '0' }, '15%': { opacity: '0.5' }, '85%': { opacity: '0.5' }, '100%': { transform: 'translateY(-120px)', opacity: '0' } },
        'mesh-shift': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(3%, 4%) scale(1.08)' }, '66%': { transform: 'translate(-3%, -2%) scale(1.04)' } },
      },
      animation: {
        reveal: 'reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.35s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'float-pulse': 'float-pulse 3s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'aurora-drift': 'aurora-drift 14s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'float-y': 'float-y 5s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 2.4s ease-out infinite',
        'float-up': 'float-up 9s ease-in-out infinite',
        'mesh-shift': 'mesh-shift 18s ease-in-out infinite',
        'dot-blink': 'dot-blink 1.4s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
      },
    },
  },
  plugins: [],
}
