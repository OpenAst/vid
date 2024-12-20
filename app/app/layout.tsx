import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts"; // Optional: Manage fonts in a separate client component
import ClientProvider from "./clientlayout"; // Client-side logic

export const metadata: Metadata = {
  title: "VidChat",
  description: "video microblogging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Fonts /> {/* Handles font variables in a client component */}
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
