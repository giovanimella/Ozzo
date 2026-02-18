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
          light: '#334155',
          dark: '#020617',
        },
        brand: {
          main: '#2563eb',
          light: '#60a5fa',
          dark: '#1e40af',
          subtle: '#eff6ff',
        },
        sidebar: {
          bg: '#0f172a',
          hover: '#1e293b',
          border: '#1e293b',
        },
        accent: {
          main: '#f59e0b',
          light: '#fbbf24',
        },
        success: {
          main: '#10b981',
          light: '#34d399',
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      width: {
        'sidebar': '18rem',
      },
      spacing: {
        'sidebar': '18rem',
      }
    },
  },
  plugins: [],
}
