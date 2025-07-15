'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { Inter, Lusitana } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'], weight: ['500', '700']});
export const lusitana = Lusitana({ subsets: ['latin'], weight: ['400', '700']});

const geistSans = Geist({
  subsets: ["latin"],
  weight: ['400', '700']
});


export default function Fonts() {
  return (
    <>
      <style>{`
        :root {
          ${geistSans};
          ${inter};
        }
      `}</style>

      <style>
        {
          `
            @font-face {
              font-family:'GT Super Display';
              src: url('/fonts/GT-Super-Display-Regular-Trial.otf') format('otf');
              font-weight: 400;
              font-style: normal;
            }
            
            :root {
              --font-get-super: 'Gt Super Display', Georgia, sans-serif;
              }
          `
        }
      </style>
    </>
  );
}
