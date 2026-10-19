/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // paleta oficial Mylink: preto, laranja e branco
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        ink: {
          900: '#0B0B0F',
          700: '#26262E',
          500: '#6B7280',
          300: '#B4B4BE',
        },
        canvas: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.08)',
        pop: '0 12px 32px rgb(0 0 0 / 0.14)',
      },
    },
  },
  plugins: [],
};
