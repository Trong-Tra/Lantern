import cors from "cors";
import "dotenv/config";
import express from "express";
import { DEFAULT_API_PORT, API_ENDPOINTS } from "@lantern/config";
import { createApiResponse } from "@lantern/utils";

const app = express();

const PORT = Number(process.env.PORT) || DEFAULT_API_PORT;

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

app.use(express.json());

app.get(API_ENDPOINTS.HEALTH, (_req, res) => {
  res.json(createApiResponse({ status: "ok" }, "API is running"));
});

app.get(API_ENDPOINTS.HELLO, (_req, res) => {
  res.json(createApiResponse({ greeting: "Hello from Node.js API" }));
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
