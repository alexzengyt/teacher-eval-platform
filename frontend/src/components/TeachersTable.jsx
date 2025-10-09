import React from "react";
import { useEffect, useState } from "react";

/** Fetch and render teachers from gateway */
export default function TeachersTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const r = await fetch("http://localhost:8080/api/eval/teachers");
        const json = await r.json();
        if (!cancelled) {
          if (json.ok) setRows(json.data || []);
          else setErr(json.error || "Unknown error");
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div>Loading teachers…</div>;
  if (err) return <div style={{ color: "crimson" }}>Error: {err}</div>;
  if (!rows.length) return <div>No teachers found.</div>;

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ marginBottom: 8 }}>Teachers</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.name}</td>
              <td style={td}>{r.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px" };
const td = { borderBottom: "1px solid #f0f0f0", padding: "8px" };
