// src/Login.jsx
import React, { useState } from "react";
import { apiFetch } from "./lib/api.js";
import { setToken } from "./lib/token.js";

export default function Login() {
  // keep inputs in component state
  const [email, setEmail] = useState("demo@school.com");
  const [password, setPassword] = useState("pass123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // call auth endpoint via gateway
      const { token, user } = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password }, // apiFetch will JSON.stringify
      });
      // persist token and go to app
      setToken(token);
      // redirect to home (teachers list)
      location.assign("/");
    } catch (error) {
      setErr(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>Sign in</h2>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: "100%", padding: 8, margin: "4px 0 12px" }}
        />
        <label>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 8, margin: "4px 0 12px" }}
        />
        <button disabled={loading} type="submit" style={{ width: "100%", padding: 10 }}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <p style={{ color: "#666", marginTop: 12 }}>Demo: demo@school.com / pass123</p>
    </div>
  );
}
