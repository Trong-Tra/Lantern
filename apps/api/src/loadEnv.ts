/**
 * Side-effect env loader — MUST be the first import in index.ts.
 *
 * ESM evaluates imports in declaration order, and repositories read
 * process.env at module scope (`export const agentRepository =
 * createActiveRepository()`, docs/03). dotenv.config() calls in index.ts's
 * body run AFTER that evaluation, so a bare environment (no exported vars)
 * silently fell back to the mock source. Loading here guarantees the env
 * exists before any repository module evaluates. Tests import app.js
 * directly (never index.ts), so they stay hermetic.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// pnpm runs package scripts from apps/api, but the owner's single env file
// lives at the repo root — load package-local first (wins), then repo root.
dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
