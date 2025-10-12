import express from "express";
import { pool } from "../db.js";
import { randomUUID } from "crypto";


const router = express.Router();

/**
 * Robust name expression:
 * - If table has a `name` column, use it.
 * - Otherwise, concatenate `first_name` + `last_name` (skip nulls, trim spaces).
 */
const NAME_EXPR = "COALESCE(name, concat_ws(' ', first_name, last_name))";

// GET /teachers — list with fromRoster flag and optional filter
router.get("/teachers", async (req, res) => {
  // Read query params safely (page/pageSize/q)
  const { page = 1, pageSize = 10, q } = req.query;

  // Accept both param names for robustness: ?fromRosterOnly=... or ?fromRoster=...
  // Normalize to boolean: true/1/yes/on -> true
  const rawFromRoster =
    req.query.fromRosterOnly ?? req.query.fromRoster ?? "";

  const rosterOnly = ["true", "1", "yes", "on"].includes(
    String(rawFromRoster).trim().toLowerCase()
  );

  // Normalize pagination (defensive defaults)
  const limit = Math.max(parseInt(pageSize, 10) || 10, 1);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (pageNum - 1) * limit;

  // Build WHERE parts incrementally
  const where = [];
  const values = [];
  let vi = 1;

  // Optional text search across name/email (case-insensitive)
  if (q && q.trim()) {
    where.push(
      `(lower(t.first_name) LIKE $${vi} OR lower(t.last_name) LIKE $${vi} OR lower(t.email) LIKE $${vi})`
    );
    values.push(`%${q.toLowerCase()}%`);
    vi++;
  }

  // Optional filter: roster only
  if (rosterOnly) {
    where.push("t.roster_source_id IS NOT NULL");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    // 1) Page data. Compute boolean field from_roster in SQL.
    const dataSql = `
      SELECT
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.school_id,
        t.source,
        t.created_at,
        t.updated_at,
        (t.roster_source_id IS NOT NULL) AS from_roster  -- computed boolean
      FROM public.teachers t
      ${whereSql}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const { rows } = await pool.query(dataSql, values);

    // 2) Total count for pagination
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.teachers t
      ${whereSql}
    `;
    const { rows: countRows } = await pool.query(countSql, values);
    const total = countRows[0]?.total || 0;

    // 3) Map DB fields → API shape (camelCase) and expose fromRoster
    const items = rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      schoolId: r.school_id,
      source: r.source,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      fromRoster: !!r.from_roster, // NEW
    }));

    res.json({ page: pageNum, pageSize: limit, total, items });
  } catch (err) {
    console.error("[teachers:list] error:", err);
    res.status(500).json({ error: "failed to list teachers" });
  }
});

// POST /teachers — create a new teacher record
router.post("/teachers", async (req, res) => {
  try {
    // 1) read input; both shapes are supported
    const {
      name,
      email,
      first_name: firstNameIn,
      last_name: lastNameIn,
    } = req.body || {};

    // Basic required field
    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }

    // 2) discover which columns exist in `teachers` (avoid referencing non-existent columns)
    const cols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teachers'
    `);
    const colset = new Set(cols.rows.map((r) => r.column_name));

    const hasName = colset.has("name");
    const hasFirstName = colset.has("first_name");
    const hasLastName = colset.has("last_name");

    // 3) create new UUID on Node side
    const id = randomUUID();

    // 4A) Case A: table has a `name` column —> insert (id, name, email)
    if (hasName) {
      // Prefer explicit `name`; otherwise build from first_name + last_name
      const displayName =
        (name && String(name).trim()) ||
        [firstNameIn, lastNameIn].filter(Boolean).join(" ").trim();

      if (!displayName) {
        return res
          .status(400)
          .json({ ok: false, error: "name (or first_name/last_name) is required" });
      }

      const sql = `
        INSERT INTO teachers (id, name, email)
        VALUES ($1, $2, $3)
        RETURNING id, name, email
      `;
      const r = await pool.query(sql, [id, displayName, email]);
      return res.status(201).json({ ok: true, data: r.rows[0] });
    }

    // 4B) Case B: no `name`, but `first_name` / `last_name` exist —> insert those columns
    if (hasFirstName || hasLastName) {
      // Start from provided first/last; if only `name` is provided, split it
      let first_name = (firstNameIn || "").trim();
      let last_name = (lastNameIn || "").trim();

      if (!first_name && name) {
        // naive split: first token -> first_name; rest -> last_name
        const parts = String(name).trim().split(/\s+/);
        first_name = parts.shift() || "";
        last_name = parts.join(" ");
      }

      if (!first_name) {
        return res
          .status(400)
          .json({ ok: false, error: "first_name is required (or provide name to split)" });
      }

      // Build the INSERT dynamically so we never reference columns that don't exist
      const fields = ["id", "email"];
      const values = [id, email];
      const placeholders = ["$1", "$2"];
      let p = 3;

      if (hasFirstName) {
        fields.push("first_name");
        values.push(first_name);
        placeholders.push(`$${p++}`);
      }
      if (hasLastName) {
        fields.push("last_name");
        values.push(last_name);
        placeholders.push(`$${p++}`);
      }

      const sql = `
        INSERT INTO teachers (${fields.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING
          id,
          ${
            hasFirstName && hasLastName
              ? `(first_name || ' ' || last_name) AS name`
              : hasFirstName
              ? `first_name AS name`
              : hasLastName
              ? `last_name AS name`
              : `'' AS name`
          },
          email
      `;
      const r = await pool.query(sql, values);
      return res.status(201).json({ ok: true, data: r.rows[0] });
    }

    // 4C) Neither `name` nor `first_name/last_name` exist — unsupported schema for this feature
    return res
      .status(500)
      .json({ ok: false, error: "DB schema missing name/first_name/last_name columns" });
  } catch (e) {
    // Friendly duplicate-key message (e.g., email unique)
    if (e.code === "23505") {
      return res
        .status(409)
        .json({ ok: false, error: "Duplicate key (likely email already exists)" });
    }
    console.error("[POST /teachers] DB error:", e?.message);
    return res.status(500).json({ ok: false, error: "DB insert failed" });
  }
});

// DELETE /teachers/:id  —— delete one teacher by id
router.delete("/teachers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      "DELETE FROM teachers WHERE id=$1 RETURNING id",
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "not found" });
    }
    return res.json({ ok: true, id });
  } catch (e) {
    console.error("[DELETE /teachers/:id]", e?.message);
    return res.status(500).json({ ok: false, error: "DB delete failed" });
  }
});

// Update a teacher. Accepts either {firstName,lastName,email} or {name,email}.
router.patch("/teachers/:id", async (req, res) => {
  const id = req.params.id;
  const { name, firstName, lastName, email } = req.body || {};

  // Normalize first/last:
  // Prefer explicit firstName/lastName; if only "name" is provided, split it.
  let fn = typeof firstName === "string" ? firstName.trim() : null;
  let ln = typeof lastName === "string" ? lastName.trim() : null;

  if ((!fn || !ln) && typeof name === "string" && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (!fn) fn = parts[0] || "";
    if (!ln) ln = parts.slice(1).join(" ") || "";
  }

  const em = typeof email === "string" ? email.trim() : null;

  try {
    // Only change provided fields; keep others as-is via COALESCE.
    const { rows } = await pool.query(
      `
      UPDATE public.teachers
      SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        email      = COALESCE($3, email),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, first_name, last_name, email, (roster_source_id IS NOT NULL) AS is_roster
      `,
      [fn, ln, em, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Teacher not found" });
    }
    return res.json({ ok: true, ...rows[0] });
  } catch (e) {
    console.error("PATCH /teachers/:id failed:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});



export default router;