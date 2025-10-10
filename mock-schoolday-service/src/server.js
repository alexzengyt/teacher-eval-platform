import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Healthcheck endpoint for docker-compose readiness
app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "mock-schoolday" });
});

app.post("/oauth/token", (req, res) => {
  // Read fields from JSON or form body
  const {
    grant_type,
    client_id,
    client_secret,
    scope = "discovery roster.read",
  } = req.body || {};

  // Validate grant type
  if (grant_type !== "client_credentials") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }

  // Validate client against env
  const expectedId = process.env.SD_EXPECTED_CLIENT_ID || "dev-client";
  const expectedSecret = process.env.SD_EXPECTED_CLIENT_SECRET || "dev-secret";
  if (client_id !== expectedId || client_secret !== expectedSecret) {
    return res.status(401).json({ error: "invalid_client" });
  }

  // Return a static token for now
  return res.json({
    access_token: "mock_sd_access_token_123",
    token_type: "Bearer",
    expires_in: 3600,
    scope,
  });
});

// Simple Bearer token guard for protected endpoints
function requireBearer(req, res, next) {
  // Expected token issued by our mock /oauth/token
  const expected = "mock_sd_access_token_123";

  const auth = req.headers["authorization"] || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || token !== expected) {
    return res.status(401).json({ error: "invalid_token" });
  }
  return next();
}

// --- Discovery API (mock) ---
// Protected: requires a valid Bearer token from /oauth/token
app.get("/discovery/districts", requireBearer, (req, res) => {
  // Minimal district info with OneRoster base path
  return res.json([
    {
      districtId: "d-1001",
      name: "Springfield USD",
      oneRosterBaseUrl: "/oneroster/v1p1"
    }
  ]);
});

// --- In-memory OneRoster seed data (minimal) ---
const ORGS = [
  { sourcedId: "dist-01", name: "Springfield USD", type: "district" },
  { sourcedId: "sch-01", name: "Springfield High", type: "school", parentSourcedId: "dist-01" }
];

const USERS = [
  // minimal teacher records
  { sourcedId: "t-001", role: "teacher", username: "alice.t", givenName: "Alice", familyName: "Taylor", orgSourcedIds: ["sch-01"] },
  { sourcedId: "t-002", role: "teacher", username: "ben.w",    givenName: "Ben",   familyName: "Wang",   orgSourcedIds: ["sch-01"] }
];

const CLASSES = [
  { sourcedId: "c-101", title: "Algebra I",  schoolSourcedId: "sch-01", terms: ["2025-Fall"] },
  { sourcedId: "c-102", title: "Biology",    schoolSourcedId: "sch-01", terms: ["2025-Fall"] }
];

const ENROLLMENTS = [
  { sourcedId: "enr-9001", userSourcedId: "t-001", classSourcedId: "c-101", role: "teacher" },
  { sourcedId: "enr-9002", userSourcedId: "t-002", classSourcedId: "c-102", role: "teacher" }
];

// --- OneRoster: orgs ---
app.get("/oneroster/v1p1/orgs", requireBearer, (req, res) => {
  // Return both district and school (very small dataset)
  res.json(ORGS);
});

// --- OneRoster: users (support ?role=teacher) ---
app.get("/oneroster/v1p1/users", requireBearer, (req, res) => {
  const { role } = req.query;
  let data = USERS;
  if (role) {
    data = data.filter(u => String(u.role).toLowerCase() === String(role).toLowerCase());
  }
  res.json(data);
});

// --- OneRoster: classes ---
app.get("/oneroster/v1p1/classes", requireBearer, (req, res) => {
  res.json(CLASSES);
});

// --- OneRoster: enrollments ---
app.get("/oneroster/v1p1/enrollments", requireBearer, (req, res) => {
  res.json(ENROLLMENTS);
});


// Keep ports configurable via env
const port = process.env.PORT || 7001;
app.listen(port, () => {
  console.log(`[mock-schoolday] listening on :${port}`);
});
