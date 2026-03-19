/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        ink: {
          50: "#f6f7fb",
          100: "#eceef7",
          200: "#d5daeb",
          300: "#b0bad8",
          400: "#7f8eb8",
          500: "#5e6d98",
          600: "#485277",
          700: "#373f5b",
          800: "#22283b",
          900: "#141827"
        },
        mint: {
          300: "#7ef0cb",
          400: "#3be2b3",
          500: "#1ec98f"
        }
      },
      boxShadow: {
        ambient: "0 20px 60px rgba(11, 18, 34, 0.18)"
      }
    }
  },
  plugins: [],
};
