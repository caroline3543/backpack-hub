// ─── Celebration.jsx ──────────────────────────────────────────────────────────
// Minimal toast system: a simple message + auto-dismiss, with a "celebrate"
// variant that gets slightly more festive styling. No external deps.

import { useState, useCallback, useRef } from "react";

export function useCelebration() {
  const [toast, setToast]         = useState(null);
  const [toastType, setToastType] = useState("default"); // default | celebrate | warn
  const timerRef = useRef(null);

  const fire = useCallback((message, type = "default", duration = 2400) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(message);
    setToastType(type);
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const showToast = useCallback((message) => fire(message, "default"), [fire]);
  const celebrate  = useCallback((message) => fire(message, "celebrate", 2800), [fire]);
  const warn       = useCallback((message) => fire(message, "warn", 3000), [fire]);

  return { toast, toastType, showToast, celebrate, warn };
}

export function Toast({ message, type = "default" }) {
  if (!message) return null;

  const palette = {
    default:   { bg: "#24312c", color: "#f6f1e8" },
    celebrate: { bg: "#5c7a6e", color: "#ffffff" },
    warn:      { bg: "#a06358", color: "#ffffff" },
  }[type] || { bg: "#24312c", color: "#f6f1e8" };

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        role="status"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 24,
          transform: "translateX(-50%)",
          background: palette.bg,
          color: palette.color,
          padding: "10px 20px",
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          zIndex: 999,
          whiteSpace: "nowrap",
          animation: "toastIn 0.25s ease both",
        }}
      >
        {message}
      </div>
    </>
  );
}
