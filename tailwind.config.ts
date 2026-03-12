import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f0f0c",
        sand: "#f5ebd6",
        muted: "#d1bea0",
        accent: "#ff8d4d",
        lime: "#b6f06f",
        line: "rgba(255,240,214,0.12)"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(0,0,0,0.35)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
