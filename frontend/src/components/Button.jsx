// src/components/Button.jsx
import React from "react";

export default function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary", // primary, secondary, success, danger, warning
  size = "medium", // small, medium, large
  fullWidth = false,
  icon = null,
  loading = false,
  ...props
}) {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      color: "white",
      shadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
      hoverShadow: "0 4px 12px rgba(99, 102, 241, 0.35)"
    },
    secondary: {
      background: "white",
      color: "#1f2937",
      border: "2px solid #e5e7eb",
      shadow: "none",
      hoverShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
    },
    success: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "white",
      shadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
      hoverShadow: "0 4px 12px rgba(16, 185, 129, 0.35)"
    },
    danger: {
      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      color: "white",
      shadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
      hoverShadow: "0 4px 12px rgba(239, 68, 68, 0.35)"
    },
    warning: {
      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      color: "white",
      shadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
      hoverShadow: "0 4px 12px rgba(245, 158, 11, 0.35)"
    }
  };

  const sizes = {
    small: { padding: "6px 12px", fontSize: "12px" },
    medium: { padding: "10px 18px", fontSize: "14px" },
    large: { padding: "14px 24px", fontSize: "16px" }
  };

  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.medium;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variantStyle,
        ...sizeStyle,
        width: fullWidth ? "100%" : "auto",
        border: variantStyle.border || "none",
        borderRadius: "8px",
        fontWeight: "600",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        boxShadow: disabled || loading ? "none" : variantStyle.shadow,
        transition: "all 0.3s ease",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontFamily: "inherit"
      }}
      onMouseOver={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = variantStyle.hoverShadow;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = variantStyle.shadow;
        }
      }}
      {...props}
    >
      {loading ? (
        <>
          <div style={{
            width: "16px",
            height: "16px",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderTop: "2px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          Loading...
        </>
      ) : (
        <>
          {icon && <span style={{ fontSize: "18px" }}>{icon}</span>}
          {children}
        </>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
}

