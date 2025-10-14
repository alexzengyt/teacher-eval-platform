// src/components/LoadingSpinner.jsx
import React from "react";

export default function LoadingSpinner({ size = "medium", text = "Loading..." }) {
  const sizes = {
    small: { spinner: 20, text: 14 },
    medium: { spinner: 40, text: 16 },
    large: { spinner: 60, text: 18 }
  };

  const config = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      padding: "40px",
      minHeight: "200px"
    }}>
      <div style={{
        width: `${config.spinner}px`,
        height: `${config.spinner}px`,
        border: `${Math.max(2, config.spinner / 10)}px solid rgba(99, 102, 241, 0.1)`,
        borderTop: `${Math.max(2, config.spinner / 10)}px solid #6366f1`,
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      {text && (
        <p style={{
          margin: 0,
          color: "#6b7280",
          fontSize: `${config.text}px`,
          fontWeight: "500"
        }}>
          {text}
        </p>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

