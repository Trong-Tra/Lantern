import "dotenv/config";
import { DEFAULT_API_PORT } from "@lantern/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || DEFAULT_API_PORT;

const app = createApp();

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
