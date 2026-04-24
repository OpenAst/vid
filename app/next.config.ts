import type { NextConfig } from "next";

const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
};

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "media.oneclyq.com",
    pathname: "/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    pathname: "/**",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
    pathname: "/**",
  },
];

if (mediaHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: mediaHost,
    pathname: "/**",
  });
} else if (mediaUrl) {
  const parsed = new URL(mediaUrl);
  remotePatterns.push({
    protocol: parsed.protocol.replace(":", "") as "http" | "https",
    hostname: parsed.hostname,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns },
};

export default nextConfig;
