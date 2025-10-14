// frontend/src/components/TeachersTable.jsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import SyncRosterButton from "./SyncRosterButton";
import WebhookSubscribeButton from "./WebhookSubscribeButton";
import { getToken, clearToken } from "../lib/token";

/**
 * TeachersTable
 * - Fetches teachers through the gateway:
 *   GET  {API_BASE}/api/eval/teachers?q=<q>&page=<page>&page_size=<pageSize>
 * - Renders a simple table with search + pagination.
 */
export default function TeachersTable() {
  // ---------- UI states ----------
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);        // 1-based
  const [pageSize, setPageSize] = useState(5); // default 5 per page

  // Search states: `pendingQ` is the input box, `q` is the committed query
  const [pendingQ, setPendingQ] = useState("");
  const [q, setQ] = useState("");

  // NEW: filter to show only roster-originated teachers
  const [fromRosterOnly, setFromRosterOnly] = useState(false);

  // Where to call API (from gateway)
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

  // --- Add form states ---
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  // --- Edit & Delete states ---
  const [editingId, setEditingId]   = useState(null);
  const [editName, setEditName]     = useState("");
  const [editEmail, setEditEmail]   = useState("");
  const [saving, setSaving]         = useState(false);   // for PATCH
  const [deletingId, setDeletingId] = useState(null);    // for DELETE feedback
  const [actionErr, setActionErr]   = useState("");

  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // ---------- Fetch function ----------
  async function fetchPage({
    pageArg = page,
    pageSizeArg = pageSize,
    qArg = q,
    fromRosterArg = fromRosterOnly,  // NEW: allow explicit value
  } = {}) {    // 1 Build query string safely
    const params = new URLSearchParams();
    if (qArg) params.set("q", qArg);
    params.set("page", String(pageArg));
    params.set("pageSize", String(pageSizeArg));
    if (fromRosterArg) params.set("fromRoster", "true");

    setLoading(true);
    setErr(null);

    try {
      // 2 Use apiFetch so JWT token will be automatically attached
      const data = await apiFetch(`/api/eval/teachers?${params.toString()}`);

      // 3 Update table data (prefer `items`, fallback to legacy `data`)
      const rows = Array.isArray(data.items) ? data.items : (data.data || []);
      setRows(rows);
      // Prefer server-provided total; fallback to rows length
      setTotal(Number(data.total) || rows.length || 0);
    } catch (e) {
      // 4 Handle API or network errors
      setErr(e.message || "Network or auth error");
    } finally {
      // 5 Always stop the loading state
      setLoading(false);
    }
  }

  // Helper: simple email validation
  function isEmail(x) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
  }

  /**
   * Submit handler for Add Teacher form.
   * - Validates inputs
   * - POST /api/eval/teachers (through gateway)
   * - On success: clear inputs, reset to page 1, and reload
   */
  async function handleAddTeacher(e) {
    e.preventDefault();

    const name = newName.trim();
    const email = newEmail.trim();

    if (!name || !email) {
      setAddErr("Name and email are required.");
      return;
    }
    if (!isEmail(email)) {
      setAddErr("Please enter a valid email address.");
      return;
    }

    try {
      setAdding(true);
      setAddErr("");

      // Use apiFetch so JWT is attached automatically
      const json = await apiFetch(`/api/eval/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!json?.ok) {
        throw new Error(json?.error || "Request failed");
      }

      // clear inputs
      setNewName("");
      setNewEmail("");

      setPage(1);
      await fetchPage({ pageArg: 1, pageSizeArg: pageSize, qArg: q, fromRosterArg: fromRosterOnly });
    } catch (err) {
      setAddErr(err.message || "Add failed");
    } finally {
      setAdding(false);
    }
  }

  // ---------- Initial load + reload when page/pageSize/q changes ----------
  useEffect(() => {
    fetchPage({ pageArg: page, pageSizeArg: pageSize, qArg: q, fromRosterArg: fromRosterOnly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q, fromRosterOnly]);

  // ---------- Handlers ----------
  function onSearchSubmit(e) {
    e.preventDefault();
    // Commit the input into `q`, and reset to page 1
    setPage(1);
    setQ(pendingQ.trim());
  }

  function gotoPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function gotoNext() {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    setPage((p) => Math.min(maxPage, p + 1));
  }

  // Derived values
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = rows.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const showingTo   = rows.length > 0 ? (page - 1) * pageSize + rows.length : 0;

  // ---------- Render ----------
  if (loading) return <div style={{ padding: 12 }}>Loading teachers…</div>;
  if (err) return <div style={{ padding: 12, color: "crimson" }}>Error: {err}</div>;

  function beginEdit(row) {
    setEditingId(row.id);
    const displayName =
      (row.name && row.name.trim()) ||
      `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
    setEditName(displayName);
    setEditEmail(row.email ?? "");
    setActionErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setActionErr("");
  }

  async function saveEdit() {
    if (!editName.trim() && !editEmail.trim()) {
      setActionErr("Nothing to update.");
      return;
    }
    if (editEmail && !isEmail(editEmail)) {
      setActionErr("Email format is invalid.");
      return;
    }

    try {
      setSaving(true);
      setActionErr("");

      const payload = {};
      if (editName && editName.trim()) {
        const parts = editName.trim().split(/\s+/);
        payload.firstName = parts[0] || "";
        payload.lastName = parts.slice(1).join(" ") || ""; 
      }
      if (editEmail && editEmail.trim()) {
        payload.email = editEmail.trim();
      }

      console.log("PATCH payload I am sending:", payload); 

      const json = await apiFetch(`/api/eval/teachers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!json.ok) {
        setActionErr(json.error || "Update failed");
        return;
      }

      // Refresh list from server so the UI reflects updated name/email
      await fetchPage({ pageArg: page, pageSizeArg: pageSize, qArg: q, fromRosterArg: fromRosterOnly });
      cancelEdit();
    } catch (e) {
      setActionErr(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this teacher?")) return;
    try {
      setDeletingId(id);
      setActionErr("");
      const json = await apiFetch(`/api/eval/teachers/${id}`, { method: "DELETE" });
      if (!json.ok) {
        setActionErr(json.error || "Delete failed");
        return;
      }
      await fetchPage({ pageArg: page, pageSizeArg: pageSize, qArg: q, fromRosterArg: fromRosterOnly });

    } catch (e) {
      setActionErr(e.message || "Network error");
    } finally {
      setDeletingId(null);
    }
  }

  // Load summary counts (uses apiFetch so Authorization header is included)
  async function loadReport() {
    try {
      setLoadingReport(true);
      const json = await apiFetch("/api/eval/reports/summary");
      if (json.ok) setReport(json);
    } catch (e) {
      console.error("loadReport failed:", e);
    } finally {
      setLoadingReport(false);
    }
  }

  // Load dashboard data
  async function loadDashboard() {
    try {
      setLoadingDashboard(true);
      const json = await apiFetch("/api/eval/analytics/dashboard");
      if (json.stats) {
        setDashboardData(json);
        setShowDashboard(true);
      }
    } catch (e) {
      console.error("loadDashboard failed:", e);
    } finally {
      setLoadingDashboard(false);
    }
  }

  // Download CSV (send token in header + query; use API_BASE so it hits 8080)
  async function downloadCsv() {
    try {
      // 1) read token from localStorage
      const token = getToken() || "";

      // 2) build URL with query fallback: ?authorization=Bearer%20<token>
      const url = `${API_BASE}/api/eval/reports/teachers.csv`;

      // 3) fire the request; keep Authorization header as the primary path
      const resp = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401) {
        alert("Your session has expired. Please log in again.");
        clearToken();
        window.location.replace("/login"); // simple redirect
        return;
      }

      // 4) handle non-200
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.error("[CSV] failed", resp.status, body);
        alert(`CSV download failed (${resp.status})`);
        return;
      }

      // 5) download the blob as teachers.csv
      const blob = await resp.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = "teachers.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error("downloadCsv error:", e);
      alert("Download error");
    }
  }

  // Download a PDF version of the teachers report
  async function downloadPdf() {
    const token = getToken() || "";
    const url = `${API_BASE}/api/eval/reports/teachers.pdf`;

    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      // handle auth expiry the same way as CSV
      if (resp.status === 401) {
        alert("Your session has expired. Please log in again.");
        clearToken?.(); // if you already import clearToken, this will run; otherwise it's a no-op
        window.location.replace("/login");
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`PDF download failed: ${resp.status} ${text}`);
      }

      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "teachers.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Please try again.");
    }
  }
  
  // Open the demo overview page for a given teacher id
  const openOverview = (teacher) => {
    // Some data rows use id, some use teacher_id — support both
    const id = teacher.id ?? teacher.teacher_id;
    if (!id) {
      console.error("Missing teacher id for overview:", teacher);
      return;
    }

    // Get token from localStorage
    const token = getToken();
    if (!token) {
      alert("Please login first to view teacher overview.");
      return;
    }

    // Use gateway origin so it hits nginx (NOT the Vite dev server)
    const GATEWAY_ORIGIN = import.meta.env.VITE_GATEWAY_ORIGIN ?? "http://localhost:8080";
    const url = `${GATEWAY_ORIGIN}/demo/overview.html?teacher_id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div style={{ padding: 0 }}>
      {/* Header + Sync button */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: "24px",
        background: "white",
        padding: "20px 24px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: "24px", 
            fontWeight: "700",
            color: "#1f2937"
          }}>
            Faculty Management
          </h2>
          <p style={{ 
            margin: "4px 0 0", 
            color: "#6b7280", 
            fontSize: "14px" 
          }}>
            Manage teacher profiles and evaluation data
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <SyncRosterButton />  {/* admin-only UI */}
          <WebhookSubscribeButton />  {/* admin-only UI */}
        </div>
      </div>

      {/* ------- Reports Panel ------- */}
      <div style={{ 
        margin: "0 0 24px", 
        padding: "20px 24px", 
        background: "white",
        borderRadius: "12px", 
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ 
          margin: "0 0 16px", 
          fontSize: "18px", 
          fontWeight: "600",
          color: "#1f2937"
        }}>
          Analytics & Reports
        </h3>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
          <button 
            onClick={loadDashboard} 
            disabled={loadingDashboard}
            style={{
              background: loadingDashboard ? "#9ca3af" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loadingDashboard ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {loadingDashboard ? "Loading..." : "📊 Analytics Dashboard"}
          </button>
          <button 
            onClick={downloadCsv}
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📄 Download CSV
          </button>
          <button 
            onClick={downloadPdf}
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📋 Download PDF
          </button>
        </div>

        {showDashboard && dashboardData && (
          <div style={{ 
            background: "#f8fafc",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}>
            {/* Statistics Cards */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "20px",
              marginBottom: "24px"
            }}>
              <div style={{ 
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937" }}>{dashboardData.stats.totalTeachers}</div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Total Teachers</div>
              </div>
              <div style={{ 
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#3b82f6" }}>{dashboardData.stats.totalEvaluations}</div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Total Evaluations</div>
              </div>
              <div style={{ 
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#10b981" }}>{dashboardData.stats.averageScore.toFixed(2)}</div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Average Score</div>
              </div>
              <div style={{ 
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#f59e0b" }}>{dashboardData.stats.evaluationsThisYear}</div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>This Year</div>
              </div>
            </div>

            {/* Score Distribution */}
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 16px", color: "#1f2937", fontSize: "16px" }}>Score Distribution</h4>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
                gap: "12px"
              }}>
                {dashboardData.scoreDistribution.map((item, index) => (
                  <div key={index} style={{ 
                    background: "white",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                  }}>
                    <div style={{ 
                      fontSize: "20px", 
                      fontWeight: "700", 
                      color: ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"][index] || "#6b7280"
                    }}>
                      {item.count}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{item.range}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div>
              <h4 style={{ margin: "0 0 16px", color: "#1f2937", fontSize: "16px" }}>🏆 Top Performers</h4>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "12px"
              }}>
                {dashboardData.topPerformers.map((performer, index) => (
                  <div key={index} style={{ 
                    background: "white",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>
                        {index + 1}. {performer.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {performer.evaluationCount} evaluations
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "18px", 
                      fontWeight: "700", 
                      color: "#3b82f6" 
                    }}>
                      {performer.averageScore.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close button */}
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button
                onClick={() => setShowDashboard(false)}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                ✕ Close Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search + page size controls */}
      <div style={{
        background: "white",
        padding: "20px 24px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        marginBottom: "24px"
      }}>
        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1", minWidth: "300px" }}>
            <input
              placeholder="🔍 Search by name or email…"
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
              style={{ 
                padding: "10px 16px", 
                minWidth: "260px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
            <button 
              type="submit" 
              style={{ 
                padding: "10px 20px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Search
            </button>
            <button 
              type="button" 
              onClick={() => { setPendingQ(""); setQ(""); setPage(1); }} 
              style={{ 
                padding: "10px 16px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Clear
            </button>
          </div>

          {/* Roster only toggle */}
          <label style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "8px", 
            padding: "8px 12px",
            background: fromRosterOnly ? "#dbeafe" : "#f3f4f6",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s ease"
          }}>
            <input
              type="checkbox"
              checked={fromRosterOnly}
              onChange={(e) => {
                const next = e.target.checked;
                setFromRosterOnly(next);
                setPage(1);
                fetchPage({ pageArg: 1, pageSizeArg: pageSize, qArg: q, fromRosterArg: next });
              }}
              style={{ margin: 0 }}
            />
            <span style={{ fontSize: "14px", fontWeight: "500", color: fromRosterOnly ? "#1d4ed8" : "#6b7280" }}>
              Roster Only
            </span>
          </label>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label htmlFor="pageSize" style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Per page:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                setPage(1);
                setPageSize(newSize);
                fetchPage({ pageArg: 1, pageSizeArg: newSize, qArg: q, fromRosterArg: fromRosterOnly });
              }}
              style={{ 
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white"
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </form>
      </div>

      {/* Add Teacher form */}
      <div style={{
        background: "white",
        padding: "20px 24px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        marginBottom: "24px"
      }}>
        <h3 style={{ 
          margin: "0 0 16px", 
          fontSize: "18px", 
          fontWeight: "600",
          color: "#1f2937"
        }}>
          Add New Teacher
        </h3>
        <form
          onSubmit={handleAddTeacher}
          style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}
        >
          <input
            placeholder="👤 Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ 
              padding: "10px 16px", 
              minWidth: "200px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s ease"
            }}
            disabled={adding}
            onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
          />
          <input
            placeholder="📧 Email Address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ 
              padding: "10px 16px", 
              minWidth: "240px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s ease"
            }}
            disabled={adding}
            onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
          />
          <button 
            type="submit" 
            disabled={adding} 
            style={{ 
              padding: "10px 20px",
              background: adding ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: adding ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {adding ? "Adding..." : "➕ Add Teacher"}
          </button>
          {addErr ? (
            <div style={{ 
              color: "#ef4444", 
              fontSize: "14px",
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #fecaca"
            }}>
              {addErr}
            </div>
          ) : null}
        </form>
      </div>

      {/* Summary + pagination */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "16px",
        background: "white",
        padding: "16px 24px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ color: "#6b7280", fontSize: "14px" }}>
          <span style={{ fontWeight: "600", color: "#1f2937" }}>{total}</span> total teachers &nbsp;|&nbsp; 
          Showing <span style={{ fontWeight: "600", color: "#1f2937" }}>{showingFrom}-{showingTo}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button 
            onClick={gotoPrev} 
            disabled={page <= 1}
            style={{
              padding: "8px 16px",
              background: page <= 1 ? "#f3f4f6" : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
              color: page <= 1 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            ← Prev
          </button>
          <div style={{ 
            padding: "8px 16px",
            background: "#f8fafc",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151"
          }}>
            Page <span style={{ fontWeight: "700" }}>{page}</span> of {maxPage}
          </div>
          <button 
            onClick={gotoNext} 
            disabled={page >= maxPage}
            style={{
              padding: "8px 16px",
              background: page >= maxPage ? "#f3f4f6" : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
              color: page >= maxPage ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: page >= maxPage ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Data table */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={{...th, padding: "16px 24px", fontSize: "14px", fontWeight: "600", color: "#374151", textAlign: "left"}}>ID</th>
              <th style={{...th, padding: "16px 24px", fontSize: "14px", fontWeight: "600", color: "#374151", textAlign: "left"}}>Name</th>
              <th style={{...th, padding: "16px 24px", fontSize: "14px", fontWeight: "600", color: "#374151", textAlign: "left"}}>Email</th>
              <th style={{...th, padding: "16px 24px", fontSize: "14px", fontWeight: "600", color: "#374151", textAlign: "left"}}>Actions</th>
              <th style={{...th, padding: "16px 24px", fontSize: "14px", fontWeight: "600", color: "#374151", textAlign: "left"}}>Overview</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ 
                  padding: "40px 24px", 
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "16px"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
                  <div>No teachers found</div>
                  <div style={{ fontSize: "14px", marginTop: "8px" }}>
                    Try adjusting your search criteria or add a new teacher
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((t, index) => (
                <tr 
                  key={t.id}
                  style={{ 
                    borderBottom: index === rows.length - 1 ? "none" : "1px solid #e5e7eb",
                    background: index % 2 === 0 ? "white" : "#f9fafb"
                  }}
                >
                  {/* ID */}
                  <td style={{
                    ...tdMono, 
                    padding: "16px 24px",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                  }}>
                    {t.id.substring(0, 8)}...
                  </td>

                  {/* Name */}
                  <td style={{...td, padding: "16px 24px"}}>
                    {editingId === t.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ 
                          padding: "8px 12px", 
                          minWidth: "220px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        disabled={saving}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          {((t.name && t.name.trim()) || `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim()).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "500", color: "#1f2937" }}>
                            {((t.name && t.name.trim()) || `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim())}
                          </div>
                          {t.fromRoster && (
                            <div style={{ 
                              fontSize: "12px", 
                              color: "#059669",
                              background: "#d1fae5",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              display: "inline-block"
                            }}>
                              From Roster
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Email */}
                  <td style={{...td, padding: "16px 24px"}}>
                    {editingId === t.id ? (
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        style={{ 
                          padding: "8px 12px", 
                          minWidth: "260px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                        disabled={saving}
                      />
                    ) : (
                      <div style={{ color: "#374151", fontSize: "14px" }}>
                        {t.email}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{...td, padding: "16px 24px"}}>
                    {editingId === t.id ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          style={{ 
                            padding: "6px 12px",
                            background: saving ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: saving ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {saving ? "Saving..." : "✓ Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          style={{ 
                            padding: "6px 12px",
                            background: "#6b7280",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => beginEdit(t)}
                          style={{ 
                            padding: "6px 12px",
                            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          style={{ 
                            padding: "6px 12px",
                            background: deletingId === t.id ? "#9ca3af" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: deletingId === t.id ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {deletingId === t.id ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Overview column */}
                  <td style={{...td, padding: "16px 24px"}}>
                    <button
                      onClick={() => openOverview(t)}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                      }}
                      title="Open detailed overview"
                    >
                      📊 Overview
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- tiny inline styles for the table ---
const th = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" };
const td = { borderBottom: "1px solid #eee", padding: "8px 6px" };
const tdMono = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" };