// ─── ResultsStep.jsx ──────────────────────────────────────────────────────────

import { useState } from "react";
import { formatTroopNumber, TROOP_TYPES } from "../squadCalculations.js";
import { card, heading, kicker, buttonPrimary, buttonSecondary, TROOP_COLORS, TROOP_LABELS } from "../squadStyles.js";

function formationsToText(event, formations) {
  const title = event === "crazyJoe" ? "Crazy Joe Formations" : "Bear Trap Formations";
  const lines = formations.map((f, i) =>
    `${f.name || `Squad ${i + 1}`}: ${formatTroopNumber(f.troops.infantry)} Infantry | ${formatTroopNumber(f.troops.lancer)} Lancer | ${formatTroopNumber(f.troops.marksman)} Marksman`
  );
  return [title, ...lines].join("\n");
}

async function copyText(text, onDone) {
  try {
    await navigator.clipboard.writeText(text);
    onDone("Copied!");
  } catch {
    onDone("Couldn't copy — select and copy manually.");
  }
}

function FormationCard({ formation }) {
  const total = TROOP_TYPES.reduce((s, t) => s + formation.troops[t], 0);
  const [copyMsg, setCopyMsg] = useState(null);

  return (
    <div style={{ ...card, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 600, color: "#24312c" }}>
          {formation.name}{formation.role !== "ordinary" ? ` (${formation.role === "rallyLeader" ? "Rally Leader" : "Bonus"})` : ""}
        </span>
        <span style={{ fontSize: 12, color: total >= formation.capacity ? "#5c7a6e" : "#9a7746", fontWeight: 700 }}>
          {formatTroopNumber(total)} / {formatTroopNumber(formation.capacity)}
        </span>
      </div>

      {!formation.isComplete && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a06358", marginBottom: 8,
          background: "rgba(160,99,88,0.08)", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}>
          Incomplete
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {TROOP_TYPES.map(t => (
          <div key={t} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: TROOP_COLORS[t], fontWeight: 600 }}>{TROOP_LABELS[t]}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(formation.troops[t])}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#9aa59e", marginBottom: 4 }}>
        Actual ratio: {TROOP_TYPES.map(t => Math.round((formation.actualRatio[t] || 0) * 100)).join(" / ")}
      </div>

      {formation.warnings?.map((w, i) => (
        <div key={i} style={{ fontSize: 11, color: "#a06358", marginTop: 4 }}>{w}</div>
      ))}

      <button
        onClick={() => copyText(
          `${formation.name}: ${formatTroopNumber(formation.troops.infantry)} Infantry | ${formatTroopNumber(formation.troops.lancer)} Lancer | ${formatTroopNumber(formation.troops.marksman)} Marksman`,
          setCopyMsg
        )}
        style={{ ...buttonSecondary, marginTop: 10, fontSize: 12, minHeight: 36 }}>
        {copyMsg || "Copy this formation"}
      </button>
    </div>
  );
}

export default function ResultsStep({ event, result, onEditSettings, onRecalculate, onStartOver, onSavePreset }) {
  const [copyAllMsg, setCopyAllMsg] = useState(null);
  const [presetName, setPresetName] = useState("");
  const [showSave, setShowSave] = useState(false);

  if (!result) {
    return (
      <div style={card}>
        <p style={{ fontSize: 14, color: "#6f7a73" }}>Nothing to calculate yet — go back and finish the previous steps.</p>
        <button onClick={onEditSettings} style={{ ...buttonSecondary, marginTop: 12 }}>Back to settings</button>
      </div>
    );
  }

  const { formations, allocated, remaining, totalCapacity, unusedCapacity, warnings } = result;
  const totalAllocated = TROOP_TYPES.reduce((s, t) => s + allocated[t], 0);
  const allComplete = formations.every(f => f.isComplete);

  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 14 }}>
        {event === "crazyJoe" ? "Crazy Joe" : "Bear Trap"} results
      </div>

      {/* Summary card */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#9aa59e", fontWeight: 700, textTransform: "uppercase" }}>Marches</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formations.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#9aa59e", fontWeight: 700, textTransform: "uppercase" }}>Troops allocated</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(totalAllocated)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#9aa59e", fontWeight: 700, textTransform: "uppercase" }}>Unused capacity</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(unusedCapacity)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#9aa59e", fontWeight: 700, textTransform: "uppercase" }}>All formations achieved</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: allComplete ? "#5c7a6e" : "#9a7746" }}>{allComplete ? "Yes" : "No"}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#b8c0ba" }}>Total march capacity: {formatTroopNumber(totalCapacity)}</div>
      </div>

      {warnings.length > 0 && (
        <div style={{ ...card, marginBottom: 14, background: "rgba(154,119,70,0.08)", border: "1px solid rgba(154,119,70,0.2)" }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: "#9a7746", lineHeight: 1.5, marginBottom: i < warnings.length - 1 ? 8 : 0 }}>{w}</div>
          ))}
        </div>
      )}

      {/* Formation cards */}
      {formations.map(f => <FormationCard key={f.id} formation={f} />)}

      {/* Remaining inventory */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#9aa59e", marginBottom: 8 }}>
          Troops remaining
        </div>
        {TROOP_TYPES.map(t => (
          <div key={t} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: TROOP_COLORS[t], fontWeight: 600 }}>{TROOP_LABELS[t]}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(remaining[t])}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => copyText(formationsToText(event, formations), setCopyAllMsg)}
          style={buttonPrimary}>
          {copyAllMsg || "Copy all formations"}
        </button>

        {!showSave ? (
          <button onClick={() => setShowSave(true)} style={buttonSecondary}>Save as preset</button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name, e.g. Bear Trap 3/27/70"
              style={{ flex: 1, borderRadius: 14, border: "1px solid #e3e8e2", padding: "10px 14px", fontSize: 14 }}
            />
            <button
              onClick={() => { if (presetName.trim()) { onSavePreset(presetName.trim()); setShowSave(false); setPresetName(""); } }}
              style={{ ...buttonPrimary, width: "auto", padding: "0 16px" }}>
              Save
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEditSettings} style={{ ...buttonSecondary, flex: 1 }}>Edit settings</button>
          <button onClick={onRecalculate} style={{ ...buttonSecondary, flex: 1 }}>Recalculate</button>
        </div>
        <button onClick={onStartOver} style={{ ...buttonSecondary, color: "#a06358" }}>Start over</button>
      </div>
    </div>
  );
}
