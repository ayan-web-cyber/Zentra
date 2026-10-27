/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Aurora Social tokens are CSS custom properties (defined in index.css), not fixed
        // hex values — that's what lets every component that already uses `bg-aurora-bg`,
        // `text-aurora-text-muted`, etc. repaint for dark/light/system without being touched
        // individually. The rgb(var(...) / <alpha-value>) form is what preserves Tailwind's
        // opacity-modifier syntax (e.g. `border-aurora-border/60`) working with a CSS variable.
        'aurora-bg': 'rgb(var(--aurora-bg) / <alpha-value>)',
        'aurora-card': 'rgb(var(--aurora-card) / <alpha-value>)',
        'aurora-border': 'rgb(var(--aurora-border) / <alpha-value>)',
        'aurora-text': 'rgb(var(--aurora-text) / <alpha-value>)',
        'aurora-text-muted': 'rgb(var(--aurora-text-muted) / <alpha-value>)',
        // Brand — same in both themes
        'aurora-violet': '#7C3AED',
        'aurora-cyan': '#06B6D4',
        'aurora-like': '#F43F5E',
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
      },
      borderRadius: {
        'aurora-sm': '14px',
        'aurora-lg': '20px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        aurora: '200ms',
      },
      boxShadow: {
        aurora: '0 8px 30px rgba(0,0,0,0.25)',
      },
      backdropBlur: {
        aurora: '20px',
      },
    },
  },
  plugins: [],
};
