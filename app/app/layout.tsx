import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts";
import ClientProvider from "./clientlayout";
import Providers from './store/providers';
import { Toaster } from 'react-hot-toast';
import { inter } from "./fonts";


export const metadata: Metadata = {
  title: "OneClyq",
  description: "video microblogging",
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
