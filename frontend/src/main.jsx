import React from "react";
import ReactDOM from "react-dom/client";
import TeachersTable from "./components/TeachersTable.jsx"; // <- our table

function App() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <p style={{ color: "teal" }}>MARKER: main.jsx LIVE</p>
      <h1>Teacher Evaluation — Demo</h1>
      <hr style={{ margin: "16px 0" }} />
      <h2>Teachers</h2>
      <TeachersTable />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
