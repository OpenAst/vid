import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts"; 
import ClientProvider from "./clientlayout"; 
import Providers from './store/providers';

export const metadata: Metadata = {
  title: "VidChat",
  description: "video microblogging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Fonts /> 
          <ClientProvider>{children}</ClientProvider>
        </Providers>
      </body>
    </html>
  );
}
