'use client';

import {  Geist_Mono, Inter, Lusitana } from "next/font/google";

export const inter = Inter({
  subsets: ['latin'],
  variable: '---font-inter',
});

export const lusitana = Lusitana({
  weight: ['400', '700'],
  subsets: ['latin'],
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
          ${inter.variable};
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
