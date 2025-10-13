// evaluation-service/src/routes/reports.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/eval/reports/daily-activity?days=14
 * Returns counts of submitted and published evaluations per day for the past N days (default: 14).
 */
router.get("/reports/daily-activity", async (req, res) => {
  // Parse days param; default to 14 if not provided or invalid
  const days = Math.max(1, Math.min(parseInt(req.query.days || "14", 10) || 14, 60));

  const sql = `
    WITH days AS (
      SELECT generate_series((now() - ($1::int - 1) * interval '1 day')::date, now()::date, interval '1 day')::date AS d
    )
    SELECT
      d.d AS day,
      COALESCE(sub.cnt, 0) AS submitted_count,
      COALESCE(pub.cnt, 0) AS published_count
    FROM days d
    LEFT JOIN (
      SELECT submitted_at::date AS day, COUNT(*) AS cnt
      FROM public.evaluations
      WHERE submitted_at IS NOT NULL
        AND submitted_at >= now() - ($1::int * interval '1 day')
      GROUP BY submitted_at::date
    ) sub ON sub.day = d.d
    LEFT JOIN (
      SELECT published_at::date AS day, COUNT(*) AS cnt
      FROM public.evaluations
      WHERE published_at IS NOT NULL
        AND published_at >= now() - ($1::int * interval '1 day')
      GROUP BY published_at::date
    ) pub ON pub.day = d.d
    ORDER BY day;
  `;

  try {
    const { rows } = await pool.query(sql, [days]);
    res.json(rows);
  } catch (err) {
    console.error("daily-activity error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/**
 * GET /api/eval/reports/teacher-progress
 * Returns per-teacher counts of draft/submitted/published/total evaluations.
 */
router.get("/reports/teacher-progress", async (_req, res) => {
  const sql = `
    SELECT
      t.id AS teacher_id,
      t.first_name,
      t.last_name,
      t.email,
      COUNT(e.id) FILTER (WHERE e.status='draft')     AS draft_count,
      COUNT(e.id) FILTER (WHERE e.status='submitted') AS submitted_count,
      COUNT(e.id) FILTER (WHERE e.status='published') AS published_count,
      COUNT(e.id)                                     AS total_evals
    FROM public.teachers t
    LEFT JOIN public.evaluations e
      ON e.teacher_id = t.id
    GROUP BY t.id, t.first_name, t.last_name, t.email
    ORDER BY total_evals DESC, t.last_name, t.first_name
    LIMIT 100;
  `;

  try {
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("teacher-progress error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
