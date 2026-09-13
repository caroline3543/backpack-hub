// ─── MithrilCalculator.jsx ─────────────────────────────────────────────────────
// Legendary Hero Gear Mithril empowerment planner. Empowerment milestones
// unlock at gear levels 20/40/60/80/100 — each costs Mithril + Mythic Gear
// on top of the last (150 Mithril total to fully empower one piece).
// The user picks the level their gear is currently at and the level they
// want to reach, enters how much Mithril they already have (pre-filled
// from their tracked Mithril balance if they have one), and sees exactly
// how much more they need.

import { useState, useMemo, useEffect } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { MITHRIL_MILESTONES, mithrilNeededBetween } from "./backpackConstants.js";

const CURRENT_LEVEL_OPTIONS = [0, 20, 40, 60, 80];

const selectStyle = {
  width:"100%", background:"white", appearance:"none", cursor:"pointer",
  border:"1px solid #e3e8e2", borderRadius:14,
  padding:"12px 16px", fontSize:15, color:"#24312c",
  outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
};

const inputStyle = {
  width:"100%", background:"white",
  border:"1px solid #e3e8e2", borderRadius:14,
  padding:"12px 16px", fontSize:15, color:"#24312c",
  outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
};

const labelStyle = {
  fontSize:11, fontWeight:700, textTransform:"uppercase",
  letterSpacing:"0.15em", color:"#9aa59e", display:"block", marginBottom:6,
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)", borderRadius:16,
      padding:"12px 14px" }}>
      <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
        textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
        {label}
      </div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600,
        color: accent || "#24312c" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:"#9aa59e", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function MithrilCalculator({ mithrilBalance = 0 }) {
  const { t } = useI18n();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [targetLevel,  setTargetLevel]  = useState(20);
  const [pieceCount,   setPieceCount]   = useState(1);
  const [haveMithril,  setHaveMithril]  = useState(String(mithrilBalance || 0));
  const [usedTracked,  setUsedTracked]  = useState(true);

  const targetOptions = MITHRIL_MILESTONES.filter(lvl => lvl > currentLevel);
  const effectiveTarget = targetOptions.includes(targetLevel) ? targetLevel : targetOptions[0];

  // Keep the "have" field synced to the tracked Mithril balance unless the
  // user has typed their own number in — lets it double as a live readout
  // without fighting a manual entry.
  useEffect(() => {
    if (usedTracked) setHaveMithril(String(mithrilBalance || 0));
  }, [mithrilBalance, usedTracked]);

  const perPiece = useMemo(
    () => mithrilNeededBetween(currentLevel, effectiveTarget),
    [currentLevel, effectiveTarget]
  );

  const totalMithrilNeeded    = perPiece.mithril * pieceCount;
  const totalMythicGearNeeded = perPiece.mythicGear * pieceCount;
  const have      = Number(haveMithril) || 0;
  const remaining = Math.max(0, totalMithrilNeeded - have);
  const hasEnough = have >= totalMithrilNeeded && totalMithrilNeeded > 0;

  return (
    <div>
      <div style={{ fontSize:12, color:"#9aa59e", marginBottom:14, lineHeight:1.5 }}>
        Plan Mithril for Legendary Hero Gear empowerment. Milestones unlock
        at levels 20, 40, 60, 80, and 100 — each one costs Mithril and
        Mythic Gear on top of the last.
      </div>

      <div style={{ background:"rgba(255,255,255,0.82)",
        border:"1px solid rgba(74,92,80,0.09)",
        boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
        borderRadius:20, padding:16, marginBottom:14 }}>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div>
            <label style={labelStyle}>Current Level</label>
            <select style={selectStyle} value={currentLevel}
              onChange={e => setCurrentLevel(Number(e.target.value))}>
              {CURRENT_LEVEL_OPTIONS.map(lvl => (
                <option key={lvl} value={lvl}>{lvl === 0 ? "Not empowered yet" : lvl}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Target Level</label>
            <select style={selectStyle} value={effectiveTarget}
              onChange={e => setTargetLevel(Number(e.target.value))}>
              {targetOptions.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:4 }}>
          <div>
            <label style={labelStyle}>Gear Pieces</label>
            <select style={selectStyle} value={pieceCount}
              onChange={e => setPieceCount(Number(e.target.value))}>
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mithril You Have</label>
            <input style={inputStyle} type="number" min="0"
              value={haveMithril}
              onChange={e => { setUsedTracked(false); setHaveMithril(e.target.value); }} />
          </div>
        </div>
        {usedTracked === false && mithrilBalance !== undefined && (
          <button onClick={() => { setUsedTracked(true); setHaveMithril(String(mithrilBalance || 0)); }}
            style={{ background:"none", border:"none", cursor:"pointer",
              fontSize:11, color:"#78917f", fontWeight:600, padding:0, marginTop:6 }}>
            Use tracked balance ({mithrilBalance || 0})
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <StatCard label="Mithril Needed" value={totalMithrilNeeded.toLocaleString()}
          sub={`${perPiece.mithril} per piece × ${pieceCount}`} />
        <StatCard label="Mythic Gear Needed" value={totalMythicGearNeeded.toLocaleString()}
          sub={`${perPiece.mythicGear} per piece × ${pieceCount}`} />
      </div>

      <StatCard
        label={hasEnough ? "You're covered" : "Still Need"}
        value={hasEnough
          ? `+${(have - totalMithrilNeeded).toLocaleString()} spare`
          : remaining.toLocaleString()}
        sub={hasEnough
          ? "You already have enough Mithril for this jump."
          : `You have ${have.toLocaleString()} of ${totalMithrilNeeded.toLocaleString()} needed.`}
        accent={hasEnough ? "#5c7a6e" : "#a06358"}
      />
    </div>
  );
}
