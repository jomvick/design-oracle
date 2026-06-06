import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const API_URL = process.env.API_URL || "http://api:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/clones/:path*",
        destination: `${API_URL}/clones/:path*`,
      },
    ];
  },
};

export default nextConfig;
