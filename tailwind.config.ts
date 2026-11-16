import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        iso: {
          red: "#D9232A",
          yellow: "#F7B500",
          blue: "#005A9C",
          green: "#008556",
          dark: "#0B0E14",
          panel: "#141923",
        },
      },
      backgroundImage: {
        "hazard-stripes":
          "repeating-linear-gradient(45deg, #F7B500, #F7B500 14px, #11141C 14px, #11141C 28px)",
        "hazard-stripes-red":
          "repeating-linear-gradient(45deg, #D9232A, #D9232A 14px, #11141C 14px, #11141C 28px)",
      },
      boxShadow: {
        "card-idle": "0 8px 20px -4px rgba(0, 0, 0, 0.7), 0 2px 6px -1px rgba(0, 0, 0, 0.5)",
        "card-hover": "0 24px 45px -8px rgba(0, 0, 0, 0.85), 0 0 22px 2px rgba(247, 181, 0, 0.35)",
        "table-inset": "inset 0 0 120px 25px rgba(0, 0, 0, 0.85)",
      },
    },
  },
  plugins: [],
};
export default config;
