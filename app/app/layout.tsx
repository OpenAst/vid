import { Metadata } from "next";
import "./globals.css";
import Fonts from "./fonts"; // Optional: Manage fonts in a separate client component
import ClientProvider from "./clientlayout"; // Client-side logic
import Sidebar from './components/Sidebar';

export const metadata: Metadata = {
  title: "VidChat",
  description: "video microblogging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <Fonts /> 
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
