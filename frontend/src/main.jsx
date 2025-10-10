// frontend/src/main.jsx
// Minimal app shell that renders the Teachers table only.
// Removes health debug and console noise.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
