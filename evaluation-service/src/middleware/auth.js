// src/middleware/auth.js
// Minimal JWT auth middleware for evaluation-service.

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev_secret_please_change";

/**
 * Require a valid "Authorization: Bearer <token>" header.
 * On success, attaches decoded claims to req.user and calls next().
 * On failure, responds 401 with a minimal error payload.
 */
export function requireAuth(req, res, next) {
  // quick bypass switch for emergency rollback (optional)
  if (process.env.AUTH_DISABLED === "1") {
    return next();
  }

  // Read token from header (authorization/Authorization) or from query (?authorization=Bearer%20<token>)
  // This is handy for file downloads where some proxies strip Authorization headers.
  let header =
    req.headers.authorization ||
    req.headers.Authorization ||
    (req.query && req.query.authorization) ||
    "";
  // If it came from query, it may be URL-encoded like "Bearer%20<token>"
  try { header = decodeURIComponent(header); } catch (_) {}
  // Normalize extra spaces
  header = header.replace(/\s+/, " ").trim();
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = decoded; // make user claims available downstream
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "invalid token" });
  }
}
