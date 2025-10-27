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

// GET /api/eval/teachers/:id/overview
router.get("/teachers/:id/overview", async (req, res) => {
  try {
    const { id } = req.params;

    const t = await pool.query(
      "SELECT id, first_name, last_name, email FROM teachers WHERE id = $1",
      [id]
    );
    if (t.rowCount === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    const ev = await pool.query(
      `SELECT id, overall_score, period, metadata, created_at, updated_at
         FROM evaluations
        WHERE teacher_id = $1
     ORDER BY updated_at DESC
        LIMIT 1`,
      [id]
    );

    if (ev.rowCount === 0) {
      return res.json({ teacher: t.rows[0], evaluation: null });
    }

    const e = ev.rows[0];
    res.json({
      teacher: t.rows[0],
      evaluation: {
        id: e.id,
        period: e.period,
        overall_score: e.overall_score,
        cards: (e.metadata && e.metadata.cards) || null,
        radar: (e.metadata && e.metadata.radar) || null,
        notes: (e.metadata && e.metadata.notes) || null,
        updated_at: e.updated_at,
      },
    });
  } catch (err) {
    console.error("overview error", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// GET /api/eval/teachers/:id/trend
// Returns historical evaluation trends for a teacher
router.get("/teachers/:id/trend", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify teacher exists
    const t = await pool.query(
      "SELECT id, first_name, last_name FROM teachers WHERE id = $1",
      [id]
    );
    if (t.rowCount === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    // Get all evaluations ordered by period
    const ev = await pool.query(
      `SELECT 
        id, 
        overall_score, 
        period, 
        metadata,
        lower(period) as start_date,
        created_at, 
        updated_at
       FROM evaluations
       WHERE teacher_id = $1
       ORDER BY lower(period) ASC`,
      [id]
    );

    if (ev.rowCount === 0) {
      return res.json({ teacher: t.rows[0], trend: [] });
    }

    // Format trend data
    const trend = ev.rows.map(e => ({
      period: formatPeriod(e.period),
      start_date: e.start_date,
      overall_score: e.overall_score,
      teaching: e.metadata?.radar?.teaching || 0,
      research: e.metadata?.radar?.research || 0,
      service: e.metadata?.radar?.service || 0,
      professional_development: e.metadata?.radar?.professional_development || 0,
    }));

    res.json({
      teacher: t.rows[0],
      trend: trend
    });
  } catch (err) {
    console.error("trend error", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// Helper function to format period range to readable string
function formatPeriod(periodRange) {
  if (!periodRange) return 'Unknown';
  
  // Parse daterange format: [2023-01-01,2023-06-02)
  const match = periodRange.match(/\[(\d{4})-(\d{2})-\d{2},(\d{4})-(\d{2})-\d{2}\)/);
  if (!match) return periodRange;
  
  const [_, startYear, startMonth, endYear, endMonth] = match;
  
  // Determine semester based on start month
  let semester = '';
  const month = parseInt(startMonth);
  if (month >= 1 && month <= 5) {
    semester = 'Spring';
  } else if (month >= 8 && month <= 12) {
    semester = 'Fall';
  } else {
    semester = 'Summer';
  }
  
  return `${semester} ${startYear}`;
}

export default router;
