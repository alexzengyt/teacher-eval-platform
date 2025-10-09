// src/index.js

import express from "express";
import pg from "pg";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const app = express();
const port = 3002;

// Create a Postgres connection pool
const pool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

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
