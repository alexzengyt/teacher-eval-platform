// src/styles/theme.js
// Unified theme configuration for the entire application

export const colors = {
  // Primary gradient (purple-blue)
  primary: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    main: "#6366f1",
    light: "#818cf8",
    dark: "#4f46e5",
    rgba: (opacity) => `rgba(99, 102, 241, ${opacity})`
  },
  
  // Secondary colors
  secondary: {
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
    main: "#8b5cf6",
    light: "#a78bfa",
    dark: "#7c3aed"
  },
  
  // Success (green)
  success: {
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    main: "#10b981",
    light: "#34d399",
    dark: "#059669",
    rgba: (opacity) => `rgba(16, 185, 129, ${opacity})`
  },
  
  // Danger (red)
  danger: {
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    main: "#ef4444",
    light: "#f87171",
    dark: "#dc2626",
    rgba: (opacity) => `rgba(239, 68, 68, ${opacity})`
  },
  
  // Warning (amber)
  warning: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    main: "#f59e0b",
    light: "#fbbf24",
    dark: "#d97706",
    rgba: (opacity) => `rgba(245, 158, 11, ${opacity})`
  },
  
  // Neutral (gray)
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827"
  }
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  primary: "0 4px 12px rgba(99, 102, 241, 0.25)",
  primaryHover: "0 8px 20px rgba(99, 102, 241, 0.35)"
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px"
};

export const borderRadius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px"
};

export const typography = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "28px",
    "4xl": "32px"
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700"
  }
};

export const animations = {
  transition: {
    fast: "all 0.15s ease",
    base: "all 0.3s ease",
    slow: "all 0.5s ease"
  },
  keyframes: {
    spin: `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `,
    float: `
      @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -30px) scale(1.05); }
        66% { transform: translate(-20px, 20px) scale(0.95); }
      }
    `,
    fadeInUp: `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    pulse: `
      @keyframes pulse {
        0%, 100% { 
          transform: scale(1);
          box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
        }
        50% { 
          transform: scale(1.05);
          box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.5);
        }
      }
    `
  }
};

export default {
  colors,
  shadows,
  spacing,
  borderRadius,
  typography,
  animations
};

