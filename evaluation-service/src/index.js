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




// Load .env variables
dotenv.config();

const app = express();
const port = 3002;


app.use(express.json())
app.use("/api/eval", readOnlyRoutes);
app.use("/api/eval", requireAuth, teachersRouter);
app.use("/api/eval/secure", requireAuth, draftRoutes);  
app.use("/api/eval/secure", requireAuth, submitRoutes); 
app.use("/api/eval/secure", requireAuth, publishRoutes);


app.use("/api/eval/secure", requireAuth, reportsRouter);



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

// Start Express server
app.listen(port, () => {
  console.log(`✅ Evaluation service running on port ${port}`);
});