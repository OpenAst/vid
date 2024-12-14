'use client';

import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Fonts() {
  return (
    <style>{`
      :root {
        ${geistSans.variable};
        ${geistMono.variable};
      }
    `}</style>
  );
}