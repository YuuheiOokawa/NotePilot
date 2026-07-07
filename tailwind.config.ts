import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        note: {
          DEFAULT: "#41c9b4",
          dark: "#2ba894",
        },
      },
    },
  },
  plugins: [],
};

export default config;
