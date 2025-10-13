// evaluation-service/src/routes/publish.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * POST /api/eval/secure/evaluations/:id/publish
 * Effect: if status is 'submitted' -> set to 'published', set published_at=now()
 */
router.post("/evaluations/:id/publish", async (req, res) => {
  const evalId = req.params.id;
  if (!evalId) return res.status(400).json({ error: "bad_request", detail: "evaluation id is required" });

  try {
    const sql = `
      UPDATE public.evaluations
      SET status='published',
          published_at=now(),
          updated_at=now()
      WHERE id = $1
        AND status = 'submitted'
      RETURNING id, status, type, period, overall_score, metadata,
                submitted_at, published_at, created_at, updated_at;
    `;
    const { rows } = await pool.query(sql, [evalId]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found_or_not_submitted" });
    res.json(rows[0]);
  } catch (err) {
    console.error("publish evaluation error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
