// ─── ExpertCalculator.jsx ───────────────────────────────────────────────────────
// Dawn Academy Expert planner. Two parts:
//  1. Relationship Advancement — current/target Relationship Level → Gift XP
//     + Sigils needed (persisted per expert).
//  2. Skill Plan — every skill's current level is recorded per expert, and
//     any number of skills (on any number of experts) can be marked as
//     "being worked toward" with a target level. A summary at the top adds
//     it all up across every expert so multi-expert leveling has one total.
// "Update Goal" buttons push the computed totals onto the corresponding
// tracked items (Expert Sigils, Books of Knowledge) as a target amount —
// recomputed fresh each click, not incremented, so clicking twice is safe.

import { useState, useMemo } from "react";
import {
  PREDEFINED_ITEMS, EXPERT_ADVANCEMENT, EXPERT_SKILLS,
  expertNeededBetween, skillNeededBetween, tierLevelForName, AFFINITY_GIFT_XP,
} from "./backpackConstants.js";

const EXPERTS = PREDEFINED_ITEMS.filter(i => i.category === "Dawn Experts" && i.hasLevel);

const selectStyle = {
  width:"100%", background:"white", appearance:"none", cursor:"pointer",
  border:"1px solid #e3e8e2", borderRadius:14,
  padding:"12px 16px", fontSize:15, color:"var(--bp-text, #24312c)",
  outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
};

const smallSelectStyle = { ...selectStyle, padding:"8px 10px", fontSize:13, borderRadius:10 };

const labelStyle = {
  fontSize:11, fontWeight:700, textTransform:"uppercase",
  letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", display:"block", marginBottom:6,
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
      border:"1px solid var(--bp-border, rgba(74,92,80,0.09))", borderRadius:16,
      padding:"12px 14px" }}>
      <div style={{ fontSize:10, color:"var(--bp-muted, #9aa59e)", fontWeight:600,
        textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
        {label}
      </div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600,
        color: accent || "var(--bp-text, #24312c)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:"var(--bp-muted, #9aa59e)", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function GoalButton({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", height:40, borderRadius:12, fontSize:13, fontWeight:700,
      background:"color-mix(in srgb, var(--bp-accent, #78917f) 14%, white)", color:"var(--bp-accent, #5c7a6e)", border:"none", cursor:"pointer",
      marginTop:4,
    }}>
      {label}
    </button>
  );
}

// Sum every expert's active relationship target + skill targets into one
// cross-expert total. This is what powers both the summary card and the
// "Update Goal" buttons.
function computePlan(items) {
  const lines = [];
  let totalSigil = 0, totalGiftXP = 0, totalBooks = 0, totalSkillXP = 0;

  EXPERTS.forEach(def => {
    const item = items.find(i => i.id === def.id);
    if (!item) return;

    const cur = item.currentLevel ?? 0;
    const explicitTarget = item.targetLevel;
    const skillsDef = EXPERT_SKILLS[def.id]?.skills || [];
    const targets = item.skillTargets || {};

    // A planned skill might not be unlocked yet at the expert's current
    // Relationship Level — reaching that tier costs Sigils too, so it's a
    // real prerequisite of the skill plan even with no explicit
    // Relationship target set. Roll it into ONE combined relationship jump
    // (the higher of "explicitly planned" and "needed to unlock skills")
    // rather than counting it twice.
    let requiredByUnlock = 0;
    skillsDef.forEach(skill => {
      const skillTgt = targets[skill.name];
      if (skillTgt === undefined || skillTgt === null) return;
      const skillCur = (item.skillLevels || {})[skill.name] ?? 0;
      if (skillTgt <= skillCur) return;
      const unlockLevel = tierLevelForName(def.id, skill.unlock);
      if (unlockLevel !== null) requiredByUnlock = Math.max(requiredByUnlock, unlockLevel);
    });

    const effectiveTarget = Math.max(explicitTarget ?? 0, requiredByUnlock);

    if (effectiveTarget > cur) {
      const need = expertNeededBetween(def.id, cur, effectiveTarget);
      if (need) {
        totalSigil += need.sigil;
        totalGiftXP += need.giftXP;
        const drivenByUnlock = requiredByUnlock > (explicitTarget ?? 0);
        lines.push({
          expert: def.name, kind: "Relationship",
          detail: `Lv.${cur} → Lv.${effectiveTarget}${drivenByUnlock ? " (needed to unlock planned skills)" : ""}`,
          sigil: need.sigil, books: 0,
        });
      }
    }

    skillsDef.forEach((skill, idx) => {
      const skillTgt = targets[skill.name];
      if (skillTgt === undefined || skillTgt === null) return;
      const skillCur = (item.skillLevels || {})[skill.name] ?? 0;
      if (skillTgt <= skillCur) return;
      const need = skillNeededBetween(def.id, skill.name, skillCur, skillTgt);
      totalBooks += need.books;
      totalSkillXP += need.xp;
      lines.push({
        expert: def.name, kind: `Skill ${idx + 1}`, detail: `${skill.name} Lv.${skillCur} → Lv.${skillTgt}`,
        sigil: 0, books: need.books,
      });
    });
  });

  return { lines, totalSigil, totalGiftXP, totalBooks, totalSkillXP };
}

function PlanSummary({ items, onUpdateSigilGoal, onUpdateBooksGoal }) {
  const plan = useMemo(() => computePlan(items), [items]);
  if (plan.lines.length === 0) return null;

  const byExpert = {};
  plan.lines.forEach(l => {
    if (!byExpert[l.expert]) byExpert[l.expert] = [];
    byExpert[l.expert].push(l);
  });

  return (
    <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
      border:"1px solid var(--bp-border, rgba(74,92,80,0.09))",
      boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
      borderRadius:20, padding:16, marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.15em", color:"#9a7a62", marginBottom:10 }}>
        Currently Upgrading
      </div>
      {Object.entries(byExpert).map(([expert, lines]) => (
        <div key={expert} style={{ marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--bp-text, #24312c)" }}>{expert}</div>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize:12, color:"var(--bp-muted2, #6f7a73)", marginLeft:8 }}>
              {l.kind}: {l.detail}
            </div>
          ))}
        </div>
      ))}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
        <StatCard label="Total Sigils" value={plan.totalSigil.toLocaleString()} />
        <StatCard label="Total Books" value={plan.totalBooks.toLocaleString()} />
      </div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        {plan.totalSigil > 0 && (
          <button onClick={() => onUpdateSigilGoal(plan.totalSigil, plan.totalGiftXP)} style={{
            flex:1, height:38, borderRadius:10, fontSize:12, fontWeight:700,
            background:"color-mix(in srgb, var(--bp-accent, #78917f) 14%, white)", color:"var(--bp-accent, #5c7a6e)", border:"none", cursor:"pointer",
          }}>Update Sigil + XP Goal</button>
        )}
        {plan.totalBooks > 0 && (
          <button onClick={() => onUpdateBooksGoal(plan.totalBooks, plan.totalSkillXP)} style={{
            flex:1, height:38, borderRadius:10, fontSize:12, fontWeight:700,
            background:"color-mix(in srgb, var(--bp-accent, #78917f) 14%, white)", color:"var(--bp-accent, #5c7a6e)", border:"none", cursor:"pointer",
          }}>Update Books + XP Goal</button>
        )}
      </div>
      <div style={{ fontSize:10, color:"var(--bp-muted, #9aa59e)", marginTop:8 }}>
        Sets the Expert Sigils / Gift XP / Books of Knowledge / Skill XP items'
        goals to these totals — recalculated fresh each time, so it's always
        safe to click again after changing a plan.
      </div>
    </div>
  );
}

function SkillRow({ expertId, skill, index, item, onSetSkillLevel, onSetSkillTarget }) {
  const maxLevel = skill.levels.length;
  const maxSelectable = Math.max(maxLevel, 10);
  const dataMaxLevel = maxLevel;
  const levelOptions = Array.from({ length: maxSelectable + 1 }, (_, i) => i);
  const current = (item.skillLevels || {})[skill.name] ?? 0;
  const hasTarget = item.skillTargets && item.skillTargets[skill.name] !== undefined && item.skillTargets[skill.name] !== null;
  const target = hasTarget ? item.skillTargets[skill.name] : current;
  const need = hasTarget && target > current ? skillNeededBetween(expertId, skill.name, current, target) : null;
  const beyondData = hasTarget && target > dataMaxLevel;

  const relLevel = item.currentLevel ?? 0;
  const unlockLevel = tierLevelForName(expertId, skill.unlock);
  const notYetUnlocked = hasTarget && unlockLevel !== null && relLevel < unlockLevel;

  return (
    <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
      border:"1px solid var(--bp-border, rgba(74,92,80,0.09))", borderRadius:16,
      padding:"12px 14px", marginBottom:8 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"var(--bp-text, #24312c)" }}>
        Skill {index + 1} — {skill.name}
      </div>
      <div style={{ fontSize:11, color:"var(--bp-muted, #9aa59e)", margin:"2px 0 10px" }}>{skill.effect}</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <label style={{ ...labelStyle, fontSize:10, marginBottom:4 }}>Current Level</label>
          <select style={smallSelectStyle} value={current}
            onChange={e => onSetSkillLevel(skill.name, Number(e.target.value))}>
            {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize:10, marginBottom:4 }}>
            Target <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span>
          </label>
          <select style={smallSelectStyle} value={hasTarget ? target : ""}
            onChange={e => onSetSkillTarget(skill.name, e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">Not planning</option>
            {levelOptions.filter(l => l > current).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {need && (
        <div style={{ fontSize:12, color:"#5c7a6e", fontWeight:700, marginTop:8 }}>
          Needs {need.xp.toLocaleString()} Skill XP + {need.books.toLocaleString()} Books
          {beyondData && (
            <span style={{ display:"block", fontWeight:400, color:"#a06358", marginTop:2 }}>
              (cost data only goes up to Level {dataMaxLevel} — totals above are a partial count)
            </span>
          )}
        </div>
      )}
      {notYetUnlocked && (
        <div style={{ fontSize:11, color:"#9a7746", marginTop:6,
          background:"rgba(154,122,98,0.08)", borderRadius:8, padding:"6px 8px" }}>
          Not unlocked yet — needs Relationship Level {unlockLevel} ({skill.unlock}) first.
          That's included in the Sigil total up top.
        </div>
      )}
    </div>
  );
}

export default function ExpertCalculator({ items, updateItem, onSetGoal }) {
  const [expertId, setExpertId] = useState(EXPERTS[0]?.id);
  const item = items.find(i => i.id === expertId) || {};
  const rows = EXPERT_ADVANCEMENT[expertId];
  const skillData = EXPERT_SKILLS[expertId];

  const levels = rows ? rows.map(r => r.level) : [];
  const currentLevel = item.currentLevel ?? 0;
  const targetLevel = item.targetLevel ?? null;
  const targetOptions = levels.filter(l => l > currentLevel);
  // Only trust a target that's actually still valid for the current level —
  // no silent fallback to "first available level" here, or picking "Not
  // planning" would immediately get overwritten by a number on re-render.
  const effectiveTarget = (targetLevel !== null && targetOptions.includes(targetLevel)) ? targetLevel : null;

  const need = useMemo(
    () => (rows && effectiveTarget) ? expertNeededBetween(expertId, currentLevel, effectiveTarget) : null,
    [expertId, currentLevel, effectiveTarget, rows]
  );

  const crossedTiers = rows
    ? rows.filter(r => r.level > currentLevel && r.level <= (effectiveTarget ?? 0))
    : [];

  const updateSigilGoal = (sigilTotal, giftXPTotal = 0) => {
    onSetGoal("expert-sigils", sigilTotal);
    onSetGoal("gift-xp", giftXPTotal);
  };
  const updateBooksGoal = (booksTotal, skillXPTotal = 0) => {
    onSetGoal("books-knowledge", booksTotal);
    onSetGoal("skill-xp", skillXPTotal);
  };

  return (
    <div>
      <div style={{ fontSize:12, color:"var(--bp-muted, #9aa59e)", marginBottom:14, lineHeight:1.5 }}>
        Plan Relationship Level and skill leveling for your Dawn Academy Experts.
      </div>

      <PlanSummary items={items} onUpdateSigilGoal={updateSigilGoal} onUpdateBooksGoal={updateBooksGoal} />

      <div style={{ marginBottom:14 }}>
        <label style={labelStyle}>Expert</label>
        <select style={selectStyle} value={expertId}
          onChange={e => setExpertId(e.target.value)}>
          {EXPERTS.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </div>

      {!rows ? (
        <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
          border:"1px solid var(--bp-border, rgba(74,92,80,0.09))",
          borderRadius:20, padding:"28px 16px", textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--bp-text, #24312c)", marginBottom:4 }}>
            No data added yet for this Expert
          </div>
          <div style={{ fontSize:13, color:"var(--bp-muted, #9aa59e)", lineHeight:1.5 }}>
            Send over the same Relationship Advancement + Skill breakdown you
            gave for the others and it'll get wired in here the same way.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", marginBottom:8 }}>
            Relationship Advancement
          </div>
          <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
            border:"1px solid var(--bp-border, rgba(74,92,80,0.09))",
            boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
            borderRadius:20, padding:16, marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={labelStyle}>Current Level</label>
                <select style={selectStyle} value={currentLevel}
                  onChange={e => updateItem(expertId, { currentLevel: Number(e.target.value) })}>
                  {levels.filter(l => l < levels[levels.length - 1]).map(l => (
                    <option key={l} value={l}>{l === 0 ? "Not unlocked yet" : l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target Level</label>
                <select style={selectStyle} value={effectiveTarget ?? ""}
                  onChange={e => updateItem(expertId, { targetLevel: e.target.value === "" ? null : Number(e.target.value) })}>
                  <option value="">Not planning</option>
                  {targetOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {need && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <StatCard label="Gift XP Needed" value={need.giftXP.toLocaleString()} />
                <StatCard label="Expert Sigils Needed" value={need.sigil.toLocaleString()} />
              </div>
              <GoalButton onClick={() => updateSigilGoal(need.sigil, need.giftXP)} label="Update Sigil + XP Goal (this expert only)" />
              <div style={{ fontSize:11, color:"var(--bp-muted, #9aa59e)", margin:"10px 0 16px", lineHeight:1.5 }}>
                Affinity gifts: Compass = {AFFINITY_GIFT_XP.compass} XP · Fiery Heart = {AFFINITY_GIFT_XP["fiery-heart"]} XP
                {" · "}Sail of Conquest = {AFFINITY_GIFT_XP["sail-of-conquest"]} XP
              </div>
            </>
          )}

          {crossedTiers.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", marginBottom:8 }}>
                Unlocks Along The Way
              </div>
              {crossedTiers.map(tier => (
                <div key={tier.level} style={{ background:"var(--bp-card-soft, rgba(255,255,255,0.7))",
                  borderRadius:12, padding:"8px 12px", marginBottom:6,
                  fontSize:12 }}>
                  <span style={{ fontWeight:700, color:"var(--bp-text, #24312c)" }}>{tier.tier}</span>
                  <span style={{ color:"var(--bp-muted, #9aa59e)" }}> ({tier.range})</span>
                  <div style={{ color:"var(--bp-muted2, #6f7a73)", marginTop:2 }}>{tier.benefits}</div>
                </div>
              ))}
            </div>
          )}

          {skillData && (
            <>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", marginBottom:8 }}>
                Talent
              </div>
              <div style={{ background:"var(--bp-card, rgba(255,255,255,0.82))",
                border:"1px solid var(--bp-border, rgba(74,92,80,0.09))", borderRadius:16,
                padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-text, #24312c)" }}>
                  {skillData.talent.name}
                </div>
                <div style={{ fontSize:11, color:"var(--bp-muted, #9aa59e)", marginTop:2 }}>
                  {skillData.talent.effect}
                </div>
                <div style={{ fontSize:11, color:"#9a7746", marginTop:6 }}>
                  Upgrades automatically as Relationship Level rises — no Books needed.
                </div>
              </div>

              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", marginBottom:8 }}>
                Skills — record your level, optionally set a target
              </div>
              {skillData.skills.map((skill, idx) => (
                <SkillRow
                  key={skill.name}
                  expertId={expertId}
                  skill={skill}
                  index={idx}
                  item={item}
                  onSetSkillLevel={(name, level) => updateItem(expertId, {
                    skillLevels: { ...(item.skillLevels || {}), [name]: level },
                  })}
                  onSetSkillTarget={(name, target) => {
                    const nextTargets = { ...(item.skillTargets || {}) };
                    if (target === null) delete nextTargets[name];
                    else nextTargets[name] = target;
                    updateItem(expertId, { skillTargets: nextTargets });
                  }}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
