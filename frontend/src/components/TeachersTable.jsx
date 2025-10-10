// frontend/src/components/TeachersTable.jsx
import React, { useEffect, useState } from "react";

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

  // ---------- Fetch function ----------
  async function fetchPage({ pageArg = page, pageSizeArg = pageSize, qArg = q } = {}) {
    // Build query string safely
    const params = new URLSearchParams();
    if (qArg) params.set("q", qArg);
    params.set("page", String(pageArg));
    params.set("page_size", String(pageSizeArg));

    const url = `${API_BASE}/api/eval/teachers?${params.toString()}`;

    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(url);
      const json = await r.json();
      if (json.ok) {
        setRows(json.data || []);
        setTotal(json.total || 0);
      } else {
        setErr(json.error || "Unknown error");
      }
    } catch (e) {
      setErr(e.message || "Network error");
    } finally {
      setLoading(false);
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

  return (
    <div style={{ padding: 12 }}>
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
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: 10, textAlign: "center", color: "#888" }}>
                No teachers found.
              </td>
            </tr>
          ) : rows.map((t) => (
            <tr key={t.id}>
              <td style={tdMono}>{t.id}</td>
              <td style={td}>{t.name}</td>
              <td style={td}>{t.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- tiny inline styles for the table ---
const th = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" };
const td = { borderBottom: "1px solid #eee", padding: "8px 6px" };
const tdMono = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" };
