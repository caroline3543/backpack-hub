// ─── StrategyStep.jsx ─────────────────────────────────────────────────────────

import { useState } from "react";
import { formatTroopNumber, parseTroopNumber, calculateCyrilleRallyBonus, calculateCyrilleDeploymentBonus } from "../squadCalculations.js";
import { CYRILLE_CONFIG } from "../cyrilleConfig.js";
import { card, label, input, heading, kicker, buttonPrimary, buttonSecondary, chip } from "../squadStyles.js";

const BEAR_TRAP_PRESETS = [
  { label: "3 / 27 / 70", ratio: { infantry: 3, lancer: 27, marksman: 70 } },
  { label: "10 / 30 / 60", ratio: { infantry: 10, lancer: 30, marksman: 60 } },
  { label: "10 / 20 / 70", ratio: { infantry: 10, lancer: 20, marksman: 70 } },
  { label: "No Infantry", ratio: { infantry: 0, lancer: 30, marksman: 70 } },
  { label: "Custom", ratio: null },
];

function RatioInputs({ ratio, onChange, includeInfantry = true }) {
  const set = (k, v) => onChange({ ...ratio, [k]: v });
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {includeInfantry && (
        <div style={{ flex: 1 }}>
          <label style={{ ...label, fontSize: 10 }}>Infantry</label>
          <input style={input} type="number" min="0" value={ratio.infantry}
            onChange={e => set("infantry", Number(e.target.value))} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <label style={{ ...label, fontSize: 10 }}>Lancer</label>
        <input style={input} type="number" min="0" value={ratio.lancer}
          onChange={e => set("lancer", Number(e.target.value))} />
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ ...label, fontSize: 10 }}>Marksman</label>
        <input style={input} type="number" min="0" value={ratio.marksman}
          onChange={e => set("marksman", Number(e.target.value))} />
      </div>
    </div>
  );
}

function NumberField({ value, onChange, placeholder }) {
  const [raw, setRaw] = useState(value ? formatTroopNumber(value) : "");
  return (
    <input
      style={input} type="text" inputMode="numeric" placeholder={placeholder}
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(parseTroopNumber(e.target.value)); }}
      onBlur={() => setRaw(value ? formatTroopNumber(value) : "")}
    />
  );
}

function CrazyJoeStrategy({ strategy, onChange }) {
  const set = (patch) => onChange({ ...strategy, ...patch });
  const method = strategy.method || "even";

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <label style={label}>Allocation method</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {[
          ["even", "Even distribution"],
          ["ratio", "Use my ratio"],
          ["priorityInfantry", "Prioritise Infantry"],
          ["priorityLancer", "Prioritise Lancers"],
        ].map(([id, text]) => (
          <button key={id} style={chip(method === id)} onClick={() => set({ method: id })}>{text}</button>
        ))}
      </div>

      {method === "ratio" && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...label, fontSize: 10 }}>Infantry : Lancer ratio</label>
          <RatioInputs
            ratio={{ infantry: strategy.ratio?.infantry ?? 50, lancer: strategy.ratio?.lancer ?? 50, marksman: 0 }}
            includeInfantry
            onChange={r => set({ ratio: { infantry: r.infantry, lancer: r.lancer } })}
          />
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={!!strategy.includeMarksmen}
          onChange={e => set({ includeMarksmen: e.target.checked })}
          style={{ width: 20, height: 20 }} />
        <span style={{ fontSize: 13, color: "#24312c", fontWeight: 600 }}>Include Marksmen</span>
      </label>
      <div style={{ fontSize: 11, color: "#9aa59e", marginTop: 4, lineHeight: 1.5 }}>
        Crazy Joe formations normally prioritise sending Infantry and Lancers out of the
        city. Only include Marksmen when you deliberately want them in these marches.
      </div>
    </div>
  );
}

function BearTrapStrategy({ strategy, marchSetup, onChange }) {
  const set = (patch) => onChange({ ...strategy, ...patch });
  const allocationMethod = strategy.allocationMethod || "ratio";
  const selectedPresetLabel = strategy.presetLabel || "3 / 27 / 70";
  const ratio = strategy.ratio || { infantry: 3, lancer: 27, marksman: 70 };
  const exact = strategy.exactAmounts || { infantry: 0, lancer: 0, marksman: 0 };

  const rallyLeader = strategy.rallyLeader || { enabled: false, capacity: 0, ratio: { infantry: 3, lancer: 27, marksman: 70 }, baseRallyCapacity: 0, otherRallyBonus: 0 };
  const bonusMarch = strategy.bonusMarch || { enabled: false, capacity: 0, ratio: { infantry: 3, lancer: 27, marksman: 70 } };

  const cyrille = marchSetup.cyrille || { enabled: false, ursasBaneLevel: 0, entrapmentLevel: 0 };
  const rallyBonus = cyrille.enabled ? calculateCyrilleRallyBonus(cyrille.entrapmentLevel, CYRILLE_CONFIG.entrapment.perLevel) : 0;
  const personalBonus = cyrille.enabled ? calculateCyrilleDeploymentBonus(cyrille.ursasBaneLevel, CYRILLE_CONFIG.ursasBane.perLevel) : 0;

  const totalRallyCapacity = rallyLeader.baseRallyCapacity + rallyBonus + (rallyLeader.otherRallyBonus || 0);
  const personalMarchSize = rallyLeader.capacity + personalBonus;

  return (
    <>
      <div style={{ ...card, marginBottom: 14 }}>
        <label style={label}>Allocation method</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={chip(allocationMethod === "ratio")} onClick={() => set({ allocationMethod: "ratio" })}>Ratio</button>
          <button style={chip(allocationMethod === "exact")} onClick={() => set({ allocationMethod: "exact" })}>Exact amounts</button>
        </div>

        {allocationMethod === "ratio" ? (
          <>
            <label style={{ ...label, fontSize: 10 }}>Preset (editable)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {BEAR_TRAP_PRESETS.map(p => (
                <button key={p.label} style={chip(selectedPresetLabel === p.label)}
                  onClick={() => set({ presetLabel: p.label, ratio: p.ratio || ratio })}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#9aa59e", marginBottom: 6 }}>Order: Infantry / Lancer / Marksman</div>
            <RatioInputs ratio={ratio} onChange={r => set({ ratio: r, presetLabel: "Custom" })} />
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#9aa59e", marginBottom: 6 }}>Order: Infantry / Lancer / Marksman</div>
            <RatioInputs
              ratio={{ infantry: exact.infantry, lancer: exact.lancer, marksman: exact.marksman }}
              onChange={r => set({ exactAmounts: r })}
            />
          </>
        )}
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <label style={label}>If you don't have enough troops for every squad</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={chip((strategy.allocStrategy || "equalSquads") === "equalSquads")}
            onClick={() => set({ allocStrategy: "equalSquads" })}>Equal squads</button>
          <button style={chip(strategy.allocStrategy === "fillInOrder")}
            onClick={() => set({ allocStrategy: "fillInOrder" })}>Fill in order</button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={!!strategy.prioritiseMarksmen}
            onChange={e => set({ prioritiseMarksmen: e.target.checked })}
            style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13, color: "#24312c", fontWeight: 600 }}>Prioritise Marksmen</span>
        </label>
      </div>

      {/* Rally leader march */}
      <div style={{ ...card, marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: rallyLeader.enabled ? 12 : 0 }}>
          <input type="checkbox" checked={rallyLeader.enabled}
            onChange={e => set({ rallyLeader: { ...rallyLeader, enabled: e.target.checked } })}
            style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13, color: "#24312c", fontWeight: 600 }}>Add a rally-leader march</span>
        </label>

        {rallyLeader.enabled && (
          <div>
            <label style={{ ...label, fontSize: 10 }}>Your personal base deployment capacity</label>
            <div style={{ marginBottom: 10 }}>
              <NumberField value={rallyLeader.capacity} onChange={v => set({ rallyLeader: { ...rallyLeader, capacity: v } })} placeholder="e.g. 144,030" />
            </div>
            <label style={{ ...label, fontSize: 10 }}>Base rally capacity (whole rally, not your march)</label>
            <div style={{ marginBottom: 10 }}>
              <NumberField value={rallyLeader.baseRallyCapacity} onChange={v => set({ rallyLeader: { ...rallyLeader, baseRallyCapacity: v } })} placeholder="e.g. 800,000" />
            </div>
            <label style={{ ...label, fontSize: 10 }}>Other rally-capacity bonuses</label>
            <div style={{ marginBottom: 10 }}>
              <NumberField value={rallyLeader.otherRallyBonus} onChange={v => set({ rallyLeader: { ...rallyLeader, otherRallyBonus: v } })} placeholder="0" />
            </div>

            <div style={{ background: "rgba(237,242,236,0.5)", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5c7a6e", marginBottom: 4 }}>Your rally-leader march size</div>
              <div style={{ fontSize: 12, color: "#6f7a73" }}>Base personal capacity + buffs + Cyrille (Ursa's Bane) =</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(personalMarchSize)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9a7746", marginTop: 8, marginBottom: 4 }}>Total rally capacity (whole rally)</div>
              <div style={{ fontSize: 12, color: "#6f7a73" }}>Base rally + Cyrille (Entrapment) + other bonuses =</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(totalRallyCapacity)}</div>
              <div style={{ fontSize: 10, color: "#b8c0ba", marginTop: 6 }}>
                Never use the total rally capacity as your own march capacity — they're different numbers.
              </div>
            </div>

            <label style={{ ...label, fontSize: 10 }}>Rally-leader ratio (Infantry / Lancer / Marksman)</label>
            <RatioInputs ratio={rallyLeader.ratio} onChange={r => set({ rallyLeader: { ...rallyLeader, ratio: r } })} />
          </div>
        )}
      </div>

      {/* Bonus march */}
      <div style={{ ...card, marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: bonusMarch.enabled ? 12 : 0 }}>
          <input type="checkbox" checked={bonusMarch.enabled}
            onChange={e => set({ bonusMarch: { ...bonusMarch, enabled: e.target.checked } })}
            style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13, color: "#24312c", fontWeight: 600 }}>Add a bonus march</span>
        </label>

        {bonusMarch.enabled && (
          <div>
            <label style={{ ...label, fontSize: 10 }}>Capacity</label>
            <div style={{ marginBottom: 10 }}>
              <NumberField value={bonusMarch.capacity} onChange={v => set({ bonusMarch: { ...bonusMarch, capacity: v } })} placeholder="e.g. 136,500" />
            </div>
            <label style={{ ...label, fontSize: 10 }}>Ratio (Infantry / Lancer / Marksman)</label>
            <RatioInputs ratio={bonusMarch.ratio} onChange={r => set({ bonusMarch: { ...bonusMarch, ratio: r } })} />
          </div>
        )}
      </div>
    </>
  );
}

export default function StrategyStep({ event, marchSetup, strategy, onChange, onContinue, onBack }) {
  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>Strategy</div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
        {event === "crazyJoe"
          ? "Choose how Infantry and Lancers should be spread across your marches."
          : "Choose your troop ratio (or exact amounts), and set up any rally-leader or bonus march."}
      </p>

      {event === "crazyJoe"
        ? <CrazyJoeStrategy strategy={strategy} onChange={onChange} />
        : <BearTrapStrategy strategy={strategy} marchSetup={marchSetup} onChange={onChange} />}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ ...buttonSecondary, flex: 1 }}>Back</button>
        <button onClick={onContinue} style={{ ...buttonPrimary, flex: 2 }}>Calculate</button>
      </div>
    </div>
  );
}
