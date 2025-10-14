import React, { useEffect } from "react";
import Login from "./Login.jsx";
import { isLoggedIn, clearToken, setToken } from "./lib/token.js";
import TeachersTable from "./components/TeachersTable.jsx";

export default function App() {
  // Handle SSO callback - check for sso_token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    const ssoProvider = params.get('sso_provider');
    
    if (ssoToken) {
      console.log(`[SSO] Received token from ${ssoProvider || 'unknown provider'}`);
      // Save the token
      setToken(ssoToken);
      // Clean up URL by redirecting to home without query params
      window.history.replaceState({}, document.title, '/');
      // Force reload to show authenticated state
      window.location.reload();
    }
  }, []);

  if (!isLoggedIn()) return <Login />;

  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", 
      padding: 0,
      minHeight: "100vh",
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
    }}>
      {/* Modern header with glassmorphism effect */}
      <div style={{
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        padding: "24px 32px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.1)"
      }}>
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div 
              role="img"
              aria-label="Platform Logo"
              style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
              }}>
              🎓
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: "28px", 
                fontWeight: "700",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px"
              }}>
                Teacher Evaluation Platform
              </h1>
              <p style={{ 
                margin: "4px 0 0", 
                color: "#6b7280", 
                fontSize: "14px" 
              }}>
                Comprehensive faculty assessment and analytics
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearToken();
              location.assign("/login");
            }}
            aria-label="Logout from application"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 20px rgba(239, 68, 68, 0.35)";
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.25)";
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            Logout
          </button>
        </div>
      </div>

      <div style={{ 
        padding: "32px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        <TeachersTable />
      </div>
    </div>
  );
}