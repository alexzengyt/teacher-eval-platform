// src/lib/api.js
// A tiny fetch wrapper that:
// - prefixes requests with VITE_API_BASE
// - automatically attaches Authorization header if token exists
// - redirects to /login on 401

import { getToken, clearToken } from "./token";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

/** Perform a JSON request and parse JSON response. */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});
  // Ensure JSON by default if body is an object
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }

  // Attach Bearer token when available
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  // On 401, clear token and send user to login
  if (res.status === 401) {
    clearToken();
    if (location.pathname !== "/login") {
      location.assign("/login");
    }
    throw new Error("Unauthorized");
  }

  // Try to parse JSON; if no content, return null
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
