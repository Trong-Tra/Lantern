import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: ["@lantern/types", "@lantern/utils", "@lantern/config"],
  // Frozen pre-rebuild FE carries a known tsc baseline (removed risk/score/chat
  // types + old Express endpoints — MEMORY §Current state). `tsc --noEmit`
  // still reports it; builds must not block deploys until the FE rebuild.
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/app", has: [{ type: "query", key: "demo", value: "1" }], destination: "/app/demo" },
        ...(process.env.NODE_ENV === "development"
          ? [{ source: "/app", has: [{ type: "query" as const, key: "demo", value: "0" }], destination: "/app/live" }]
          : []),
      ],
    };
  },
  async redirects() {
    return [
      { source: "/app2", destination: "/app", permanent: true },
      // route renamed to match the Network tab (/explore → /network)
      { source: "/explore", destination: "/network", permanent: true },
      { source: "/explore/:path*", destination: "/network", permanent: true },
    ];
  },
};

export default nextConfig;

