/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff4f2',
          100: '#ffe6e0',
          200: '#ffd0c4',
          300: '#ffaf9d',
          400: '#ff8166',
          500: '#f25c38', // Main brand color
          600: '#d9411c',
          700: '#b73012',
          800: '#982a13',
          900: '#7e2816',
        },
        background: '#f4f6f8', // Very light grey app background
        surface: '#ffffff', // Card background
        border: '#eaeaea',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill': '9999px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'card': '0 4px 24px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
