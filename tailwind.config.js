/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 214.3 31.8% 91.4%))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))"
      }
    }
  },
  plugins: []
};
