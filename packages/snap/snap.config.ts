import type { SnapConfig } from "@metamask/snaps-cli";

const config: SnapConfig = {
  input: "src/index.ts",
  output: {
    path: "dist",
    filename: "bundle.js",
  },
};

export default config;
