// This route returns a real teacher list from Postgres.

import express from "express";
import { pool } from "../db.js"; 
// ^ Ensure src/db.js exports a pg Pool (same one used by /health).

const router = express.Router();

/**
 * GET /teachers
 * Returns a list of teachers from Postgres.
 */
router.get("/teachers", async (req, res) => {
  try {
    const sql = `
      SELECT id, first_name, last_name, email
      FROM teachers
      ORDER BY id ASC
      LIMIT 100
    `;
    const { rows } = await pool.query(sql);

    // Normalize for frontend
    const data = rows.map(r => ({
      id: r.id,
      name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
      email: r.email,
    }));

    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error("[/teachers] DB query failed:", err);
    res.status(500).json({ ok: false, error: "DB query failed" });
  }
});

export default router;
