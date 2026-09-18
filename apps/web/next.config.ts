import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lantern/types", "@lantern/utils", "@lantern/config"],
};

export default nextConfig;
