import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.flaticon.com",
        pathname: "/free-icons/**"
      }
    ]
  }
};

export default nextConfig;
