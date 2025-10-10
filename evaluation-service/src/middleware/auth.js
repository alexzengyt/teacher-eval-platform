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

  const header = req.headers.authorization || "";
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
