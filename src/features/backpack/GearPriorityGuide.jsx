// ─── GearPriorityGuide.jsx ──────────────────────────────────────────────────────
// Guides the player through which gear piece to Mithril-upgrade next, phase
// by phase (+20, +60, ...), using a fixed priority order per phase. Progress
// (which pieces are marked done) persists per backpack in localStorage.

import { useState, useEffect } from "react";
import infantryGloves  from "../../assets/icons/infantry-gloves.png";
import infantryBoots   from "../../assets/icons/infantry-boots.png";
import infantryGoggles from "../../assets/icons/infantry-goggles.png";
import infantryBelt    from "../../assets/icons/infantry-belt.png";
import marksmanGoggles from "../../assets/icons/marksman-goggles.png";
import marksmanBelt    from "../../assets/icons/marksman-belt.png";
import marksmanGloves  from "../../assets/icons/marksman-gloves.png";

const PIECE_ICONS = {
  "infantry-gloves":  infantryGloves,
  "infantry-boots":   infantryBoots,
  "infantry-goggles": infantryGoggles,
  "infantry-belt":    infantryBelt,
  "marksman-goggles": marksmanGoggles,
  "marksman-belt":    marksmanBelt,
  "marksman-gloves":  marksmanGloves,
};

const PIECE_NAMES = {
  "infantry-gloves":  "Infantry Gloves",
  "infantry-boots":   "Infantry Boots",
  "infantry-goggles": "Infantry Goggles",
  "infantry-belt":    "Infantry Belt",
  "marksman-goggles": "Marksman Goggles",
  "marksman-belt":    "Marksman Belt",
  "marksman-gloves":  "Marksman Gloves",
  "marksman-boots":   "Marksman Boots",
};

// Priority order confirmed by the player — sequence matters within a phase.
const PHASES = [
  {
    id: "plus20",
    label: "+20 Priority",
    groups: [
      { rank: 1, pieces: ["infantry-gloves", "infantry-boots"] },
      { rank: 2, pieces: ["marksman-goggles", "marksman-belt"] },
      { rank: 3, pieces: ["marksman-gloves", "marksman-boots"] },
    ],
  },
  {
    id: "plus60",
    label: "+60 Priority",
    groups: [
      { rank: 1, pieces: ["infantry-goggles", "infantry-belt"] },
      { rank: 2, pieces: ["marksman-gloves", "marksman-boots"] },
    ],
  },
];

function storageKey(userId) {
  return `backpack-hub-gear-priority-v1:${userId || "local-user"}`;
}

function loadProgress(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(userId, progress) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(progress)); } catch {}
}

function PieceRow({ pieceId, done, isNext, onToggle }) {
  const icon = PIECE_ICONS[pieceId];
  const name = PIECE_NAMES[pieceId] || pieceId;
  return (
    <div onClick={onToggle} style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"8px 10px", borderRadius:12, cursor:"pointer",
      background: isNext ? "rgba(120,145,127,0.14)" : "transparent",
      border: isNext ? "1px solid rgba(120,145,127,0.4)" : "1px solid transparent",
    }}>
      <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
        background:"var(--bp-card-soft, rgba(255,255,255,0.7))", display:"flex",
        alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {icon ? <img src={icon} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontSize:16 }}>🎒</span>}
      </div>
      <span style={{ flex:1, fontSize:13, fontWeight: isNext ? 700 : 500,
        color: done ? "var(--bp-muted, #9aa59e)" : "var(--bp-text, #24312c)",
        textDecoration: done ? "line-through" : "none" }}>
        {name}
      </span>
      <div style={{
        width:20, height:20, borderRadius:"50%", flexShrink:0,
        border: done ? "none" : "1.5px solid rgba(72,94,80,0.3)",
        background: done ? "#5c7a6e" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {done && <span style={{ color:"white", fontSize:11 }}>✓</span>}
      </div>
    </div>
  );
}

function PhaseCard({ phase, progress, onToggle }) {
  // Flatten in priority order to find the very next undone piece.
  const flat = phase.groups.flatMap(g => g.pieces);
  const nextPiece = flat.find(p => !progress[p]);

  return (
    <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
      border:"1px solid var(--bp-border, rgba(74,92,80,0.09))",
      boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
      borderRadius:20, padding:16, marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-text, #24312c)", marginBottom:2 }}>
        {phase.label}
      </div>
      {nextPiece ? (
        <div style={{ fontSize:12, color:"#5c7a6e", marginBottom:10 }}>
          Upgrade next: <strong>{PIECE_NAMES[nextPiece]}</strong>
        </div>
      ) : (
        <div style={{ fontSize:12, color:"#5c7a6e", marginBottom:10 }}>
          Phase complete 🎉
        </div>
      )}
      {phase.groups.map(group => (
        <div key={group.rank} style={{ marginBottom:8 }}>
          <div style={{ fontSize:10, color:"var(--bp-muted, #9aa59e)", fontWeight:700,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            Priority {group.rank}
          </div>
          {group.pieces.map(pieceId => (
            <PieceRow
              key={pieceId}
              pieceId={pieceId}
              done={!!progress[pieceId]}
              isNext={pieceId === nextPiece}
              onToggle={() => onToggle(pieceId)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function GearPriorityGuide({ userId }) {
  const [progress, setProgress] = useState(() => loadProgress(userId));

  useEffect(() => { setProgress(loadProgress(userId)); }, [userId]);

  const toggle = (pieceId) => {
    const next = { ...progress, [pieceId]: !progress[pieceId] };
    setProgress(next);
    saveProgress(userId, next);
  };

  return (
    <div>
      <div style={{ fontSize:12, color:"var(--bp-muted, #9aa59e)", marginBottom:14, lineHeight:1.5 }}>
        Which gear piece to Mithril-upgrade next, in priority order. Tap a
        piece to mark it done — the highlighted row is always what to do next.
      </div>
      {PHASES.map(phase => (
        <PhaseCard key={phase.id} phase={phase} progress={progress} onToggle={toggle} />
      ))}
    </div>
  );
}
