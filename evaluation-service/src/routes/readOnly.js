// evaluation-service/src/routes/readOnly.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/eval/teachers-summary
// Returns per-teacher counts by status + total evaluations.
router.get("/teachers-summary", async (req, res) => {
  try {
    const sql = `
      SELECT t.id AS teacher_id,
             t.first_name, t.last_name, t.email,
             COUNT(e.id) FILTER (WHERE e.status='draft')     AS draft_count,
             COUNT(e.id) FILTER (WHERE e.status='submitted') AS submitted_count,
             COUNT(e.id) FILTER (WHERE e.status='published') AS published_count,
             COUNT(e.id)                                     AS total_evals
      FROM public.teachers t
      LEFT JOIN public.evaluations e ON e.teacher_id = t.id
      GROUP BY t.id, t.first_name, t.last_name, t.email
      ORDER BY total_evals DESC, t.last_name, t.first_name
      LIMIT 50;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("teachers-summary error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /api/eval/teachers/:id/evaluations
// Returns evaluations for a specific teacher (read-only detail).
router.get("/teachers/:id/evaluations", async (req, res) => {
  const teacherId = req.params.id;
  try {
    const sql = `
      SELECT e.id, e.status, e.type, e.period, e.overall_score,
             e.submitted_at, e.created_at, e.updated_at
      FROM public.evaluations e
      WHERE e.teacher_id = $1
      ORDER BY lower(e.period) DESC, e.type ASC
      LIMIT 100;
    `;
    const { rows } = await pool.query(sql, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error("teacher evaluations error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
