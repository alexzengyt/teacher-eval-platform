import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

function App() {
  // Keep state for health results
  const [auth, setAuth] = useState(null);
  const [evalHealth, setEvalHealth] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
  console.log("API base is:", API_BASE);

  useEffect(() => {
    // Call auth-service through gateway
    fetch(`${API_BASE}/api/auth/health`)
      .then(r => r.json())
      .then(setAuth)
      .catch(console.error);

    // Call evaluation-service through gateway
    fetch(`${API_BASE}/api/eval/health`)
      .then(r => r.json())
      .then(setEvalHealth)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Hello from Frontend 👋</h1>
      <pre>// auth-service: {JSON.stringify(auth, null, 2)}</pre>
      <pre>// evaluation-service: {JSON.stringify(evalHealth, null, 2)}</pre>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
