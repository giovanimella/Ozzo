/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#0f172a',
          light: '#1e293b',
          dark: '#020617',
        },
        secondary: {
          main: '#3b82f6',
          light: '#60a5fa',
        },
        accent: {
          main: '#f59e0b',
          light: '#fbbf24',
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
