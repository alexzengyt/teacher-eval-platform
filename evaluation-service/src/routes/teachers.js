import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * Robust name expression:
 * - If table has a `name` column, use it.
 * - Otherwise, concatenate `first_name` + `last_name` (skip nulls, trim spaces).
 */
const NAME_EXPR = "COALESCE(name, concat_ws(' ', first_name, last_name))";

router.get("/teachers", async (req, res) => {
  // ---- 0) Read & sanitize query params ----
  const q = (req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size || "10", 10)));
  const offset = (page - 1) * pageSize;

  try {
    // ---- 1) Detect available columns from information_schema ----
    const cols = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'teachers'
      `
    );
    const colset = new Set(cols.rows.map(r => r.column_name));

    const hasName       = colset.has("name");
    const hasFirstName  = colset.has("first_name");
    const hasLastName   = colset.has("last_name");
    const hasEmail      = colset.has("email");

    if (!hasEmail) {
      // We rely on email in responses and in search; fail fast if it's absent.
      return res.status(500).json({ ok: false, error: "DB schema missing column: email" });
    }

    // ---- 2) Build a safe display-name expression based on schema ----
    // IMPORTANT: we must never reference a non-existing column.
    let NAME_EXPR = null;
    if (hasName) {
      NAME_EXPR = "name";
    } else if (hasFirstName && hasLastName) {
      NAME_EXPR = "concat_ws(' ', first_name, last_name)";
    } else if (hasFirstName) {
      NAME_EXPR = "first_name";
    } else if (hasLastName) {
      NAME_EXPR = "last_name";
    } else {
      // No name-related columns at all
      NAME_EXPR = "''"; // empty string as a fallback display name
    }

    // ---- 3) WHERE clause + params (avoid injecting non-existing columns) ----
    const hasQ = q !== "";
    const whereSql = hasQ ? `(${NAME_EXPR} ILIKE $1 OR email ILIKE $1)` : "TRUE";
    const likeParam = `%${q}%`;

    // ---- 4) Count total ----
    const countSql = `SELECT COUNT(*)::int AS count FROM teachers WHERE ${whereSql};`;
    const countParams = hasQ ? [likeParam] : [];
    const countResult = await pool.query(countSql, countParams);
    const total = countResult.rows[0]?.count ?? 0;

    // ---- 5) Fetch current page (ORDER BY the same safe expression) ----
    // LIMIT/OFFSET are clamped integers from our code, safe to inline.
    const listSql = `
      SELECT
        id,
        ${NAME_EXPR} AS name,
        email
      FROM teachers
      WHERE ${whereSql}
      ORDER BY ${NAME_EXPR} ASC
      LIMIT ${pageSize} OFFSET ${offset};
    `;
    const listParams = hasQ ? [likeParam] : [];
    const listResult = await pool.query(listSql, listParams);

    // ---- 6) Respond ----
    res.json({
      ok: true,
      query: { q, page, page_size: pageSize },
      total,
      data: listResult.rows,
    });
  } catch (err) {
    console.error("[/teachers] DB query failed:", err?.message, err?.stack);
    res.status(500).json({ ok: false, error: "DB query failed" });
  }
});

export default router;