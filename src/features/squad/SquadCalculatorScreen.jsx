// ─── SquadCalculatorScreen.jsx ────────────────────────────────────────────────
// Multi-step wizard: Troops → Event → Marches → Strategy → Results.
// Each step keeps its own props narrow and pushes changes back up here, so
// going back and forth between steps never loses previously entered data.

import { useState, useMemo, useCallback } from "react";
import TroopsStep from "./steps/TroopsStep.jsx";
import EventStep from "./steps/EventStep.jsx";
import MarchesStep from "./steps/MarchesStep.jsx";
import StrategyStep from "./steps/StrategyStep.jsx";
import ResultsStep from "./steps/ResultsStep.jsx";
import {
  calculateCrazyJoeFormations,
  calculateBearTrapFormations,
  calculateEffectiveDeploymentCapacity,
  calculateCyrilleDeploymentBonus,
} from "./squadCalculations.js";
import { CYRILLE_CONFIG } from "./cyrilleConfig.js";
import { useSquadPresets } from "./useSquadPresets.js";

const STEPS = ["troops", "event", "marches", "strategy", "results"];

const DEFAULT_MARCH_SETUP = {
  marchCount: 6,
  sameCapacity: true,
  baseCapacity: 0,
  marchCapacities: [],
  bonuses: [],
  cyrille: { enabled: false, ursasBaneLevel: 0, entrapmentLevel: 0 },
};

const DEFAULT_CRAZY_JOE_STRATEGY = { method: "even", ratio: { infantry: 50, lancer: 50 }, includeMarksmen: false };
const DEFAULT_BEAR_TRAP_STRATEGY = {
  allocationMethod: "ratio",
  presetLabel: "3 / 27 / 70",
  ratio: { infantry: 3, lancer: 27, marksman: 70 },
  exactAmounts: { infantry: 0, lancer: 0, marksman: 0 },
  allocStrategy: "equalSquads",
  prioritiseMarksmen: false,
  rallyLeader: { enabled: false, capacity: 0, ratio: { infantry: 3, lancer: 27, marksman: 70 }, baseRallyCapacity: 0, otherRallyBonus: 0 },
  bonusMarch: { enabled: false, capacity: 0, ratio: { infantry: 3, lancer: 27, marksman: 70 } },
};

function buildOrdinaryCapacities(marchSetup, cyrilleDeployBonus) {
  const n = marchSetup.marchCount || 0;
  const baseCapacities = marchSetup.sameCapacity
    ? Array.from({ length: n }, () => marchSetup.baseCapacity || 0)
    : (marchSetup.marchCapacities || []).slice(0, n);

  const bonuses = [
    ...marchSetup.bonuses,
    ...(cyrilleDeployBonus ? [{ name: "Cyrille (Ursa's Bane)", kind: "flat", value: cyrilleDeployBonus, enabled: true }] : []),
  ];

  // Percentage bonuses depend on each march's own base capacity, so this
  // has to run per march rather than once against a shared/dummy base —
  // otherwise a % buff always evaluates to 0.
  return baseCapacities.map(baseCap => calculateEffectiveDeploymentCapacity(baseCap, bonuses).effective);
}

function runCalculation(event, inventory, marchSetup, strategy) {
  const cyrille = marchSetup.cyrille;
  const deployBonus = cyrille?.enabled
    ? calculateCyrilleDeploymentBonus(cyrille.ursasBaneLevel, CYRILLE_CONFIG.ursasBane.perLevel, CYRILLE_CONFIG.ursasBane.maxLevel)
    : 0;

  if (event === "crazyJoe") {
    // Crazy Joe never automatically applies the Bear-Hunt-only Cyrille bonus.
    const capacities = buildOrdinaryCapacities(marchSetup, 0);
    const marches = capacities.map((capacity, i) => ({ id: `m${i + 1}`, name: `March ${i + 1}`, capacity }));
    return calculateCrazyJoeFormations(inventory, marches, {
      method: strategy.method,
      ratio: strategy.ratio,
      includeMarksmen: strategy.includeMarksmen,
    });
  }

  // Bear Trap
  const capacities = buildOrdinaryCapacities(marchSetup, deployBonus);
  const slots = capacities.map((capacity, i) => ({
    id: `s${i + 1}`,
    name: `Squad ${i + 1}`,
    role: "ordinary",
    capacity,
    ...(strategy.allocationMethod === "exact"
      ? { exactAmounts: strategy.exactAmounts }
      : { ratio: strategy.ratio }),
  }));

  if (strategy.rallyLeader?.enabled) {
    slots.push({
      id: "rally-leader",
      name: "Rally Leader",
      role: "rallyLeader",
      capacity: Math.max(0, Math.round(strategy.rallyLeader.capacity)) + deployBonus,
      ratio: strategy.rallyLeader.ratio,
    });
  }
  if (strategy.bonusMarch?.enabled) {
    slots.push({
      id: "bonus-march",
      name: "Bonus March",
      role: "bonus",
      capacity: Math.max(0, Math.round(strategy.bonusMarch.capacity)) + deployBonus,
      ratio: strategy.bonusMarch.ratio,
    });
  }

  return calculateBearTrapFormations(inventory, slots, {
    strategy: strategy.allocStrategy,
    prioritiseMarksmen: strategy.prioritiseMarksmen,
  });
}

export default function SquadCalculatorScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [inventory, setInventory] = useState({ infantry: 0, lancer: 0, marksman: 0 });
  const [event, setEvent] = useState(null);
  const [marchSetup, setMarchSetup] = useState(DEFAULT_MARCH_SETUP);
  const [crazyJoeStrategy, setCrazyJoeStrategy] = useState(DEFAULT_CRAZY_JOE_STRATEGY);
  const [bearTrapStrategy, setBearTrapStrategy] = useState(DEFAULT_BEAR_TRAP_STRATEGY);
  const { presets, savePreset, deletePreset } = useSquadPresets();

  const strategy = event === "crazyJoe" ? crazyJoeStrategy : bearTrapStrategy;
  const setStrategy = event === "crazyJoe" ? setCrazyJoeStrategy : setBearTrapStrategy;

  const step = STEPS[stepIndex];
  const [recalcNonce, setRecalcNonce] = useState(0);

  const result = useMemo(() => {
    if (step !== "results" || !event) return null;
    return runCalculation(event, inventory, marchSetup, strategy);
  }, [step, recalcNonce]); // eslint-disable-line -- intentionally not reacting to every keystroke, only step changes / explicit recalculate

  const goTo = useCallback((s) => setStepIndex(STEPS.indexOf(s)), []);
  const next = useCallback(() => setStepIndex(i => Math.min(STEPS.length - 1, i + 1)), []);
  const back = useCallback(() => setStepIndex(i => Math.max(0, i - 1)), []);

  const startOver = useCallback(() => {
    setStepIndex(0);
    setInventory({ infantry: 0, lancer: 0, marksman: 0 });
    setEvent(null);
    setMarchSetup(DEFAULT_MARCH_SETUP);
    setCrazyJoeStrategy(DEFAULT_CRAZY_JOE_STRATEGY);
    setBearTrapStrategy(DEFAULT_BEAR_TRAP_STRATEGY);
  }, []);

  const handleSavePreset = useCallback((name) => {
    savePreset({ name, event, marchSetup, strategy });
  }, [savePreset, event, marchSetup, strategy]);

  const handleLoadPreset = useCallback((preset) => {
    setEvent(preset.event);
    setMarchSetup(preset.marchSetup);
    if (preset.event === "crazyJoe") setCrazyJoeStrategy(preset.strategy);
    else setBearTrapStrategy(preset.strategy);
    goTo("marches");
  }, [goTo]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 4px 40px" }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i <= stepIndex ? "#78917f" : "rgba(72,94,80,0.12)",
          }} />
        ))}
      </div>

      {step === "troops" && (
        <TroopsStep inventory={inventory} onChange={setInventory} onContinue={next} />
      )}

      {step === "event" && (
        <EventStep onSelect={(id) => { setEvent(id); next(); }} onBack={back} />
      )}

      {step === "marches" && (
        <MarchesStep event={event} setup={marchSetup} onChange={setMarchSetup} onContinue={next} onBack={back} />
      )}

      {step === "strategy" && (
        <StrategyStep event={event} marchSetup={marchSetup} strategy={strategy} onChange={setStrategy} onContinue={next} onBack={back} />
      )}

      {step === "results" && (
        <ResultsStep
          event={event}
          result={result}
          onEditSettings={() => goTo("strategy")}
          onRecalculate={() => setRecalcNonce(n => n + 1)}
          onStartOver={startOver}
          onSavePreset={handleSavePreset}
        />
      )}

      {(step === "troops") && presets.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.15em", color: "#9aa59e", marginBottom: 8 }}>Saved presets</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {presets.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => handleLoadPreset(p)} style={{
                  flex: 1, textAlign: "left", padding: "10px 14px", borderRadius: 12,
                  background: "white", border: "1px solid rgba(72,94,80,0.12)",
                  fontSize: 13, fontWeight: 600, color: "#24312c", cursor: "pointer",
                }}>
                  {p.name}
                </button>
                <button onClick={() => deletePreset(p.id)} style={{
                  width: 36, height: 36, borderRadius: 10, border: "none",
                  background: "#fdf0ee", color: "#a1766e", cursor: "pointer", flexShrink: 0,
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
