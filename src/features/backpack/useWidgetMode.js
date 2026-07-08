// ─── useWidgetMode.js ─────────────────────────────────────────────────────────
// Persists which display mode a dashboard widget is showing (e.g. "percent"
// vs "quantity"), so the user's chosen view sticks around between visits.

import { useState, useCallback } from "react";

const PREFIX = "backpack-hub-widget-mode-";

export function useWidgetMode(key, defaultMode) {
  const storageKey = PREFIX + key;
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(storageKey) || defaultMode; } catch { return defaultMode; }
  });

  const cycle = useCallback((options) => {
    setModeState(prev => {
      const idx = options.indexOf(prev);
      const next = options[(idx + 1) % options.length];
      try { localStorage.setItem(storageKey, next); } catch {}
      return next;
    });
  }, [storageKey]);

  return [mode, cycle];
}
