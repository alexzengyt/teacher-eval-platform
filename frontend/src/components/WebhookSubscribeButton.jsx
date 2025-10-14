// frontend/src/components/WebhookSubscribeButton.jsx
import React, { useState } from "react";
import { apiFetch } from "../lib/api.js";

/**
 * WebhookSubscribeButton
 * - Admin-only button to subscribe to Schoolday webhooks
 * - Triggers POST /api/integration/webhooks/subscribe
 */
export default function WebhookSubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const result = await apiFetch("/api/integration/webhooks/subscribe", {
        method: "POST",
      });
      
      setStatus({
        type: "success",
        message: result.message || "Successfully subscribed to Schoolday webhooks",
        subscription: result.subscription
      });
      
      console.log("[Webhook] Subscription successful:", result);
    } catch (err) {
      setError(err.message || "Failed to subscribe to webhooks");
      console.error("[Webhook] Subscription error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        style={{
          background: loading ? "#9ca3af" : "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
          }
        }}
        onMouseOut={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }}
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
            Subscribing...
          </>
        ) : (
          <>
            🔔 Subscribe to Webhooks
          </>
        )}
      </button>

      {/* Status Messages */}
      {status && (
        <div style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
          color: "#166534",
          fontSize: "14px"
        }}>
          <div style={{ fontWeight: "600", marginBottom: "4px" }}>✅ {status.message}</div>
          {status.subscription && (
            <div style={{ fontSize: "12px", color: "#15803d", marginTop: "4px" }}>
              Subscription ID: {status.subscription.id}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          fontSize: "14px"
        }}>
          ❌ {error}
        </div>
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

