// ─── TroopsStep.jsx ───────────────────────────────────────────────────────────
// Step 1: Add Troops. Offers screenshot import (OCR, best-effort) or manual
// entry — either way, every value stays editable and nothing calculates
// silently on an uncertain read.

import { useState, useRef, useEffect } from "react";
import { parseTroopNumber, formatTroopNumber } from "../squadCalculations.js";
import { TesseractTroopParser, LOW_CONFIDENCE_THRESHOLD } from "../ocrParser.js";
import { card, label, input, heading, kicker, buttonPrimary, buttonSecondary, TROOP_COLORS, TROOP_LABELS } from "../squadStyles.js";

function TroopInput({ type, value, onChange, confidence }) {
  const [raw, setRaw] = useState(value ? formatTroopNumber(value) : "");
  useEffect(() => { setRaw(value ? formatTroopNumber(value) : ""); }, [value]);

  const lowConfidence = confidence !== undefined && confidence !== null && confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...label, color: TROOP_COLORS[type], display: "flex", alignItems: "center", gap: 6 }}>
        {TROOP_LABELS[type]}
        {lowConfidence && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#a06358",
            background: "rgba(160,99,88,0.1)", borderRadius: 99, padding: "1px 7px" }}>
            Please check
          </span>
        )}
      </label>
      <input
        style={{ ...input, border: lowConfidence ? "1px solid #a06358" : input.border }}
        type="text"
        inputMode="numeric"
        placeholder="e.g. 153,250 or 1.2M"
        value={raw}
        onChange={e => { setRaw(e.target.value); onChange(parseTroopNumber(e.target.value)); }}
        onBlur={() => setRaw(value ? formatTroopNumber(value) : "")}
      />
    </div>
  );
}

export default function TroopsStep({ inventory, onChange, onContinue }) {
  const [mode, setMode] = useState("choose"); // choose | manual | uploading | review
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confidence, setConfidence] = useState({});
  const [ocrWarnings, setOcrWarnings] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const total = inventory.infantry + inventory.lancer + inventory.marksman;

  const handleFile = async (file) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("uploading");
    setOcrWarnings([]);

    const result = await TesseractTroopParser.parse(file);
    onChange({
      infantry: result.inventory.infantry?.total || 0,
      lancer: result.inventory.lancer?.total || 0,
      marksman: result.inventory.marksman?.total || 0,
    });
    setConfidence(result.confidence);
    setOcrWarnings(result.warnings || []);
    setMode("review");
    // The image itself is never uploaded anywhere or persisted — it only
    // exists as a local object URL for this session's preview, and that URL
    // is revoked as soon as the component unmounts or a new file replaces it.
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
            We'll try to read Infantry, Lancer, and Marksman counts automatically. You'll
            always get a chance to review and correct them first.
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

  // mode === "manual" or "review"
  return (
    <div>
      <div style={kicker}>Squad Calculator</div>
      <div style={{ ...heading, marginBottom: 6 }}>
        {mode === "review" ? "Check your troops" : "Add your troops"}
      </div>
      <p style={{ fontSize: 14, color: "#6f7a73", lineHeight: 1.5, marginBottom: 18 }}>
        {mode === "review"
          ? "Here's what we could read from your screenshot — correct anything that looks off before continuing."
          : "Enter how many of each troop type you currently have. You can use plain numbers, commas, or K/M/B shorthand (e.g. \"1.2M\")."}
      </p>

      {mode === "review" && previewUrl && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <img src={previewUrl} alt="Troop screenshot preview" style={{
            width: 64, height: 64, objectFit: "cover", borderRadius: 12, flexShrink: 0,
          }} />
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonSecondary, fontSize: 12, flex: 1 }}>
              Replace screenshot
            </button>
            <button onClick={() => { setMode("manual"); setOcrWarnings([]); }} style={{ ...buttonSecondary, fontSize: 12, flex: 1 }}>
              Continue without it
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {mode === "review" && ocrWarnings.length > 0 && (
        <div style={{ ...card, marginBottom: 14, background: "rgba(154,119,70,0.08)", border: "1px solid rgba(154,119,70,0.2)" }}>
          {ocrWarnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: "#9a7746", lineHeight: 1.5, marginBottom: i < ocrWarnings.length - 1 ? 6 : 0 }}>{w}</div>
          ))}
        </div>
      )}

      {mode === "review" && (
        <div style={{ fontSize: 11, color: "#b8c0ba", marginBottom: 14, lineHeight: 1.5 }}>
          This reads total troop counts only — tier-specific breakdowns (e.g. T10 vs T11) aren't extracted, so calculations use totals for each troop type.
        </div>
      )}

      <div style={{ ...card, marginBottom: 16 }}>
        <TroopInput type="infantry" value={inventory.infantry} confidence={confidence.infantry}
          onChange={v => onChange({ ...inventory, infantry: v })} />
        <TroopInput type="lancer" value={inventory.lancer} confidence={confidence.lancer}
          onChange={v => onChange({ ...inventory, lancer: v })} />
        <TroopInput type="marksman" value={inventory.marksman} confidence={confidence.marksman}
          onChange={v => onChange({ ...inventory, marksman: v })} />

        <div style={{ borderTop: "1px solid rgba(72,94,80,0.08)", paddingTop: 10, marginTop: 4,
          display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#6f7a73", fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#24312c" }}>{formatTroopNumber(total)}</span>
        </div>
      </div>

      {mode === "manual" && (
        <button onClick={() => setMode("choose")} style={{ ...buttonSecondary, marginBottom: 10 }}>
          ← Use a screenshot instead
        </button>
      )}

      <button
        onClick={onContinue}
        disabled={total <= 0}
        style={{ ...buttonPrimary, opacity: total <= 0 ? 0.5 : 1, cursor: total <= 0 ? "default" : "pointer" }}
      >
        Continue
      </button>
    </div>
  );
}
