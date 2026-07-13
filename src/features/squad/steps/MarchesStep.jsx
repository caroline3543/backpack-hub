// ─── MarchesStep.jsx ──────────────────────────────────────────────────────────

import { useState } from "react";
import { parseTroopNumber, formatTroopNumber, calculateEffectiveDeploymentCapacity, calculateCyrilleDeploymentBonus, calculateCyrilleRallyBonus } from "../squadCalculations.js";
import { CYRILLE_CONFIG } from "../cyrilleConfig.js";
import { card, label, input, heading, kicker, buttonPrimary, buttonSecondary, chip } from "../squadStyles.js";

const MIN_MARCHES = 1;
const MAX_MARCHES = 12; // configurable range, not hard-coded to any one value

function NumberField({ value, onChange, placeholder }) {
  const [raw, setRaw] = useState(value ? formatTroopNumber(value) : "");
  return (
    <input
      style={input}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(parseTroopNumber(e.target.value)); }}
      onBlur={() => setRaw(value ? formatTroopNumber(value) : "")}
    />
  );
}

export default function MarchesStep({ event, setup, onChange, onContinue, onBack, marchQueueInfo }) {
  const [showBuffs, setShowBuffs] = useState(false);
  const [showCyrille, setShowCyrille] = useState(!!setup.cyrille?.enabled);

  const set = (patch) => onChange({ ...setup, ...patch });

  const marchCount = setup.marchCount || 6;
  const sameCapacity = setup.sameCapacity !== false;
  const baseCapacity = setup.baseCapacity || 0;
  const capacities = setup.marchCapacities || Array.from({ length: marchCount }, () => baseCapacity);
  const bonuses = setup.bonuses || [];
  const cyrille = setup.cyrille || { enabled: false, ursasBaneLevel: 0, entrapmentLevel: 0 };

  const { effective, breakdown } = calculateEffectiveDeploymentCapacity(
    baseCapacity,
    cyrille.enabled
      ? [...bonuses, { name: "Cyrille (Ursa's Bane)", kind: "flat", value: calculateCyrilleDeploymentBonus(cyrille.ursasBaneLevel, CYRILLE_CONFIG.ursasBane.perLevel, CYRILLE_CONFIG.ursasBane.maxLevel), enabled: true }]
      : bonuses
  );

  const setMarchCount = (n) => {
    const clamped = Math.max(MIN_MARCHES, Math.min(MAX_MARCHES, n));
    const nextCaps = Array.from({ length: clamped }, (_, i) => capacities[i] ?? baseCapacity);
    set({ marchCount: clamped, marchCapacities: nextCaps });
  };

  const updateCapacity = (i, value) => {
    const next = [...capacities];
    next[i] = value;
    set({ marchCapacities: next });
  };

  const addBonus = () => {
    set({ bonuses: [...bonuses, { id: `bonus-${Date.now()}`, name: "Custom bonus", kind: "flat", value: 0, enabled: true }] });
  };
  const updateBonus = (id, patch) => {
    set({ bonuses: bonuses.map(b => b.id === id ? { ...b, ...patch } : b) });
  };
  const removeBonus = (id) => {
    set({ bonuses: bonuses.filter(b => b.id !== id) });
  };

  const canContinue = marchCount > 0 && (sameCapacity ? baseCapacity > 0 : capacities.every(c => c > 0));

  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>Your marches</div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
        How many marches can you deploy at once, and how much can each one carry?
      </p>

      {/* March count */}
      {marchQueueInfo && marchQueueInfo.maximum !== null && (
        <div style={{ ...card, marginBottom: 14, background: "rgba(92,122,110,0.06)", border: "1px solid rgba(92,122,110,0.2)" }}>
          <div style={{ fontSize: 12, color: "#5c7a6e", lineHeight: 1.5, marginBottom: marchCount !== marchQueueInfo.maximum ? 8 : 0 }}>
            We read {marchQueueInfo.current} of {marchQueueInfo.maximum} march queues from your screenshot.
            Squad calculations will use {marchCount} available queues unless you change this — {marchQueueInfo.current} are currently occupied, so not all of them may be free to deploy right away.
          </div>
          {marchCount !== marchQueueInfo.maximum && (
            <button onClick={() => setMarchCount(marchQueueInfo.maximum)} style={{ ...chip(false), fontSize: 12 }}>
              Use {marchQueueInfo.maximum}
            </button>
          )}
        </div>
      )}
      <div style={{ ...card, marginBottom: 14 }}>
        <label style={label}>How many marches?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: MAX_MARCHES }, (_, i) => i + 1).map(n => (
            <button key={n} style={chip(marchCount === n)} onClick={() => setMarchCount(n)}>{n}</button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div style={{ ...card, marginBottom: 14 }}>
        <label style={label}>Normal deployment capacity per march</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={chip(sameCapacity)} onClick={() => set({ sameCapacity: true })}>Same for all</button>
          <button style={chip(!sameCapacity)} onClick={() => set({ sameCapacity: false })}>Different per march</button>
        </div>

        {sameCapacity ? (
          <NumberField value={baseCapacity} onChange={v => set({ baseCapacity: v })} placeholder="e.g. 144,030" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {capacities.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#9aa59e", width: 64, flexShrink: 0 }}>March {i + 1}</span>
                <NumberField value={c} onChange={v => updateCapacity(i, v)} placeholder="Capacity" />
              </div>
            ))}
            <button
              onClick={() => { const next = [...capacities]; for (let i = 1; i < next.length; i++) next[i] = next[0]; set({ marchCapacities: next }); }}
              style={{ ...buttonSecondary, fontSize: 12 }}>
              Apply march 1's capacity to all
            </button>
          </div>
        )}
      </div>

      {/* Buffs (progressive disclosure) */}
      <div style={{ ...card, marginBottom: 14 }}>
        <button onClick={() => setShowBuffs(s => !s)} style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center",
        }}>
          <span style={label}>Deployment-capacity buffs (optional)</span>
          <span style={{ fontSize: 12, color: "#78917f" }}>{showBuffs ? "Hide" : "Show"}</span>
        </button>

        {showBuffs && (
          <div style={{ marginTop: 10 }}>
            {bonuses.map(b => (
              <div key={b.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <input
                  style={{ ...input, flex: 2 }}
                  value={b.name}
                  onChange={e => updateBonus(b.id, { name: e.target.value })}
                  placeholder="Bonus name"
                />
                <div style={{ flex: 1 }}>
                  <NumberField value={b.value} onChange={v => updateBonus(b.id, { value: v })} placeholder="Amount" />
                </div>
                <button
                  onClick={() => updateBonus(b.id, { kind: b.kind === "percent" ? "flat" : "percent" })}
                  style={{ ...chip(false), fontSize: 11, padding: "6px 10px" }}>
                  {b.kind === "percent" ? "%" : "+"}
                </button>
                <button onClick={() => removeBonus(b.id)} style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: "#fdf0ee", color: "#a1766e", cursor: "pointer", flexShrink: 0,
                }}>✕</button>
              </div>
            ))}
            <button onClick={addBonus} style={{ ...buttonSecondary, fontSize: 13 }}>+ Add a bonus</button>

            {baseCapacity > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(72,94,80,0.08)" }}>
                {breakdown.map((line, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                    color: i === 0 ? "#6f7a73" : "#5c7a6e", marginBottom: 3 }}>
                    <span>{line.label}</span>
                    <span>{formatTroopNumber(line.amount)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700,
                  color: "#24312c", marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(72,94,80,0.12)" }}>
                  <span>Effective capacity</span>
                  <span>{formatTroopNumber(effective)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cyrille (Bear Trap only) */}
      {event === "bearTrap" && (
        <div style={{ ...card, marginBottom: 14 }}>
          <label style={label}>Do you have Expert Cyrille?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: cyrille.enabled ? 12 : 0 }}>
            <button style={chip(!cyrille.enabled)} onClick={() => { setShowCyrille(false); set({ cyrille: { ...cyrille, enabled: false } }); }}>No</button>
            <button style={chip(cyrille.enabled)} onClick={() => { setShowCyrille(true); set({ cyrille: { ...cyrille, enabled: true } }); }}>Yes</button>
          </div>

          {cyrille.enabled && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Ursa's Bane level (personal deployment capacity)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from({ length: CYRILLE_CONFIG.ursasBane.maxLevel + 1 }, (_, i) => i).map(lvl => (
                    <button key={lvl} style={chip(cyrille.ursasBaneLevel === lvl)}
                      onClick={() => set({ cyrille: { ...cyrille, ursasBaneLevel: lvl } })}>{lvl}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#9aa59e", marginTop: 4 }}>
                  +{formatTroopNumber(calculateCyrilleDeploymentBonus(cyrille.ursasBaneLevel, CYRILLE_CONFIG.ursasBane.perLevel))} to your personal march capacity — included in the effective capacity above.
                </div>
              </div>

              <div>
                <label style={label}>Entrapment level (total rally capacity — only matters if you'll be rally leader)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from({ length: CYRILLE_CONFIG.entrapment.maxLevel + 1 }, (_, i) => i).map(lvl => (
                    <button key={lvl} style={chip(cyrille.entrapmentLevel === lvl)}
                      onClick={() => set({ cyrille: { ...cyrille, entrapmentLevel: lvl } })}>{lvl}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#9aa59e", marginTop: 4 }}>
                  +{formatTroopNumber(calculateCyrilleRallyBonus(cyrille.entrapmentLevel, CYRILLE_CONFIG.entrapment.perLevel))} to total rally capacity — this is <strong>not</strong> added to ordinary marches, only to a rally you lead.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ ...buttonSecondary, flex: 1 }}>Back</button>
        <button onClick={onContinue} disabled={!canContinue}
          style={{ ...buttonPrimary, flex: 2, opacity: canContinue ? 1 : 0.5, cursor: canContinue ? "pointer" : "default" }}>
          Continue
        </button>
      </div>
    </div>
  );
}
