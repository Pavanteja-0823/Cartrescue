/** @type {import('tailwindcss').Config} */
// Colors are FLAT strings so slash-opacity utilities (bg-accent/10) work.
// Animations live ONLY here to avoid @keyframes collisions.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0E1A',
        panel: '#121A2E',
        soft: '#1A2540',
        line: '#243154',
        accent: '#5B8DEF',
        'accent-dark': '#3A6FD8',
        good: '#3DDC97',
        warn: '#F5B841',
        bad: '#F5675C',
        purple: '#A78BFA',
        muted: '#7E8AA8',
        text: '#EAEEF7',
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%,100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(61,220,151,.5)' },
          '50%': { opacity: '.6', boxShadow: '0 0 0 5px rgba(61,220,151,0)' },
        },
        'count-up': { '0%': { opacity: '0.4' }, '100%': { opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        reveal: 'reveal 0.5s ease-out forwards',
        glow: 'glow 1.8s ease-in-out infinite',
        'count-up': 'count-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
