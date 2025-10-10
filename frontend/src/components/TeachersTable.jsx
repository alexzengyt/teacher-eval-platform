// frontend/src/components/TeachersTable.jsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import SyncRosterButton from "./SyncRosterButton";

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

  // ---------- Fetch function ----------
  async function fetchPage({ pageArg = page, pageSizeArg = pageSize, qArg = q } = {}) {
    // 1 Build query string safely
    const params = new URLSearchParams();
    if (qArg) params.set("q", qArg);
    params.set("page", String(pageArg));
    params.set("page_size", String(pageSizeArg));

    setLoading(true);
    setErr(null);

    try {
      // 2 Use apiFetch so JWT token will be automatically attached
      const data = await apiFetch(`/api/eval/teachers?${params.toString()}`);

      // 3 Update table data
      setRows(data.data || []);
      setTotal(data.total || 0);
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

      const r = await fetch(`${API_BASE}/api/eval/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) {
        throw new Error(json?.error || "Request failed");
      }

      // clear inputs
      setNewName("");
      setNewEmail("");

      setPage(1);
      await fetchPage({ pageArg: 1, pageSizeArg: pageSize, qArg: q });
    } catch (err) {
      setAddErr(err.message || "Add failed");
    } finally {
      setAdding(false);
    }
  }

  // ---------- Initial load + reload when page/pageSize/q changes ----------
  useEffect(() => {
    fetchPage({ pageArg: page, pageSizeArg: pageSize, qArg: q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

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
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(total, page * pageSize);

  // ---------- Render ----------
  if (loading) return <div style={{ padding: 12 }}>Loading teachers…</div>;
  if (err) return <div style={{ padding: 12, color: "crimson" }}>Error: {err}</div>;

  function beginEdit(row) {
  setEditingId(row.id);
  setEditName(row.name ?? "");
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
      const url = `${API_BASE}/api/eval/teachers/${editingId}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editName  ? { name:  editName.trim()  } : {}),
          ...(editEmail ? { email: editEmail.trim() } : {}),
        }),
      });
      const json = await r.json();
      if (!json.ok) {
        setActionErr(json.error || "Update failed");
        return;
      }
      await fetchPage(1, pageSize, q); 
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
      const url = `${API_BASE}/api/eval/teachers/${id}`;
      const r = await fetch(url, { method: "DELETE" });
      const json = await r.json();
      if (!json.ok) {
        setActionErr(json.error || "Delete failed");
        return;
      }
      await fetchPage(page, pageSize, q);
    } catch (e) {
      setActionErr(e.message || "Network error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Header + Sync button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Teachers</h2>
        <SyncRosterButton />  {/* admin-only UI */}
      </div>
      {/* Search + page size controls */}
      <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          placeholder="Search by name or email…"
          value={pendingQ}
          onChange={(e) => setPendingQ(e.target.value)}
          style={{ padding: "6px 10px", minWidth: 260 }}
        />
        <button type="submit" style={{ padding: "6px 12px" }}>Search</button>

        <button type="button" onClick={() => { setPendingQ(""); setQ(""); setPage(1); }} style={{ padding: "6px 12px" }}>Clear</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <label htmlFor="pageSize">Per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }}
            style={{ padding: "4px 6px" }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </form>

      {/* Add Teacher form */}
      <form
        onSubmit={handleAddTeacher}
        style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}
      >
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 8, minWidth: 200 }}
          disabled={adding}
        />
        <input
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ padding: 8, minWidth: 240 }}
          disabled={adding}
        />
        <button type="submit" disabled={adding} style={{ padding: "8px 12px" }}>
          {adding ? "Adding..." : "Add"}
        </button>
        {addErr ? (
          <span style={{ color: "crimson", marginLeft: 8 }}>{addErr}</span>
        ) : null}
      </form>

      {/* Summary + pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: "#666" }}>
          Total: <b>{total}</b> &nbsp;|&nbsp; Showing {showingFrom}-{showingTo}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={gotoPrev} disabled={page <= 1}>Prev</button>
          <div style={{ padding: "6px 10px" }}>Page <b>{page}</b> / {maxPage}</div>
          <button onClick={gotoNext} disabled={page >= maxPage}>Next</button>
        </div>
      </div>

      {/* Data table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: 10, textAlign: "center" }}>
                No teachers found.
              </td>
            </tr>
          ) : (
            rows.map((t) => (
              <tr key={t.id}>
                {/* ID */}
                <td style={tdMono}>{t.id}</td>

                {/* Name */}
                <td style={td}>
                  {editingId === t.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: 6, minWidth: 220 }}
                      disabled={saving}
                    />
                  ) : (
                    t.name
                  )}
                </td>

                {/* Email */}
                <td style={td}>
                  {editingId === t.id ? (
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ padding: 6, minWidth: 260 }}
                      disabled={saving}
                    />
                  ) : (
                    t.email
                  )}
                </td>

                {/* Actions */}
                <td style={td}>
                  {editingId === t.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        style={{ padding: "6px 10px", marginRight: 6 }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        style={{ padding: "6px 10px" }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => beginEdit(t)}
                        style={{ padding: "6px 10px", marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        style={{ padding: "6px 10px" }}
                      >
                        {deletingId === t.id ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- tiny inline styles for the table ---
const th = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" };
const td = { borderBottom: "1px solid #eee", padding: "8px 6px" };
const tdMono = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" };
