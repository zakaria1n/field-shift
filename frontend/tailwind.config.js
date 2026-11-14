/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#173E32',
        leaf: '#299A61',
        cream: '#F6F7F1',
        sky: '#4D87A8',
        amber: '#D59A39',
        ink: '#17352D',
        line: '#DCE6DC',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'Tahoma', '"Noto Sans Arabic"', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
}
