import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: ["@lantern/types", "@lantern/utils", "@lantern/config"],
  async redirects() {
    return [
      // route renamed to match the Network tab (/explore → /network)
      { source: "/explore", destination: "/network", permanent: true },
      { source: "/explore/:path*", destination: "/network", permanent: true },
    ];
  },
};

export default nextConfig;
