import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import pg from "pg";
const { Pool } = pg;
import jwt from "jsonwebtoken";
import { linkRosterToTeachers } from "./sync/linkRosterToTeachers.js";

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck endpoint
app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "data-integration" });
});

// Require an Authorization: Bearer <jwt> with role === 'admin'
function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const [, token] = auth.split(" ");
    if (!token) return res.status(401).json({ error: "missing_token" });

    const secret = process.env.AUTH_JWT_SECRET;
    const payload = jwt.verify(token, secret);

    if (payload?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}

// Postgres connection (reads DATABASE_URL from env)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Cache the Schoolday access token to avoid re-auth every call
let sdToken = null;
let sdTokenExp = 0; // epoch seconds

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (sdToken && sdTokenExp - 30 > now) return sdToken; // reuse if not expiring

  const base = process.env.SD_BASE_URL || "http://mock-schoolday-service:7001";
  const client_id = process.env.SD_CLIENT_ID || "dev-client";
  const client_secret = process.env.SD_CLIENT_SECRET || "dev-secret";

  const resp = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id,
      client_secret,
      scope: "discovery roster.read",
    }),
  });
  if (!resp.ok) throw new Error(`token failed: ${resp.status} ${await resp.text()}`);

  const json = await resp.json();
  sdToken = json.access_token;
  sdTokenExp = Math.floor(Date.now() / 1000) + (json.expires_in || 3600);
  return sdToken;
}

async function sdGet(path) {
  const token = await getAccessToken();
  const base = process.env.SD_BASE_URL || "http://mock-schoolday-service:7001";
  const resp = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`GET ${path} failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

// ===== Upsert helpers into roster_* tables =====
async function upsertTeacher(t, client) {
  // t: { sourcedId, username, givenName, familyName, orgSourcedIds: [...] }
  await client.query(
    `
    INSERT INTO roster_teachers (external_id, username, first_name, last_name, org_external_id, updated_at)
    VALUES ($1,$2,$3,$4,$5, now())
    ON CONFLICT (external_id)
    DO UPDATE SET username = EXCLUDED.username,
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  org_external_id = EXCLUDED.org_external_id,
                  updated_at = now()
    `,
    [
      t.sourcedId,
      t.username || null,
      t.givenName || null,
      t.familyName || null,
      (t.orgSourcedIds && t.orgSourcedIds[0]) || null,
    ]
  );
}

async function upsertClass(c, client) {
  // c: { sourcedId, title, schoolSourcedId, terms: [...] }
  await client.query(
    `
    INSERT INTO roster_classes (external_id, title, school_external_id, term, updated_at)
    VALUES ($1,$2,$3,$4, now())
    ON CONFLICT (external_id)
    DO UPDATE SET title = EXCLUDED.title,
                  school_external_id = EXCLUDED.school_external_id,
                  term = EXCLUDED.term,
                  updated_at = now()
    `,
    [c.sourcedId, c.title || null, c.schoolSourcedId || null, (c.terms && c.terms[0]) || null]
  );
}

async function upsertEnrollment(e, client) {
  // e: { userSourcedId, classSourcedId, role }
  await client.query(
    `
    INSERT INTO roster_teacher_class_enrollments (teacher_external_id, class_external_id, role)
    VALUES ($1,$2,$3)
    ON CONFLICT (teacher_external_id, class_external_id)
    DO UPDATE SET role = EXCLUDED.role
    `,
    [e.userSourcedId, e.classSourcedId, e.role || "teacher"]
  );
}

// Keep the last run summary in memory for quick read
let lastSummary = null;

// ===== POST /internal/sync/run =====
// Triggers a full pull from the mock Schoolday and upserts into Postgres
app.post("/internal/sync/run", async (req, res) => {
  const client = await pool.connect();
  const startedAt = new Date().toISOString();
  let runId = null;

  try {
    // 0) discovery -> get OneRoster base
    const districts = await sdGet("/discovery/districts");
    const oneRosterBase = (districts[0] && districts[0].oneRosterBaseUrl) || "/oneroster/v1p1";

    // 1) fetch minimal roster resources
    const [teachers, classes, enrollments] = await Promise.all([
      sdGet(`${oneRosterBase}/users?role=teacher`),
      sdGet(`${oneRosterBase}/classes`),
      sdGet(`${oneRosterBase}/enrollments`),
    ]);

    await client.query("BEGIN");

    // 2) upserts
    for (const t of teachers) await upsertTeacher(t, client);
    for (const c of classes) await upsertClass(c, client);
    for (const e of enrollments) await upsertEnrollment(e, client);
    
    // 2.5) Link evaluation.teachers to roster_teachers by email (inside the same tx)
    const linkStats = await linkRosterToTeachers(client);

    // 3) write a sync_runs row
    const summary = {
      teachersUpserts: teachers.length,
      classesUpserts: classes.length,
      enrollmentsUpserts: enrollments.length,
      linkTeachers: linkStats,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    const r = await client.query(
      `INSERT INTO sync_runs (status, summary_json) VALUES ($1,$2) RETURNING id`,
      ["ok", JSON.stringify(summary)]
    );
    runId = r.rows[0].id;

    await client.query("COMMIT");
    lastSummary = { runId, ...summary };

    return res.json({ status: "ok", runId, counters: summary });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    await client
      .query(`INSERT INTO sync_runs (status, summary_json) VALUES ($1,$2)`, [
        "failed",
        JSON.stringify({ error: String(err), startedAt }),
      ])
      .catch(() => {});
    console.error("[sync] failed:", err);
    return res.status(500).json({ status: "failed", error: String(err) });
  } finally {
    client.release();
  }
});

// --- Admin-only route that triggers the same sync ---
// Requires Authorization: Bearer <JWT with role=admin>
app.post("/secure/sync/run", requireAdmin, async (req, res) => {
  try {
    // Reuse the same implementation by calling our internal endpoint.
    const resp = await fetch(`http://localhost:${process.env.PORT || 7002}/internal/sync/run`, {
      method: "POST",
    });
    const body = await resp.text();
    res.status(resp.status).type("application/json").send(body);
  } catch (e) {
    res.status(500).json({ status: "failed", error: String(e) });
  }
});

// ===== GET /internal/sync/status =====
// Returns the latest sync_runs record (best-effort)
app.get("/internal/sync/status", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, status, started_at, finished_at, summary_json
         FROM sync_runs
        ORDER BY id DESC
        LIMIT 1`
    );
    if (r.rows.length === 0) return res.json({ status: "none" });
    return res.json(r.rows[0]);
  } catch (e) {
    return res.json({ status: "unknown", error: String(e), lastSummary });
  }
});

const port = process.env.PORT || 7002;
app.listen(port, () => {
  console.log(`[data-integration] listening on :${port}`);
});
