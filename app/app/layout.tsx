import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts"; 
import ClientProvider from "./clientlayout"; 
import Providers from './store/providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "OneClyq",
  description: "Video microblogging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>
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
