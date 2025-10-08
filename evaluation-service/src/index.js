import express from "express";
const app = express();

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "evaluation" })
);

app.listen(3002, () => console.log("evaluation-service on :3002"));
