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
  const [ssoLoading, setSsoLoading] = useState(false);

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
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background circles */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "40%",
        height: "40%",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 20s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "-10%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 25s ease-in-out infinite reverse"
      }} />

      <div style={{ 
        maxWidth: "420px", 
        width: "100%",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "clamp(24px, 5vw, 48px)",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        zIndex: 1,
        animation: "fadeInUp 0.6s ease-out"
      }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div 
            role="img"
            aria-label="Teacher Evaluation Platform Logo"
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: "50%",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
              animation: "pulse 2s ease-in-out infinite"
            }}>
            🎓
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: "32px", 
            fontWeight: "700",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.5px"
          }}>
            Teacher Evaluation
          </h1>
          <p style={{ 
            margin: "10px 0 0", 
            color: "#6b7280", 
            fontSize: "15px",
            lineHeight: "1.6"
          }}>
            Comprehensive faculty assessment platform
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
            aria-label="Sign in with email and password"
            style={{ 
              width: "100%", 
              padding: "14px 24px",
              background: loading ? "#9ca3af" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 4px 12px rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 20px rgba(99, 102, 241, 0.4)";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
              }
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
                <span style={{ fontSize: "18px" }}>🔐</span>
                Sign In with Email
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
          disabled={ssoLoading}
          aria-label="Sign in with Schoolday SSO"
          onClick={() => {
            setSsoLoading(true);
            // Redirect to Schoolday SSO login
            // For demo, we'll use a specific demo user
            const demoUser = "peiyao@example.com"; // You can change this
            window.location.href = `http://localhost:8080/api/auth/schoolday/login?demo_user=${demoUser}`;
          }}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: ssoLoading ? "#f3f4f6" : "white",
            color: ssoLoading ? "#9ca3af" : "#1f2937",
            border: "2px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: ssoLoading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}
          onMouseOver={(e) => {
            if (!ssoLoading) {
              e.target.style.borderColor = "#6366f1";
              e.target.style.background = "#faf5ff";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.15)";
            }
          }}
          onMouseOut={(e) => {
            if (!ssoLoading) {
              e.target.style.borderColor = "#e5e7eb";
              e.target.style.background = "white";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }
          }}
        >
          {ssoLoading ? (
            <>
              <div style={{
                width: "20px",
                height: "20px",
                border: "2px solid #e5e7eb",
                borderTop: "2px solid #6366f1",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              Redirecting to Schoolday...
            </>
          ) : (
            <>
              <span style={{ fontSize: "24px" }}>🏫</span>
              Sign in with Schoolday
            </>
          )}
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
            
            @keyframes float {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(30px, -30px) scale(1.05); }
              66% { transform: translate(-20px, 20px) scale(0.95); }
            }
            
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes pulse {
              0%, 100% { 
                transform: scale(1);
                box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
              }
              50% { 
                transform: scale(1.05);
                box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.5);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}
