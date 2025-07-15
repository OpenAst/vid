import type { Config } from "tailwindcss";
import daisyui from 'daisyui';
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          blue: "#0078FF",
        },
        accent: {
          green: "#00FF40",
        },
      },
      primary: {
        blue: {
          DEFAULT: '#0078FF',
          dark: "#0066DD",
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
        gtSuper: ['var(--font-gt-super)', 'sans-serif'],
      },
      backgroundColor: {
        base: "hsl(var(--b1))",
        content: "hsl(var(--bc))",
      },
      textColor: {
        base: "hsl(var(--bc))",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        cupcake: {
          ...require("daisyui/src/theming/themes")["cupcake"],
          "primary": "#0078FF",
          "accent": "#00FF40",
          "fontFamily": "'var(--font-geist-sans)', sans-serif",
        },
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          "primary": "#0078FF",
          "accent": "#00FF40",
          "fontFamily": "'var(--font-geist-sans)', sans-serif",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "primary": "#0066DD",
          "accent": "#00CC33",
          "fontFamily": "'var(--font-geist-sans)', sans-serif",
        },
      }
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    },
    
  
} satisfies Config;
