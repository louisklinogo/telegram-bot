import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: "var(--font-inter)",
        "instrument-serif": "var(--font-instrument-serif)",
        sans: "var(--font-inter)",
        serif: "var(--font-instrument-serif)",
      },
    },
  },
  plugins: [],
};

export default config;
