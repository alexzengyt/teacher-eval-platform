import React from "react";
import Login from "./Login.jsx";
import { isLoggedIn, clearToken } from "./lib/token.js";
import TeachersTable from "./components/TeachersTable.jsx";

export default function App() {
  if (!isLoggedIn()) return <Login />;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Teacher Evaluation — Demo</h2>
        <button
          onClick={() => {
            clearToken();
            location.assign("/login");
          }}
        >
          Logout
        </button>
      </div>

      <TeachersTable />
    </div>
  );
}