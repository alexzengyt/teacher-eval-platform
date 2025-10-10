// frontend/src/components/SyncRosterButton.jsx
import React, { useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js"; // path: components -> lib

// Read JWT payload from localStorage without hard-coding the key
function readJwtPayload() {
  for (const [, v] of Object.entries(localStorage)) {
    if (typeof v === "string" && v.split(".").length === 3) {
      try {
        return JSON.parse(atob(v.split(".")[1]));
      } catch { /* ignore */ }
    }
  }
  return null;
}

export default function SyncRosterButton() {
  const payload = useMemo(() => readJwtPayload(), []);
  const isAdmin = payload?.role === "admin";
  const [loading, setLoading] = useState(false);

  // Hide the button for non-admins (backend still enforces admin anyway)
  if (!isAdmin) return null;

  // Click handler: call gateway -> data-integration-service
  async function onClick() {
    setLoading(true);
    try {
      // POST /api/integration/sync (goes through gateway)
      const res = await apiFetch("/api/integration/sync", { method: "POST" });

      // Show a simple result message
      const c = res?.counters || {};
      alert(
        `Sync ok.\n` +
        `teachers: ${c.teachersUpserts ?? 0}, ` +
        `classes: ${c.classesUpserts ?? 0}, ` +
        `enrollments: ${c.enrollmentsUpserts ?? 0}`
      );
    } catch (err) {
      // Basic error display
      alert(`Sync failed: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ padding: "6px 10px", marginLeft: 8 }}
      title="Pull roster from Schoolday (mock) and upsert into DB"
    >
      {loading ? "Syncing..." : "Sync Roster"}
    </button>
  );
}
