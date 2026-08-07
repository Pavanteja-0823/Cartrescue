/** @type {import('tailwindcss').Config} */
// PREMIUM "Royal Indigo" theme — MEDIUM-dark indigo-slate canvas with a
// signature indigo → violet → fuchsia gradient accent family.
// Colors are FLAT strings so slash-opacity utilities (bg-accent/10) work.
// All animations live ONLY here (no @keyframes in index.css) to avoid collisions.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#12162A',          // medium-dark indigo-slate canvas (not pitch black)
        surface: '#191E38',     // card
        'surface-2': '#232A4A', // raised panel
        'surface-3': '#2C3460', // hover / chips (NEW)
        line: '#3A4268',        // borders
        ink: '#F4F6FF',         // primary text
        'ink-soft': '#C9D0EA',  // secondary text
        muted: '#939CBE',       // tertiary text
        accent: '#818CF8',      // ROYAL INDIGO — the signature accent
        'accent-dark': '#6D5CE8',
        'accent-2': '#A78BFA',  // violet (NEW)
        'accent-3': '#C084FC',  // fuchsia (NEW)
        good: '#34D399',        // emerald
        warn: '#FBBF24',        // amber
        bad: '#FB7185',         // rose
        purple: '#C084FC',      // fuchsia-violet
        orange: '#FB923C',
        sky: '#60A5FA',
        pink: '#F472B6',
        gold: '#F5C469',        // premium highlight (NEW)
        teal: '#2DD4BF',        // fresh accent (NEW)
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.35), 0 16px 44px rgba(10,13,32,0.55)',
        float: '0 10px 36px rgba(129,140,248,0.5)',
        glow: '0 0 0 1px rgba(129,140,248,0.3), 0 8px 30px rgba(129,140,248,0.25)',
      },
      keyframes: {
        reveal: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'count-up': { '0%': { opacity: '0.4' }, '100%': { opacity: '1' } },
        'float-pulse': { '0%,100%': { transform: 'scale(1)', boxShadow: '0 10px 36px rgba(129,140,248,0.5)' }, '50%': { transform: 'scale(1.06)', boxShadow: '0 10px 46px rgba(129,140,248,0.7)' } },
        'bounce-in': { '0%': { opacity: '0', transform: 'translateY(20px) scale(0.96)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'dot-blink': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      },
      animation: {
        reveal: 'reveal 0.45s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'count-up': 'count-up 0.4s ease-out',
        'float-pulse': 'float-pulse 2.6s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.3s ease-out',
        'dot-blink': 'dot-blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
