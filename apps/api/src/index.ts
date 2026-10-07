import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { DEFAULT_API_PORT } from "@lantern/config";
import { createApp } from "./app.js";

// pnpm runs package scripts from apps/api, but the owner's single env file
// lives at the repo root — load package-local first (wins), then repo root.
dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const PORT = Number(process.env.PORT) || DEFAULT_API_PORT;

const app = createApp();

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
