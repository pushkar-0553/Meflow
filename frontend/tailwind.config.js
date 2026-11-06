/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vcube: {
          orange: '#FF6B00',
          orangeDark: '#FF8C00',
          yellow: '#FFC400',
          black: '#171717',
          dark: '#242424',
          muted: '#737373',
          bg: '#F8F8F7',
          surface: '#FFFFFF',
          border: '#EAEAEA',
          success: '#16A36A',
          warning: '#E9A23B',
          error: '#DC4545',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF6B00',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(255, 107, 0, 0.25)',
        'brand-lg': '0 8px 25px 0 rgba(255, 107, 0, 0.35)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
