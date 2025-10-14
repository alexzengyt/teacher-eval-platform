// src/components/EmptyState.jsx
import React from "react";

export default function EmptyState({ 
  icon = "📭", 
  title = "No data found", 
  description = "Try adjusting your search or filters",
  action = null 
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      textAlign: "center"
    }}>
      <div style={{
        fontSize: "64px",
        marginBottom: "20px",
        opacity: 0.6,
        animation: "float 3s ease-in-out infinite"
      }}>
        {icon}
      </div>
      <h3 style={{
        margin: "0 0 12px",
        fontSize: "20px",
        fontWeight: "600",
        color: "#1f2937"
      }}>
        {title}
      </h3>
      <p style={{
        margin: "0 0 24px",
        fontSize: "16px",
        color: "#6b7280",
        maxWidth: "400px"
      }}>
        {description}
      </p>
      {action && action}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  );
}

