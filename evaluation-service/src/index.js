// src/index.js

import express from "express";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { requireAuth } from "./middleware/auth.js";
import teachersRouter from "./routes/teachers.js";
import readOnlyRoutes from "./routes/readOnly.js";
import draftRoutes from "./routes/draft.js";
import submitRoutes from "./routes/submit.js";
import publishRoutes from "./routes/publish.js";
import reportsRouter from "./routes/reports.js";
import analyticsRouter from "./routes/analytics.js";
import serviceRouter from "./routes/service.js";
import educationRouter from "./routes/education.js";
import careerRouter from "./routes/career.js";
import grantsRouter from "./routes/grants.js";
import documentsRouter from "./routes/documents.js";
import recommendationsRouter from "./routes/recommendations.js";
import predictionsRouter from "./routes/predictions.js";

// Load .env variables
dotenv.config();

const app = express();
const port = 3002;


// DO NOT use global json parser for multipart/form-data compatibility
// Instead, add json parser only where needed (via optional middleware)
const jsonMiddleware = express.json({ limit: '50mb' });

app.use(
  "/demo",
  express.static("frontend", {
    setHeaders: (res) => {
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self'",
          "img-src 'self' data:",
        ].join("; ")
      );
    },
  })
);

// Register documents FIRST (before JSON parser) to handle multipart properly
console.log("📝 Registering documents routes...");
app.use("/api/eval/documents", documentsRouter);

app.use("/api/eval", readOnlyRoutes);
app.use("/api/eval", requireAuth, jsonMiddleware, teachersRouter);
app.use("/api/eval/secure", requireAuth, jsonMiddleware, draftRoutes);  
app.use("/api/eval/secure", requireAuth, jsonMiddleware, submitRoutes); 
app.use("/api/eval/secure", requireAuth, jsonMiddleware, publishRoutes);
app.use("/api/eval/secure", requireAuth, jsonMiddleware, reportsRouter);
app.use("/api/eval/analytics", requireAuth, jsonMiddleware, analyticsRouter);
// New routes for Multi-Tab Evaluation Interface
console.log("📝 Registering service routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, serviceRouter);
console.log("📝 Registering education routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, educationRouter);
console.log("📝 Registering career routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, careerRouter);
console.log("📝 Registering grants routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, grantsRouter);
console.log("📝 Registering recommendations routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, recommendationsRouter);
console.log("📝 Registering predictions routes...");
app.use("/api/eval", requireAuth, jsonMiddleware, predictionsRouter);

// Route to check DB connection
app.get("/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM teachers;");
    res.json({ ok: true, teacher_count: result.rows[0].count });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`🔍 Unmatched request: ${req.method} ${req.path}`);
  next();
});

// Start Express server
app.listen(port, () => {
  console.log(`✅ Evaluation service running on port ${port}`);
});