// frontend/src/main.jsx
// Minimal app shell that renders the Teachers table only.
// Removes health debug and console noise.

import React from "react";
import ReactDOM from "react-dom/client";
import TeachersTable from "./components/TeachersTable.jsx";

function App() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Teacher Evaluation — Demo</h1>
      {/* Teachers data table (search + pagination) */}
      <TeachersTable />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
