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
    <>
      <style>{`
        :root {
          ${geistSans.variable};
          ${geistMono.variable};
        }
      `}</style>

      <style>
        {
          `
            @font-face {
              font-family: 'GT Super Display';
              src: url('/fonts/GT-Super-Display-Regular-Trial.otf') format('otf');
              font-weight: 400;
              font-style: normal;
            }
            
            :root {
              --font-get-super: 'Gt Super Display', sans-serif;
              }
          `
        }
      </style>
    </>
  );
}
