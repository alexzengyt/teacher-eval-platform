import React, { useMemo, useState, useEffect } from "react";
import { apiFetch } from "../lib/api.js"; 

// Read JWT payload from localStorage 
function readJwtPayload() {
  for (const [, v] of Object.entries(localStorage)) {
    if (typeof v === "string" && v.split(".").length === 3) {
      try { return JSON.parse(atob(v.split(".")[1])); } catch {}
    }
  }
  return null;
}

export default function SyncRosterButton() {
  const payload = useMemo(() => readJwtPayload(), []);
  const isAdmin = payload?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  if (!isAdmin) return null;

  async function refreshStatus() {
    try {
      const s = await apiFetch("/api/integration/sync/status");
      if (!s || s.status === "none") {
        setStatusText("Last: none");
        return;
      }
      const sum = s.summary_json || {};
      setStatusText(
        `Last: ${s.status} • t:${sum.teachersUpserts ?? 0} c:${sum.classesUpserts ?? 0} e:${sum.enrollmentsUpserts ?? 0}`
      );
    } catch {
      setStatusText("Last: unknown");
    }
  }

  useEffect(() => { refreshStatus(); }, []);

  async function onClick() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/integration/sync", { method: "POST" });
      const c = res?.counters || {};
      alert(`Sync ok.\nteachers: ${c.teachersUpserts ?? 0}, classes: ${c.classesUpserts ?? 0}, enrollments: ${c.enrollmentsUpserts ?? 0}`);
      await refreshStatus();
    } catch (err) {
      alert(`Sync failed: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{ 
          padding: "10px 20px",
          background: loading ? "#9ca3af" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
          }
        }}
        onMouseOut={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }}
        title="Pull roster from Schoolday (mock) and upsert into DB"
      >
        {loading ? (
          <>
            <div style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderTop: "2px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            Syncing...
          </>
        ) : (
          <>
            🔄 Sync Roster
          </>
        )}
      </button>
      <div style={{ 
        fontSize: "12px", 
        color: "#6b7280",
        background: "#f3f4f6",
        padding: "4px 8px",
        borderRadius: "4px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
      }}>
        {statusText}
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
  );
}
