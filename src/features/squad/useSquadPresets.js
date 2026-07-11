// ─── useSquadPresets.js ───────────────────────────────────────────────────────
// Saved Squad Calculator presets: event, march setup, ratios/strategy, buffs,
// Cyrille levels. Deliberately never stores troop inventory — that changes
// too often to be worth saving, per the spec.

import { useState, useCallback } from "react";

const LS_KEY = "backpack-hub-squad-presets-v1";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(presets) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(presets)); } catch {}
}

export function useSquadPresets() {
  const [presets, setPresets] = useState(load);

  const savePreset = useCallback((preset) => {
    const withId = { ...preset, id: preset.id || `preset-${Date.now()}` };
    setPresets(prev => {
      const next = [...prev.filter(p => p.id !== withId.id), withId];
      persist(next);
      return next;
    });
    return withId.id;
  }, []);

  const deletePreset = useCallback((id) => {
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}
