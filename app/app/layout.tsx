import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts";
import ClientProvider from "./clientlayout";
import Providers from './store/providers';
import { Toaster } from 'react-hot-toast';
import { inter } from "./fonts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const metadataBaseUrl = new URL(siteUrl);

export const metadata: Metadata = {
  title: "OneClyq - Video Microblogging",
  description: "OneClyq is a short video microblogging platform. Share moments, discover creators, and connect with the world.",
  keywords: ["oneclyq", "video", "microblogging", "short videos", "social media"],
  metadataBase: metadataBaseUrl,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "OneClyq - Video Microblogging",
    description: "Share short videos and discover creators on OneClyq.",
    url: siteUrl,
    siteName: "OneClyq",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneClyq - Video Microblogging",
    description: "Share short videos and discover creators on OneClyq.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className}`}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className="overflow-x-hidden">
        <Providers>
          <Fonts />
          <ClientProvider>
            {children}
            <Toaster position="top-center" reverseOrder={false} />
          </ClientProvider>
        </Providers>
      </body>
    </html>
  );
}
