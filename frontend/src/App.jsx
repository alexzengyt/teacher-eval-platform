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
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        padding: "20px 24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          }}
        >
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: "28px", 
              fontWeight: "700",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Teacher Evaluation Platform
            </h1>
            <p style={{ 
              margin: "4px 0 0", 
              color: "#6b7280", 
              fontSize: "14px" 
            }}>
              Comprehensive faculty evaluation and management system
            </p>
          </div>
          <button
            onClick={() => {
              clearToken();
              location.assign("/login");
            }}
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        <TeachersTable />
      </div>
    </div>
  );
}