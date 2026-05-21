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
        'brand-green': "#00FF40",
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
  daisyui: {
    themes: [
      {
        light: {
          "color-scheme": "light",
          primary: "rgb(68, 13, 156)",
          "primary-content": "#ffffff",
          secondary: "rgb(0, 255, 64)",
          "secondary-content": "#07120a",
          accent: "rgb(0, 255, 64)",
          "accent-content": "#07120a",
          neutral: "#111827",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f6f4fb",
          "base-300": "#e5dff2",
          "base-content": "#0f172a",
          info: "#3b82f6",
          success: "#16a34a",
          warning: "#f59e0b",
          error: "#dc2626",
        },
      },
      {
        dark: {
          "color-scheme": "dark",
          primary: "rgb(118, 72, 196)",
          "primary-content": "#ffffff",
          secondary: "rgb(0, 255, 64)",
          "secondary-content": "#07120a",
          accent: "rgb(0, 255, 64)",
          "accent-content": "#07120a",
          neutral: "#f8fafc",
          "neutral-content": "#111827",
          "base-100": "#090b12",
          "base-200": "#111320",
          "base-300": "#242032",
          "base-content": "#f8fafc",
          info: "#60a5fa",
          success: "#22c55e",
          warning: "#fbbf24",
          error: "#f87171",
        },
      },
    ],
  },
} satisfies Config;
