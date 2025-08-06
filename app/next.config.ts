import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.flaticon.com",
        pathname: "/free-icons/**"
      }
    ]
  },


};

export default nextConfig;
