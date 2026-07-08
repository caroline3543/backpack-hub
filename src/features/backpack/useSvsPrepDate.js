// ─── useSvsPrepDate.js ────────────────────────────────────────────────────────
// Tiny localStorage-backed hook for the user-editable "SvS Prep" target date
// shown on the Backpack summary card.

import { useState, useCallback } from "react";

const LS_KEY = "backpack-hub-svs-prep-date";

export function useSvsPrepDate() {
  const [date, setDateState] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || null; } catch { return null; }
  });

  const setDate = useCallback((value) => {
    setDateState(value || null);
    try {
      if (value) localStorage.setItem(LS_KEY, value);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  return [date, setDate];
}
