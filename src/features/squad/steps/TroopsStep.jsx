// ─── TroopsStep.jsx ───────────────────────────────────────────────────────────
// Manual troop entry. Screenshot import (OCR) is intentionally not included
// in this phase — see the project handoff doc for why and how to add it.

import { useState } from "react";
import { parseTroopNumber, formatTroopNumber } from "../squadCalculations.js";
import { card, label, input, heading, kicker, buttonPrimary, TROOP_COLORS, TROOP_LABELS } from "../squadStyles.js";

function TroopInput({ type, value, onChange }) {
  const [raw, setRaw] = useState(value ? formatTroopNumber(value) : "");

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...label, color: TROOP_COLORS[type] }}>{TROOP_LABELS[type]}</label>
      <input
        style={input}
        type="text"
        inputMode="numeric"
        placeholder="e.g. 153,250 or 1.2M"
        value={raw}
        onChange={e => {
          setRaw(e.target.value);
          onChange(parseTroopNumber(e.target.value));
        }}
        onBlur={() => setRaw(value ? formatTroopNumber(value) : "")}
      />
    </div>
  );
}

export default function TroopsStep({ inventory, onChange, onContinue }) {
  const total = inventory.infantry + inventory.lancer + inventory.marksman;

  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>Add your troops</div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
        Enter how many of each troop type you currently have. You can use plain
        numbers, commas, or K/M/B shorthand (e.g. "1.2M").
      </p>

      <div style={{ ...card, marginBottom: 16 }}>
        <TroopInput type="infantry" value={inventory.infantry} onChange={v => onChange({ ...inventory, infantry: v })} />
        <TroopInput type="lancer" value={inventory.lancer} onChange={v => onChange({ ...inventory, lancer: v })} />
        <TroopInput type="marksman" value={inventory.marksman} onChange={v => onChange({ ...inventory, marksman: v })} />

        <div style={{ borderTop: "1px solid rgba(72,94,80,0.08)", paddingTop: 10, marginTop: 4,
          display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#6f7a73", fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(total)}</span>
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={total <= 0}
        style={{ ...buttonPrimary, opacity: total <= 0 ? 0.5 : 1, cursor: total <= 0 ? "default" : "pointer" }}
      >
        Continue
      </button>
    </div>
  );
}
