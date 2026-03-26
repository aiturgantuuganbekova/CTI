/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: { 50: '#f8fafc', 100: '#1e293b', 200: '#1a1f2e', 300: '#151923', 400: '#0f1219', 500: '#0a0d14' },
        accent: { green: '#22c55e', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', purple: '#a855f7' }
      }
    }
  },
  plugins: [],
}
