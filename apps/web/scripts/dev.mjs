import { realpathSync } from "node:fs";

// pnpm junctions resolve to canonical Windows casing; match it before Next starts.
process.chdir(realpathSync.native(process.cwd()));
await import("next/dist/bin/next");
