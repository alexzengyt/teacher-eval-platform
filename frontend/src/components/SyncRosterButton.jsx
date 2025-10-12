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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{ padding: "6px 10px" }}
        title="Pull roster from Schoolday (mock) and upsert into DB"
      >
        {loading ? "Syncing..." : "Sync Roster"}
      </button>
      <small style={{ opacity: 0.7 }}>{statusText}</small>
    </span>
  );
}
