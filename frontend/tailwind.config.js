/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#667eea',
          600: '#5a67d8',
          700: '#4c51bf',
        },
        secondary: {
          50: '#f0fdf4',
          500: '#48bb78',
          600: '#38a169',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}