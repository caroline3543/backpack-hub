// ─── squadStyles.js ───────────────────────────────────────────────────────────
// Shared style tokens, reusing the same palette/typography as the Backpack
// feature so the Squad Calculator doesn't feel like a bolted-on second app.

export const card = {
  background: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(74,92,80,0.09)",
  boxShadow: "0 4px 16px rgba(71,86,75,0.07)",
  borderRadius: 20,
  padding: 16,
};

export const label = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.15em", color: "#9aa59e", display: "block", marginBottom: 6,
};

export const input = {
  width: "100%", background: "white",
  border: "1px solid #e3e8e2", borderRadius: 14,
  padding: "12px 16px", fontSize: 16, color: "#24312c",
  outline: "none", fontFamily: "'DM Sans',sans-serif",
  boxSizing: "border-box", minHeight: 44,
};

export const heading = {
  fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 600, color: "#24312c",
};

export const kicker = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.2em", color: "#819286", marginBottom: 4,
};

export const buttonPrimary = {
  width: "100%", minHeight: 48, borderRadius: 16,
  background: "#78917f", color: "white",
  fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer",
};

export const buttonSecondary = {
  width: "100%", minHeight: 48, borderRadius: 16,
  background: "rgba(72,94,80,0.08)", color: "#6f7a73",
  fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
};

export const chip = (active) => ({
  padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700,
  minHeight: 44, display: "inline-flex", alignItems: "center",
  background: active ? "#78917f" : "rgba(255,255,255,0.7)",
  color: active ? "white" : "#6f7a73",
  border: active ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
  cursor: "pointer",
});

export const TROOP_COLORS = {
  infantry: "#6f8ca0",
  lancer: "#9a7746",
  marksman: "#a06358",
};

export const TROOP_LABELS = {
  infantry: "Infantry",
  lancer: "Lancer",
  marksman: "Marksman",
};
