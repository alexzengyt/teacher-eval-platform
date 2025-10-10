import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck endpoint
app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "data-integration" });
});

// NOTE: We will add:
// - /internal/sync/run
// - /internal/sync/status
// in Phase 6.4. For now we just boot the server.

const port = process.env.PORT || 7002;
app.listen(port, () => {
  console.log(`[data-integration] listening on :${port}`);
});
