import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg))",
        card: "rgb(var(--card))",
        muted: "rgb(var(--muted))",
        accent: "rgb(var(--accent))",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(255,255,255,0.04)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
