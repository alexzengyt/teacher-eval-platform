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
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{ 
        maxWidth: "400px", 
        width: "100%",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "50%",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            🎓
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: "28px", 
            fontWeight: "700",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Teacher Evaluation
          </h1>
          <p style={{ 
            margin: "8px 0 0", 
            color: "#6b7280", 
            fontSize: "16px" 
          }}>
            Sign in to access the platform
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "500",
              color: "#374151"
            }}>
              Email Address
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="Enter your email"
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontSize: "14px", 
              fontWeight: "500",
              color: "#374151"
            }}>
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="Enter your password"
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            style={{ 
              width: "100%", 
              padding: "12px 24px",
              background: loading ? "#9ca3af" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Signing in...
              </>
            ) : (
              <>
                🔐 Sign In
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          margin: "24px 0",
          gap: "12px"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
          <span style={{ color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        </div>

        {/* Schoolday SSO Button */}
        <button
          type="button"
          onClick={() => {
            // Redirect to Schoolday SSO login
            // For demo, we'll use a specific demo user
            const demoUser = "peiyao@example.com"; // You can change this
            window.location.href = `http://localhost:8080/api/auth/schoolday/login?demo_user=${demoUser}`;
          }}
          style={{
            width: "100%",
            padding: "12px 24px",
            background: "white",
            color: "#1f2937",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}
          onMouseOver={(e) => {
            e.target.style.borderColor = "#6366f1";
            e.target.style.background = "#f8fafc";
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
          }}
          onMouseOut={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.background = "white";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <span style={{ fontSize: "20px" }}>🏫</span>
          Sign in with Schoolday
        </button>

        {err && (
          <div style={{ 
            marginTop: "16px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "14px"
          }}>
            {err}
          </div>
        )}

        <div style={{ 
          marginTop: "24px", 
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0"
        }}>
          <p style={{ 
            margin: 0, 
            color: "#6b7280", 
            fontSize: "14px",
            textAlign: "center"
          }}>
            <strong>Demo Credentials:</strong><br />
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
              demo@school.com / pass123
            </span><br />
            <span style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
              or admin@school.com / admin123
            </span>
          </p>
        </div>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}
