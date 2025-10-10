// src/index.js - minimal auth service (ESM)
// All comments are in English for clarity.

import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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

app.listen(PORT, () => {
  console.log(`[auth-service] listening on ${PORT}`);
});
