// evaluation-service/src/routes/draft.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * POST /api/eval/teachers/:id/evaluations/draft
 * Body: { type, period_start, period_end, overall_score?, metadata? }
 */
router.post("/teachers/:id/evaluations/draft", async (req, res) => {
  const teacherId = req.params.id;
  const { type, period_start, period_end, overall_score, metadata } = req.body ?? {};

  // Basic validation
  if (!teacherId || !type || !period_start || !period_end) {
    return res.status(400).json({ error: "bad_request", detail: "teacherId, type, period_start, period_end are required." });
  }
  if (typeof type !== "string" || !type.trim()) {
    return res.status(400).json({ error: "bad_request", detail: "type must be a non-empty string." });
  }
  if (overall_score !== undefined) {
    const n = Number(overall_score);
    if (Number.isNaN(n) || n < 0 || n > 5) {
      return res.status(400).json({ error: "bad_request", detail: "overall_score must be 0..5" });
    }
  }

  try {
    const sql = `
      INSERT INTO public.evaluations (teacher_id, period, type, overall_score, metadata, status)
      VALUES ($1, daterange($2, $3, '[]'), $4, $5, COALESCE($6::jsonb, '{}'::jsonb), 'draft')
      ON CONFLICT (teacher_id, period, type)
      DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        metadata      = EXCLUDED.metadata,
        status        = 'draft',
        updated_at    = now()
      RETURNING id, status, type, period, overall_score, metadata, created_at, updated_at;
    `;
    const params = [
      teacherId,
      period_start,
      period_end,
      type,
      overall_score ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ];
    const { rows } = await pool.query(sql, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("save draft error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
