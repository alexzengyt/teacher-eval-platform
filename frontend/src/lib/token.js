// src/lib/token.js
// Small helpers to read/write/remove JWT in localStorage.

const KEY = "auth_token";

/** Get current JWT from localStorage */
export function getToken() {
  return localStorage.getItem(KEY);
}

/** Save JWT to localStorage */
export function setToken(t) {
  localStorage.setItem(KEY, t);
}

/** Remove JWT from localStorage */
export function clearToken() {
  localStorage.removeItem(KEY);
}

/** Simple boolean helper */
export function isLoggedIn() {
  return !!getToken();
}