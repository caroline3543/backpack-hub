// ─── ExpertCalculator.jsx ───────────────────────────────────────────────────────
// Dawn Academy Expert planner. Pick an Expert, pick a current and target
// Relationship Level, see the real Gift XP + Expert Sigils needed for that
// jump, plus a reference of each skill's exact per-level XP/Books costs.
// Only Experts with data supplied show real numbers — others say so.

import { useState, useMemo } from "react";
import {
  PREDEFINED_ITEMS, EXPERT_ADVANCEMENT, EXPERT_SKILLS,
  expertNeededBetween, AFFINITY_GIFT_XP,
} from "./backpackConstants.js";

const EXPERTS = PREDEFINED_ITEMS.filter(i => i.category === "Dawn Experts" && i.hasLevel);

const selectStyle = {
  width:"100%", background:"white", appearance:"none", cursor:"pointer",
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

function SkillCard({ skill }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)", borderRadius:16,
      padding:"12px 14px", marginBottom:8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", background:"none", border:"none", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:0, textAlign:"left" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#24312c" }}>{skill.name}</div>
          <div style={{ fontSize:11, color:"#9aa59e", marginTop:2 }}>{skill.effect}</div>
        </div>
        <span style={{ fontSize:12, color:"#9aa59e", flexShrink:0, marginLeft:8 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(72,94,80,0.08)" }}>
          <div style={{ fontSize:11, color:"#9a7746", marginBottom:8 }}>
            Unlocks at: {skill.unlock}
          </div>
          {skill.note && (
            <div style={{ fontSize:11, color:"#a06358", marginBottom:8,
              background:"rgba(160,99,88,0.08)", borderRadius:8, padding:"6px 8px" }}>
              {skill.note}
            </div>
          )}
          {skill.levels.map(lv => (
            <div key={lv.level} style={{ display:"flex", justifyContent:"space-between",
              fontSize:12, color:"#4c5a52", padding:"4px 0" }}>
              <span>Level {lv.level}{lv.requirement ? ` (needs ${lv.requirement})` : ""}</span>
              <span style={{ fontWeight:700, color:"#24312c" }}>
                {lv.xp.toLocaleString()} XP + {lv.books.toLocaleString()} Books
              </span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between",
            fontSize:12, fontWeight:700, color:"#5c7a6e", marginTop:6,
            paddingTop:6, borderTop:"1px solid rgba(72,94,80,0.08)" }}>
            <span>Total</span>
            <span>{skill.totalXP.toLocaleString()} XP + {skill.totalBooks.toLocaleString()} Books</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpertCalculator() {
  const [expertId, setExpertId] = useState(EXPERTS[0]?.id);
  const rows = EXPERT_ADVANCEMENT[expertId];
  const skillData = EXPERT_SKILLS[expertId];

  const levels = rows ? rows.map(r => r.level) : [];
  const [currentLevel, setCurrentLevel] = useState(0);
  const [targetLevel,  setTargetLevel]  = useState(levels[1] ?? 10);

  const targetOptions = levels.filter(l => l > currentLevel);
  const effectiveTarget = targetOptions.includes(targetLevel) ? targetLevel : targetOptions[0];

  const need = useMemo(
    () => rows ? expertNeededBetween(expertId, currentLevel, effectiveTarget) : null,
    [expertId, currentLevel, effectiveTarget, rows]
  );

  const crossedTiers = rows
    ? rows.filter(r => r.level > currentLevel && r.level <= effectiveTarget)
    : [];

  return (
    <div>
      <div style={{ fontSize:12, color:"#9aa59e", marginBottom:14, lineHeight:1.5 }}>
        Plan Relationship Level advancement for your Dawn Academy Experts —
        Gift XP and Expert Sigils needed for the jump you pick.
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={labelStyle}>Expert</label>
        <select style={selectStyle} value={expertId}
          onChange={e => {
            setExpertId(e.target.value);
            setCurrentLevel(0);
          }}>
          {EXPERTS.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </div>

      {!rows ? (
        <div style={{ background:"rgba(255,255,255,0.82)",
          border:"1px solid rgba(74,92,80,0.09)",
          borderRadius:20, padding:"28px 16px", textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#24312c", marginBottom:4 }}>
            No data added yet for this Expert
          </div>
          <div style={{ fontSize:13, color:"#9aa59e", lineHeight:1.5 }}>
            Send over the same Relationship Advancement + Skill breakdown you
            gave for Agnes and it'll get wired in here the same way.
          </div>
        </div>
      ) : (
        <>
          <div style={{ background:"rgba(255,255,255,0.82)",
            border:"1px solid rgba(74,92,80,0.09)",
            boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
            borderRadius:20, padding:16, marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={labelStyle}>Current Level</label>
                <select style={selectStyle} value={currentLevel}
                  onChange={e => setCurrentLevel(Number(e.target.value))}>
                  {levels.filter(l => l < levels[levels.length - 1]).map(l => (
                    <option key={l} value={l}>{l === 0 ? "Not unlocked yet" : l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target Level</label>
                <select style={selectStyle} value={effectiveTarget}
                  onChange={e => setTargetLevel(Number(e.target.value))}>
                  {targetOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <StatCard label="Gift XP Needed" value={need.giftXP.toLocaleString()} />
            <StatCard label="Expert Sigils Needed" value={need.sigil.toLocaleString()} />
          </div>

          <div style={{ fontSize:11, color:"#9aa59e", marginBottom:16, lineHeight:1.5 }}>
            Affinity gifts: Compass = {AFFINITY_GIFT_XP.compass} XP · Fiery Heart = {AFFINITY_GIFT_XP["fiery-heart"]} XP
            {" · "}Sail of Conquest = {AFFINITY_GIFT_XP["sail-of-conquest"]} XP
          </div>

          {crossedTiers.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"#9aa59e", marginBottom:8 }}>
                Unlocks Along The Way
              </div>
              {crossedTiers.map(tier => (
                <div key={tier.level} style={{ background:"rgba(255,255,255,0.7)",
                  borderRadius:12, padding:"8px 12px", marginBottom:6,
                  fontSize:12 }}>
                  <span style={{ fontWeight:700, color:"#24312c" }}>{tier.tier}</span>
                  <span style={{ color:"#9aa59e" }}> ({tier.range})</span>
                  <div style={{ color:"#6f7a73", marginTop:2 }}>{tier.benefits}</div>
                </div>
              ))}
            </div>
          )}

          {skillData && (
            <>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"#9aa59e", marginBottom:8 }}>
                Talent
              </div>
              <div style={{ background:"rgba(255,255,255,0.82)",
                border:"1px solid rgba(74,92,80,0.09)", borderRadius:16,
                padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#24312c" }}>
                  {skillData.talent.name}
                </div>
                <div style={{ fontSize:11, color:"#9aa59e", marginTop:2 }}>
                  {skillData.talent.effect}
                </div>
                <div style={{ fontSize:11, color:"#9a7746", marginTop:6 }}>
                  Upgrades automatically as Relationship Level rises — no Books needed.
                </div>
              </div>

              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"#9aa59e", marginBottom:8 }}>
                Skills
              </div>
              {skillData.skills.map(skill => (
                <SkillCard key={skill.name} skill={skill} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
