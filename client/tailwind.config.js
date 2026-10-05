/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // MediCheck locked color package (Direction C)
        ink: {
          DEFAULT: '#1B2A41',
          deep: '#141F33',
          slate: '#3A4A68',
        },
        amber: {
          DEFAULT: '#B07818',
          bright: '#E8A33D',
          wash: '#FBF4E4',
          line: '#EBD9AE',
        },
        paper: '#FAF7F1',
        sand: '#F1ECE0',
        cream: '#F4EEE1',
        line: '#E5DECF',
        muted: '#5C6B84',
        faint: '#8A7B5C',
        urgency: {
          red: '#B91C1C',
          amber: '#B45309',
          green: '#2E7D62',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(27,42,65,.12)',
        page: '0 10px 44px rgba(27,42,65,.16)',
      },
    },
  },
  plugins: [],
};
