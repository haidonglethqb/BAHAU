/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      colors: {
        brand: {
          50: '#f0f6fb',
          100: '#e0edf7',
          200: '#bae6fd',
          500: '#004b87',
          600: '#003865',
          700: '#002747',
        },
        ochre: {
          50: '#fef3c7',
          500: '#d97706',
          700: '#92400e',
        },
        canvas: '#f8fafc',
        surface: '#ffffff',
        line: '#e2e8f0',
        ink: '#0f172a',
        muted: '#475569',
        dau: {
          primary: '#004B87',
          secondary: '#D97706',
          dark: '#0F172A',
          light: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};
