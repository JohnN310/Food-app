/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF5", // Soft ivory
        brandPrimary: {
          DEFAULT: "#1B7A49", // Brand Green
          soft: "#E8F5E9",
          hover: "#145D36",
        },
        brandAccent: {
          DEFAULT: "#FFF2E5", // Warm peach
          yellow: "#FFF9C4"
        },
        urgency: {
          DEFAULT: "#E53935", // Red
          soft: "#FFEBEE"
        }
      }
    },
  },
  plugins: [],
}
