import type { Config } from "tailwindcss";
import daisyui from 'daisyui';

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'ig-purple': "var(--purple)",
        'ig-orange': "var(--orange)",
        primary: {
          blue: "#0078FF",
        },
        accent: {
          green: "#00FF40",
        }
      },
    },
  },
  plugins: [daisyui],
} satisfies Config;
