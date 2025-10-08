import express from "express";
const app = express();
app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));
app.listen(4001, () => console.log("auth-service on :4001"));

