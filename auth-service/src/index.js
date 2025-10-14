// src/index.js - minimal auth service (ESM)
// All comments are in English for clarity.

import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001; // container internal port (matches compose)
const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'change_me';

// In-memory demo users (plain passwords - demo only)
const USERS = [
  { id: 'u1', email: 'demo@school.com', password: 'pass123', name: 'Demo User' },
  { id: 'u2', email: 'admin@school.com', password: 'admin123', name: 'Admin User' },
];

// Helper: sign a short-lived JWT (2h)
function signToken(user) {
  const role = user.role || (user.email.toLowerCase() === 'admin@school.com' ? 'admin' : 'user');
  const payload = { sub: user.id, email: user.email, name: user.name,role };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '2h' });
}

// POST /api/auth/login  -> { ok, token, user }
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'email and password required' });
  }
  const user = USERS.find(u => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ ok: false, error: 'invalid credentials' });
  }
  const token = signToken(user);
  return res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /api/auth/me  -> { ok, user } if token valid
app.get('/api/auth/me', (req, res) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ ok: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'invalid token' });
  }
});

// ========== Schoolday SSO Integration ==========

const SD_BASE_URL = process.env.SD_BASE_URL || 'http://mock-schoolday-service:7001';
const SD_PUBLIC_URL = process.env.SD_PUBLIC_URL || 'http://localhost:7001'; // For browser redirects
const SD_CLIENT_ID = process.env.SD_CLIENT_ID || 'dev-client';
const SD_CLIENT_SECRET = process.env.SD_CLIENT_SECRET || 'dev-secret';

// GET /api/auth/schoolday/callback - OAuth callback handler
// This endpoint receives the authorization code from Schoolday and exchanges it for an access token
app.get('/api/auth/schoolday/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ ok: false, error: `OAuth error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ ok: false, error: 'Missing authorization code' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${SD_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: SD_CLIENT_ID,
        client_secret: SD_CLIENT_SECRET,
        redirect_uri: process.env.SD_REDIRECT_URI || 'http://localhost:8080/api/auth/schoolday/callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user_info } = tokenData;

    if (!user_info) {
      throw new Error('No user info returned from Schoolday');
    }

    // Create a local user record or find existing one
    // In a real system, you'd store this in the database
    const user = {
      id: user_info.username || user_info.email,
      email: user_info.email,
      name: `${user_info.given_name} ${user_info.family_name}`,
      role: user_info.role === 'teacher' ? 'teacher' : 'user',
      schooldayId: user_info.sourced_id
    };

    // Issue our own JWT for the user
    const jwtToken = signToken(user);

    // Redirect to frontend with token
    // In production, you'd use a more secure method (e.g., set HTTP-only cookie)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?sso_token=${jwtToken}&sso_provider=schoolday`);

  } catch (err) {
    console.error('[SSO] Callback error:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/auth/schoolday/login - Initiate Schoolday SSO login
// Redirects user to Schoolday authorization page
app.get('/api/auth/schoolday/login', (req, res) => {
  const { demo_user } = req.query; // Optional: for demo purposes
  
  const redirectUri = process.env.SD_REDIRECT_URI || 'http://localhost:8080/api/auth/schoolday/callback';
  const state = Math.random().toString(36).substring(7); // CSRF protection
  
  // Use SD_PUBLIC_URL for browser redirects (localhost instead of container name)
  let authorizeUrl = `${SD_PUBLIC_URL}/oauth/authorize?` +
    `response_type=code&` +
    `client_id=${SD_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}&` +
    `scope=discovery roster.read`;
  
  // For demo: allow selecting which user to log in as
  if (demo_user) {
    authorizeUrl += `&demo_user=${encodeURIComponent(demo_user)}`;
  }
  
  res.redirect(authorizeUrl);
});

// POST /api/auth/schoolday/token - Exchange SSO token for user info (alternative flow)
app.post('/api/auth/schoolday/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ ok: false, error: 'Missing authorization code' });
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(`${SD_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: SD_CLIENT_ID,
        client_secret: SD_CLIENT_SECRET,
        redirect_uri: process.env.SD_REDIRECT_URI || 'http://localhost:8080/api/auth/schoolday/callback'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const { user_info } = tokenData;

    if (!user_info) {
      throw new Error('No user info returned');
    }

    // Create user and issue JWT
    const user = {
      id: user_info.username || user_info.email,
      email: user_info.email,
      name: `${user_info.given_name} ${user_info.family_name}`,
      role: user_info.role === 'teacher' ? 'teacher' : 'user'
    };

    const jwtToken = signToken(user);

    return res.json({
      ok: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[SSO] Token exchange error:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'auth-service' });
});

app.listen(PORT, () => {
  console.log(`[auth-service] listening on ${PORT}`);
  console.log(`[auth-service] Schoolday SSO login: http://localhost:8080/api/auth/schoolday/login`);
});
