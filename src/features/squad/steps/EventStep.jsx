// ─── EventStep.jsx ────────────────────────────────────────────────────────────

import { card, heading, kicker, buttonSecondary } from "../squadStyles.js";

const EVENTS = [
  {
    id: "crazyJoe",
    title: "Crazy Joe",
    description: "Distribute your Infantry and Lancers across your available marches. Marksmen are normally left in your city.",
  },
  {
    id: "bearTrap",
    title: "Bear Trap",
    description: "Build damage-focused formations using your preferred troop ratios or exact troop amounts.",
  },
];

export default function EventStep({ onSelect, onBack }) {
  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>What are you preparing for?</div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
        Pick an event — you can always come back and change your troops later.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {EVENTS.map(ev => (
          <button
            key={ev.id}
            onClick={() => onSelect(ev.id)}
            style={{
              ...card, textAlign: "left", cursor: "pointer", border: "1px solid rgba(74,92,80,0.14)",
              font: "inherit", minHeight: 44,
            }}
          >
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 600, color: "#24312c", marginBottom: 4 }}>
              {ev.title}
            </div>
            <div style={{ fontSize: 13, color: "#6f7a73", lineHeight: 1.5 }}>
              {ev.description}
            </div>
          </button>
        ))}
      </div>

      <button onClick={onBack} style={buttonSecondary}>Back</button>
    </div>
  );
}
