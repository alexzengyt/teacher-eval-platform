import express from "express";
import cors from "cors";
import fetch from "node-fetch";

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
  // minimal teacher records with email for SSO
  { sourcedId: "t-001", role: "teacher", username: "alice.t", givenName: "Alice", familyName: "Taylor", email: "alice@springfield.edu", orgSourcedIds: ["sch-01"] },
  { sourcedId: "t-002", role: "teacher", username: "ben.w",    givenName: "Ben",   familyName: "Wang", email: "ben@springfield.edu", orgSourcedIds: ["sch-01"] },
  { sourcedId: "t-003", role: "teacher", username: "peiyao.y", givenName: "Peiyao", familyName: "Yang", email: "peiyao@example.com", orgSourcedIds: ["sch-01"] },
  { sourcedId: "t-004", role: "teacher", username: "alex.z", givenName: "Alex", familyName: "Zeng", email: "alex@example.com", orgSourcedIds: ["sch-01"] }
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

// ========== SSO / OAuth 2.0 Authorization Code Flow ==========

// In-memory storage for authorization codes and user sessions
const authCodes = new Map(); // code -> { email, expiresAt }
const userSessions = new Map(); // sessionId -> { email, user }

// GET /oauth/authorize - OAuth authorization endpoint
// User is redirected here from the client app
app.get("/oauth/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, state, scope } = req.query;

  // Validate parameters
  if (response_type !== "code") {
    return res.status(400).send("Unsupported response_type. Use 'code'.");
  }

  const expectedClientId = process.env.SD_EXPECTED_CLIENT_ID || "dev-client";
  if (client_id !== expectedClientId) {
    return res.status(400).send("Invalid client_id");
  }

  if (!redirect_uri) {
    return res.status(400).send("Missing redirect_uri");
  }

  // In a real system, this would show a login page
  // For this mock, we'll auto-select a demo user
  // Let's use a query param ?demo_user=email to simulate user selection
  const demoUserEmail = req.query.demo_user || "alice@springfield.edu";
  
  const user = USERS.find(u => u.email === demoUserEmail);
  if (!user) {
    return res.status(400).send(`Demo user not found: ${demoUserEmail}`);
  }

  // Generate authorization code
  const code = `auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  authCodes.set(code, {
    email: user.email,
    user: user,
    expiresAt: Date.now() + 60000, // 1 minute expiry
    redirectUri: redirect_uri
  });

  // Redirect back to client with code and state
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  res.redirect(redirectUrl.toString());
});

// POST /oauth/token - Exchange authorization code for access token (for SSO)
// This handles both client_credentials (existing) and authorization_code (new)
app.post("/oauth/token", (req, res) => {
  const {
    grant_type,
    client_id,
    client_secret,
    code,
    redirect_uri,
    scope = "discovery roster.read",
  } = req.body || {};

  const expectedId = process.env.SD_EXPECTED_CLIENT_ID || "dev-client";
  const expectedSecret = process.env.SD_EXPECTED_CLIENT_SECRET || "dev-secret";

  // Validate client
  if (client_id !== expectedId || client_secret !== expectedSecret) {
    return res.status(401).json({ error: "invalid_client" });
  }

  // Handle authorization_code grant (SSO)
  if (grant_type === "authorization_code") {
    if (!code) {
      return res.status(400).json({ error: "missing_code" });
    }

    const authData = authCodes.get(code);
    if (!authData) {
      return res.status(400).json({ error: "invalid_code" });
    }

    // Check expiry
    if (Date.now() > authData.expiresAt) {
      authCodes.delete(code);
      return res.status(400).json({ error: "expired_code" });
    }

    // Validate redirect_uri matches
    if (redirect_uri && redirect_uri !== authData.redirectUri) {
      return res.status(400).json({ error: "redirect_uri_mismatch" });
    }

    // Delete code (one-time use)
    authCodes.delete(code);

    // Generate access token with user info
    const accessToken = `sso_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    userSessions.set(accessToken, {
      email: authData.email,
      user: authData.user,
      expiresAt: Date.now() + 3600000 // 1 hour
    });

    return res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope,
      user_info: {
        email: authData.user.email,
        given_name: authData.user.givenName,
        family_name: authData.user.familyName,
        username: authData.user.username,
        role: authData.user.role
      }
    });
  }

  // Handle client_credentials grant (existing - for service-to-service)
  if (grant_type === "client_credentials") {
    return res.json({
      access_token: "mock_sd_access_token_123",
      token_type: "Bearer",
      expires_in: 3600,
      scope,
    });
  }

  return res.status(400).json({ error: "unsupported_grant_type" });
});

// GET /oauth/userinfo - Get user info from access token
app.get("/oauth/userinfo", (req, res) => {
  const auth = req.headers["authorization"] || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "invalid_token" });
  }

  const session = userSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: "invalid_token" });
  }

  if (Date.now() > session.expiresAt) {
    userSessions.delete(token);
    return res.status(401).json({ error: "expired_token" });
  }

  return res.json({
    email: session.user.email,
    given_name: session.user.givenName,
    family_name: session.user.familyName,
    username: session.user.username,
    role: session.user.role,
    sourced_id: session.user.sourcedId
  });
});

// ========== Webhook Support ==========

// In-memory webhook subscriptions
const webhookSubscriptions = [];

// POST /webhooks/subscribe - Subscribe to data change events
app.post("/webhooks/subscribe", requireBearer, (req, res) => {
  const { url, events } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "missing_url" });
  }

  const subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url,
    events: events || ["roster.updated"],
    createdAt: new Date().toISOString()
  };

  webhookSubscriptions.push(subscription);
  
  return res.json({
    status: "subscribed",
    subscription
  });
});

// GET /webhooks/subscriptions - List webhook subscriptions
app.get("/webhooks/subscriptions", requireBearer, (req, res) => {
  res.json({ subscriptions: webhookSubscriptions });
});

// POST /webhooks/trigger - Manually trigger a webhook (for testing)
app.post("/webhooks/trigger", requireBearer, async (req, res) => {
  const { event = "roster.updated" } = req.body;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data: {
      message: "Roster data has been updated",
      affectedResources: ["teachers", "classes", "enrollments"]
    }
  };

  const results = [];
  for (const sub of webhookSubscriptions) {
    if (sub.events.includes(event)) {
      try {
        const response = await fetch(sub.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          status: response.ok ? "delivered" : "failed",
          statusCode: response.status
        });
      } catch (error) {
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          status: "error",
          error: error.message
        });
      }
    }
  }

  res.json({
    event,
    triggered: results.length,
    results
  });
});

// ========== Professional Development API ==========

const PD_COURSES = [
  {
    id: "pd-001",
    title: "Advanced Teaching Strategies",
    category: "teaching",
    duration: "4 weeks",
    level: "intermediate",
    description: "Enhance your teaching effectiveness with modern pedagogical approaches",
    topics: ["Active Learning", "Student Engagement", "Assessment Design"]
  },
  {
    id: "pd-002",
    title: "Research Methods in Education",
    category: "research",
    duration: "6 weeks",
    level: "advanced",
    description: "Develop your research skills and publication strategies",
    topics: ["Quantitative Methods", "Qualitative Analysis", "Academic Writing"]
  },
  {
    id: "pd-003",
    title: "Community Engagement Best Practices",
    category: "service",
    duration: "3 weeks",
    level: "beginner",
    description: "Learn how to effectively contribute to your academic community",
    topics: ["Committee Leadership", "Mentorship", "Outreach Programs"]
  },
  {
    id: "pd-004",
    title: "Educational Technology Integration",
    category: "teaching",
    duration: "5 weeks",
    level: "intermediate",
    description: "Master modern educational technologies and digital tools",
    topics: ["Learning Management Systems", "Interactive Content", "Online Assessment"]
  },
  {
    id: "pd-005",
    title: "Grant Writing Workshop",
    category: "research",
    duration: "4 weeks",
    level: "intermediate",
    description: "Improve your grant proposal writing and funding success rate",
    topics: ["Proposal Structure", "Budget Planning", "Impact Statements"]
  }
];

// GET /academy/courses - Get all PD courses
app.get("/academy/courses", requireBearer, (req, res) => {
  const { category } = req.query;
  let courses = PD_COURSES;
  
  if (category) {
    courses = courses.filter(c => c.category === category);
  }
  
  res.json({ courses });
});

// POST /academy/recommendations - Get personalized PD recommendations
app.post("/academy/recommendations", requireBearer, (req, res) => {
  const { weakAreas, currentScores } = req.body;
  
  // Simple recommendation logic based on weak areas
  const recommendations = [];
  
  if (weakAreas?.includes("teaching") || (currentScores?.teaching && currentScores.teaching < 4.5)) {
    recommendations.push(...PD_COURSES.filter(c => c.category === "teaching"));
  }
  
  if (weakAreas?.includes("research") || (currentScores?.research && currentScores.research < 4.5)) {
    recommendations.push(...PD_COURSES.filter(c => c.category === "research"));
  }
  
  if (weakAreas?.includes("service") || (currentScores?.service && currentScores.service < 4.5)) {
    recommendations.push(...PD_COURSES.filter(c => c.category === "service"));
  }
  
  // If no specific weak areas, recommend popular courses
  if (recommendations.length === 0) {
    recommendations.push(PD_COURSES[0], PD_COURSES[3]);
  }
  
  res.json({
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
    message: "Based on your evaluation scores, we recommend these professional development courses"
  });
});


// Keep ports configurable via env
const port = process.env.PORT || 7001;
app.listen(port, () => {
  console.log(`[mock-schoolday] listening on :${port}`);
  console.log(`[mock-schoolday] SSO authorize URL: http://localhost:${port}/oauth/authorize`);
  console.log(`[mock-schoolday] Available demo users: alice@springfield.edu, ben@springfield.edu, peiyao@example.com, alex@example.com`);
});
