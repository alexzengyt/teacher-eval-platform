import express from "express";
import { pool } from "../db.js";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";


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

router.get("/reports/summary", async (req, res) => {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM public.teachers) AS total_teachers,
        (SELECT COUNT(*) FROM public.teachers WHERE roster_source_id IS NOT NULL) AS roster_count,
        (SELECT COUNT(*) FROM public.teachers WHERE roster_source_id IS NULL) AS manual_count,
        (SELECT COUNT(*) FROM public.teachers WHERE email IS NULL OR TRIM(email) = '') AS missing_email
    `;
    const { rows } = await pool.query(sql);
    return res.json({ ok: true, ...rows[0] });
  } catch (e) {
    console.error("GET /reports/summary failed:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /api/eval/reports/teachers.csv
router.get("/reports/teachers.csv", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, first_name, last_name, email,
        (roster_source_id IS NOT NULL) AS is_roster,
        created_at, updated_at
      FROM public.teachers
      ORDER BY created_at DESC
    `);

    const headers = ["id","first_name","last_name","email","is_roster","created_at","updated_at"];
    const lines = [headers.join(",")].concat(
      rows.map(r => headers.map(h => {
        const v = r[h];
        if (v == null) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","))
    );
    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="teachers.csv"');
    res.send(csv);
  } catch (e) {
    console.error("GET /reports/teachers.csv failed:", e);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

const HEADERS = ["id","first_name","last_name","email","is_roster","created_at","updated_at"];
const COL_WIDTHS = [110, 90, 90, 200, 70, 90];
const GUTTER = 8;

// ---- PDF helpers: header & footer ----
function drawHeader(doc, fmt) {
  doc.font("Helvetica-Bold").fontSize(16).text("Teachers Report", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666")
     .text(`Generated at: ${fmt(new Date())}`, { align: "center" })
     .fillColor("black");
  doc.moveDown(0.6);
  doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();

  let x = 36;

  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(10);
  HEADERS.forEach((h, i) => {
    doc.text(h, x, doc.y, { width: COL_WIDTHS[i], continued: i !== HEADERS.length - 1, ellipsis: true });
    x += COL_WIDTHS[i] + GUTTER;
  });
  doc.moveDown(0.4);
  doc.font("Helvetica");
  doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
  doc.moveDown(0.3);
}

function drawFooter(doc) {
  // const text = `Page ${doc.page.number}`;
  // doc.fontSize(9).fillColor("#666")
  //    .text(text, 36, doc.page.height - 36, { align: "right", width: 523 });
  // doc.fillColor("black");
}
// ---- end helpers ----


// GET /api/eval/reports/teachers.pdf
router.get("/reports/teachers.pdf", async (req, res) => {
  try {
    // 1) Load the same data used by CSV
    const { rows } = await pool.query(`
      SELECT
        id, first_name, last_name, email,
        (roster_source_id IS NOT NULL) AS is_roster,
        created_at, updated_at
      FROM public.teachers
      ORDER BY created_at DESC
    `);

    // 2) Create PDF stream
    const doc = new PDFDocument({ size: "A4", margin: 36 }); // ~0.5 inch margin
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="teachers.pdf"');
    doc.pipe(res);
    const fmt = (d) => new Date(d).toLocaleString("en-US", { hour12: false });


    // Guard against re-entrancy while drawing header/footer
    // let paintingHeader = false;

    // function onPageAdded() {
    //   if (paintingHeader) return;       // prevent re-entrant recursion
    //   paintingHeader = true;
    //   drawHeader(doc, fmt);
    //   drawFooter(doc);
    //   paintingHeader = false;
    // }

    // doc.on("pageAdded", onPageAdded);


    // 3) Title
    drawHeader(doc, fmt);

    // 5) Rows
    rows.forEach((r) => {
      const cells = [
        r.id || "",
        r.first_name || "",
        r.last_name || "",
        r.email || "",
        r.is_roster ? "TRUE" : "FALSE",
        fmt(r.created_at),
        fmt(r.updated_at),
      ];

      const paddy = 6;
      const heights = cells.map((v, i) =>
        doc.heightOfString(String(v), { width: COL_WIDTHS[i] })
      );
      const rowH = Math.max(12, ...heights) + paddy;

      const startY = doc.y;
      let xi = 36;
      cells.forEach((v, i) => {
        doc.text(String(v), xi, startY, {
          width: COL_WIDTHS[i],
          continued: false,
        });
        xi += COL_WIDTHS[i] + GUTTER;
      });

      doc.y = startY + rowH;
      doc
        .strokeColor("#eeeeee")
        .moveTo(36, doc.y)
        .lineTo(559, doc.y)
        .stroke()
        .strokeColor("black");
    });

    // rawFooter(doc);
    // 6) Finish
    doc.end();
  } catch (e) {
    console.error("GET /reports/teachers.pdf failed:", e);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, error: "Internal server error" });
    }
  }
});

// ========== NEW API ENDPOINTS FOR MULTI-TAB INTERFACE ==========

/**
 * GET /api/eval/teachers/:id/courses
 * Returns courses taught by a teacher
 */
router.get("/teachers/:id/courses", async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    const sql = `
      SELECT 
        c.id,
        c.code,
        c.title,
        s.term as period,
        COUNT(DISTINCT e.eval_id) as student_count,
        AVG(e.score) as avg_rating
      FROM teachers t
      JOIN teaching_assignments ta ON ta.teacher_id = t.id
      JOIN sections s ON s.id = ta.section_id
      JOIN courses c ON c.id = s.course_id
      LEFT JOIN (
        -- Mock student evaluations: generate varying students (20-50) per section with ratings (3.8-5.0)
        -- Use section ID hash as seed for variation
        SELECT 
          s2.id AS section_id,
          -- Generate rating between 3.8 and 5.0 based on section ID
          3.8 + (abs(hashtext(s2.id::text)) % 120) / 100.0 as score,
          gen_random_uuid() as eval_id
        FROM sections s2
        -- Generate student count between 20 and 50 based on section ID
        CROSS JOIN generate_series(
          1, 
          20 + (abs(hashtext(s2.id::text)) % 31)
        ) student_num
      ) e ON e.section_id = s.id
      WHERE t.id = $1
      GROUP BY c.id, c.code, c.title, s.term
      ORDER BY s.term DESC
      LIMIT 50
    `;
    
    const { rows } = await pool.query(sql, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error("GET /teachers/:id/courses error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/eval/teachers/:id/publications
 * Returns publications for a teacher
 */
router.get("/teachers/:id/publications", async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    const sql = `
      SELECT 
        id,
        title,
        venue,
        published_on,
        external_id,
        source,
        created_at
      FROM publications
      WHERE teacher_id = $1
      ORDER BY published_on DESC NULLS LAST
      LIMIT 100
    `;
    
    const { rows } = await pool.query(sql, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error("GET /teachers/:id/publications error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/eval/teachers/:id/pd-courses
 * Returns professional development courses for a teacher
 */
router.get("/teachers/:id/pd-courses", async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    const sql = `
      SELECT 
        id,
        provider,
        title,
        hours,
        completed_on,
        external_id,
        source,
        created_at
      FROM pd_courses
      WHERE teacher_id = $1
      ORDER BY completed_on DESC NULLS LAST
      LIMIT 100
    `;
    
    const { rows } = await pool.query(sql, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error("GET /teachers/:id/pd-courses error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// Note: service, education, career, and awards endpoints 
// have been moved to dedicated route files:
// - routes/service.js
// - routes/education.js  
// - routes/career.js
// - routes/grants.js

export default router;