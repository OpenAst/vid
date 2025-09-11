import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.oneclyq.com",
        pathname: "/**",
      }
    ]
  },
  webpackDevMiddleware: (config: any) => {
    config.watchOptions = {
      poll: 1000, 
      aggregateTimeout: 300,
    };
    return config;
  }

};

export default nextConfig;
