// ─── TroopsStep.jsx ───────────────────────────────────────────────────────────
// Step 1: Add Troops. Screenshot import (via the troopScreenshot module) or
// manual entry. The review screen shows every extracted tier individually,
// editable, with the combined total per troop class computed automatically
// — never pre-combined before the user sees it.

import { useState, useRef, useEffect } from "react";
import { formatTroopNumber } from "../squadCalculations.js";
import { parseGameNumberValue } from "../troopScreenshot/parseGameNumber.js";
import { TesseractTroopScreenshotParser } from "../troopScreenshot/index.js";
import { card, label, input, heading, kicker, buttonPrimary, buttonSecondary, TROOP_COLORS, TROOP_LABELS } from "../squadStyles.js";

const TROOP_TYPES = ["infantry", "lancer", "marksman"];

function tiersFromEntries(entries) {
  const byType = { infantry: [], lancer: [], marksman: [] };
  entries.forEach(e => {
    byType[e.troopClass].push({
      id: e.id,
      name: e.normalisedTier || "Unconfirmed tier",
      count: e.count,
      confidence: e.requiresReview ? 0.5 : Math.min(e.labelConfidence, e.countConfidence || 1, e.associationConfidence),
    });
  });
  // Types with nothing extracted still get one blank manual-entry row so
  // the user can fill it in rather than the class silently defaulting to 0.
  TROOP_TYPES.forEach(t => {
    if (byType[t].length === 0) byType[t].push({ id: `${t}-manual`, name: "Total", count: 0, confidence: 1 });
  });
  return byType;
}

function combinedTotal(tiers) {
  return tiers.reduce((s, t) => s + (Number(t.count) || 0), 0);
}

function TierRow({ tier, type, onChangeCount, onRemove, canRemove }) {
  const [raw, setRaw] = useState(tier.count ? formatTroopNumber(tier.count) : "");
  useEffect(() => { setRaw(tier.count ? formatTroopNumber(tier.count) : ""); }, [tier.count]);
  const lowConfidence = tier.confidence < 0.70;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ flex: "0 0 92px", fontSize: 12, color: "#6f7a73", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tier.name}
        {lowConfidence && (
          <div style={{ fontSize: 9, fontWeight: 700, color: "#a06358" }}>Please check</div>
        )}
      </div>
      <input
        style={{ ...input, padding: "9px 12px", fontSize: 14, border: lowConfidence ? "1px solid #a06358" : input.border }}
        type="text" inputMode="numeric"
        value={raw}
        onChange={e => { setRaw(e.target.value); onChangeCount(parseGameNumberValue(e.target.value)); }}
        onBlur={() => setRaw(tier.count ? formatTroopNumber(tier.count) : "")}
      />
      {canRemove && (
        <button onClick={onRemove} style={{ width: 30, height: 30, borderRadius: 8, border: "none",
          background: "#fdf0ee", color: "#a1766e", cursor: "pointer", flexShrink: 0 }}>✕</button>
      )}
    </div>
  );
}

function TroopClassCard({ type, tiers, onChange }) {
  const total = combinedTotal(tiers);
  const updateTier = (id, count) => onChange(tiers.map(t => t.id === id ? { ...t, count } : t));
  const removeTier = (id) => onChange(tiers.filter(t => t.id !== id).length ? tiers.filter(t => t.id !== id) : [{ id: `${type}-manual`, name: "Total", count: 0, confidence: 1 }]);
  const addTier = () => onChange([...tiers, { id: `${type}-${Date.now()}`, name: "New tier", count: 0, confidence: 1 }]);

  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: TROOP_COLORS[type] }}>
          {TROOP_LABELS[type]}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(total)}</span>
      </div>
      {tiers.map(tier => (
        <TierRow key={tier.id} tier={tier} type={type}
          onChangeCount={c => updateTier(tier.id, c)}
          onRemove={() => removeTier(tier.id)}
          canRemove={tiers.length > 1}
        />
      ))}
      <button onClick={addTier} style={{ background: "none", border: "none", cursor: "pointer",
        fontSize: 12, color: "#78917f", fontWeight: 600, padding: "4px 0 0" }}>
        + Add another tier
      </button>
    </div>
  );
}

export default function TroopsStep({ inventory, onChange, onContinue, onMarchQueueDetected }) {
  const [mode, setMode] = useState("choose"); // choose | manual | uploading | review
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tiersByType, setTiersByType] = useState({ infantry: [], lancer: [], marksman: [] });
  const [screenshotSummary, setScreenshotSummary] = useState(null);
  const [debugData, setDebugData] = useState(null);
  const [ocrWarnings, setOcrWarnings] = useState([]);
  const [simpleView, setSimpleView] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // Keep the parent's simple {infantry,lancer,marksman} totals in sync
  // whenever the tier breakdown changes, in either mode.
  useEffect(() => {
    if (mode !== "review") return;
    onChange({
      infantry: combinedTotal(tiersByType.infantry),
      lancer: combinedTotal(tiersByType.lancer),
      marksman: combinedTotal(tiersByType.marksman),
    });
  }, [tiersByType, mode]); // eslint-disable-line -- onChange/inventory intentionally excluded, only tier edits should retrigger this

  const total = inventory.infantry + inventory.lancer + inventory.marksman;

  const handleFile = async (file) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("uploading");
    setOcrWarnings([]);

    const result = await TesseractTroopScreenshotParser.parse(file);
    setTiersByType(tiersFromEntries(result.entries));
    setOcrWarnings(result.warnings || []);
    setDebugData({
      entries: result.entries.map(e => ({
        rawLabel: e.rawLabel, tier: e.normalisedTier, class: e.troopClass, count: e.count,
        rawCountText: e.rawCountText, requiresReview: e.requiresReview,
        confidence: { label: e.labelConfidence, tier: e.tierConfidence, count: e.countConfidence, association: e.associationConfidence },
        box: e.boundingBox, column: e.column,
      })),
      rawWords: (result.debug?.rawOcrBlocks || []).map(w => ({ text: w.text, confidence: w.confidence, bbox: w.bbox })),
    });
    setScreenshotSummary({
      extractedSum: result.extractedVisibleTroopSum,
      displayedMax: result.displayedTroops.maximum,
      matches: result.validation.displayedTotalMatchesExtractedSum,
      marchQueue: result.marchQueue,
      selectedTab: result.selectedTab,
    });
    if (result.marchQueue.maximum !== null && onMarchQueueDetected) {
      onMarchQueueDetected(result.marchQueue);
    }
    setMode("review");
  };

  const discardScreenshot = () => {
    setMode("manual");
    setOcrWarnings([]);
    setScreenshotSummary(null);
  };

  if (mode === "choose") {
    return (
      <div>
        <div style={kicker}>Squad Calculator</div>
        <div style={{ ...heading, marginBottom: 6 }}>Add your troops</div>
        <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
          Upload a screenshot of your troop inventory, or enter the numbers yourself.
        </p>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])} />

        <button onClick={() => fileInputRef.current?.click()} style={{ ...card, width: "100%", textAlign: "left",
          cursor: "pointer", border: "1px solid rgba(74,92,80,0.14)", font: "inherit", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 600, color: "#24312c", marginBottom: 4 }}>
            📷 Upload troop screenshot
          </div>
          <div style={{ fontSize: 13, color: "#6f7a73", lineHeight: 1.5 }}>
            We'll try to read every troop tier automatically. You'll always get a chance to review and correct them first.
          </div>
        </button>

        <button onClick={() => setMode("manual")} style={{ ...card, width: "100%", textAlign: "left",
          cursor: "pointer", border: "1px solid rgba(74,92,80,0.14)", font: "inherit" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 600, color: "#24312c", marginBottom: 4 }}>
            ⌨️ Enter troop numbers manually
          </div>
          <div style={{ fontSize: 13, color: "#6f7a73", lineHeight: 1.5 }}>
            Type in Infantry, Lancer, and Marksman counts yourself.
          </div>
        </button>
      </div>
    );
  }

  if (mode === "uploading") {
    return (
      <div>
        <div style={kicker}>Squad Calculator</div>
        <div style={{ ...heading, marginBottom: 14 }}>Reading your troops…</div>
        {previewUrl && (
          <img src={previewUrl} alt="Troop screenshot preview" style={{
            width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 16,
            marginBottom: 14, background: "rgba(72,94,80,0.05)",
          }} />
        )}
        <div style={{ fontSize: 13, color: "#6f7a73", textAlign: "center" }}>
          This runs entirely on your device — the image is never uploaded anywhere.
        </div>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div>
        <div style={kicker}>Squad Calculator</div>
        <div style={{ ...heading, marginBottom: 6 }}>Add your troops</div>
        <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
          Enter how many of each troop type you currently have. You can use plain numbers, commas, or K/M/B shorthand (e.g. "1.2M").
        </p>

        <ManualEntryFields inventory={inventory} onChange={onChange} />

        <button onClick={() => setMode("choose")} style={{ ...buttonSecondary, marginBottom: 10 }}>
          ← Use a screenshot instead
        </button>

        <button onClick={onContinue} disabled={total <= 0}
          style={{ ...buttonPrimary, opacity: total <= 0 ? 0.5 : 1, cursor: total <= 0 ? "default" : "pointer" }}>
          Continue
        </button>
      </div>
    );
  }

  // mode === "review"
  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>Check your troops</div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 14 }}>
        Here's what we could read from your screenshot — correct anything that looks off before continuing.
      </p>

      {previewUrl && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setShowFullPreview(true)}
            aria-label="View screenshot at full size"
            style={{
              display: "block", width: "100%", padding: 0, border: "1px solid rgba(74,92,80,0.14)",
              borderRadius: 16, cursor: "pointer", background: "rgba(72,94,80,0.04)", marginBottom: 8,
            }}>
            <img src={previewUrl} alt="Troop screenshot preview" style={{
              width: "100%", maxHeight: 340, objectFit: "contain", borderRadius: 16, display: "block",
            }} />
          </button>
          <div style={{ fontSize: 11, color: "#9aa59e", marginBottom: 8 }}>
            Tap the screenshot to view it full-size — handy for checking any value yourself.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonSecondary, fontSize: 12, flex: 1 }}>
              Replace screenshot
            </button>
            <button onClick={discardScreenshot} style={{ ...buttonSecondary, fontSize: 12, flex: 1 }}>
              Discard screenshot and enter manually
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {showFullPreview && previewUrl && (
        <div
          onClick={() => setShowFullPreview(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 700, background: "rgba(20,26,23,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
          <img src={previewUrl} alt="Troop screenshot, full size" style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12,
          }} />
          <button onClick={() => setShowFullPreview(false)} aria-label="Close" style={{
            position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: 20,
            background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>
      )}

      {screenshotSummary && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#9aa59e" }}>Extracted total</span>
            <span style={{ fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(screenshotSummary.extractedSum)}</span>
          </div>
          {screenshotSummary.displayedMax !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#9aa59e" }}>Screenshot total (approx.)</span>
              <span style={{ fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(screenshotSummary.displayedMax)}</span>
            </div>
          )}
          {screenshotSummary.matches !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#9aa59e" }}>Match</span>
              <span style={{ fontWeight: 700, color: screenshotSummary.matches ? "#5c7a6e" : "#a06358" }}>
                {screenshotSummary.matches ? "Yes" : "No"}
              </span>
            </div>
          )}
          {screenshotSummary.marchQueue?.maximum !== null && screenshotSummary.marchQueue?.current !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#9aa59e" }}>March queues</span>
              <span style={{ fontWeight: 700, color: "#24312c" }}>
                {screenshotSummary.marchQueue.current} of {screenshotSummary.marchQueue.maximum}
              </span>
            </div>
          )}
        </div>
      )}

      {ocrWarnings.length > 0 && (
        <div style={{ ...card, marginBottom: 14, background: "rgba(154,119,70,0.08)", border: "1px solid rgba(154,119,70,0.2)" }}>
          {ocrWarnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: "#9a7746", lineHeight: 1.5, marginBottom: i < ocrWarnings.length - 1 ? 6 : 0 }}>{w}</div>
          ))}
          {debugData && (
            <button onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(debugData, null, 2)).catch(() => {});
            }} style={{ ...buttonSecondary, fontSize: 11, marginTop: 10, minHeight: 34 }}>
              Copy diagnostic info (if this looks wrong, paste this back for a fix)
            </button>
          )}
        </div>
      )}

      <button onClick={() => setSimpleView(v => !v)} style={{
        background: "none", border: "none", cursor: "pointer", fontSize: 12,
        color: "#78917f", fontWeight: 600, padding: 0, marginBottom: 10, display: "block",
      }}>
        {simpleView ? "Show tier breakdown" : "Show simple view (combined totals only)"}
      </button>

      {!simpleView && (
        <div style={{ fontSize: 11, color: "#b8c0ba", marginBottom: 10, lineHeight: 1.5 }}>
          Per-tier amounts are editable — the combined total updates automatically.
        </div>
      )}

      {TROOP_TYPES.map(type => (
        simpleView ? (
          <div key={type} style={{ ...card, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: TROOP_COLORS[type] }}>
              {TROOP_LABELS[type]}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(combinedTotal(tiersByType[type]))}</span>
          </div>
        ) : (
          <TroopClassCard key={type} type={type} tiers={tiersByType[type]}
            onChange={tiers => setTiersByType(prev => ({ ...prev, [type]: tiers }))} />
        )
      ))}

      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "#6f7a73", fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(total)}</span>
      </div>

      <button onClick={onContinue} disabled={total <= 0}
        style={{ ...buttonPrimary, opacity: total <= 0 ? 0.5 : 1, cursor: total <= 0 ? "default" : "pointer" }}>
        Confirm troops
      </button>
    </div>
  );
}

function ManualEntryFields({ inventory, onChange }) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      {TROOP_TYPES.map(type => (
        <ManualField key={type} type={type} value={inventory[type]}
          onChange={v => onChange({ ...inventory, [type]: v })} />
      ))}
    </div>
  );
}

function ManualField({ type, value, onChange }) {
  const [raw, setRaw] = useState(value ? formatTroopNumber(value) : "");
  useEffect(() => { setRaw(value ? formatTroopNumber(value) : ""); }, [value]);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...label, color: TROOP_COLORS[type] }}>{TROOP_LABELS[type]}</label>
      <input
        style={input} type="text" inputMode="numeric" placeholder="e.g. 153,250 or 1.2M"
        value={raw}
        onChange={e => { setRaw(e.target.value); onChange(parseGameNumberValue(e.target.value)); }}
        onBlur={() => setRaw(value ? formatTroopNumber(value) : "")}
      />
    </div>
  );
}
