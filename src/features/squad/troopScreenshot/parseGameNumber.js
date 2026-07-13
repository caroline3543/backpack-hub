// ─── parseGameNumber.js ───────────────────────────────────────────────────────
// Parses game-UI number text into a whole non-negative integer, tracking
// whether the source was an abbreviation (K/M/B) so callers can treat it as
// approximate rather than exact, and a confidence score for how sure the
// parse itself is (distinct from OCR word confidence, which is a separate
// signal layered on top by the caller).

const CLEAN_PATTERN = /^(\d[\d,\s]*\.?\d*|\.\d+)\s*([KMBkmb])?$/;

/**
 * @param {string} value
 * @returns {{ value: number|null, raw: string, confidence: number, wasAbbreviated: boolean }}
 */
export function parseGameNumber(value) {
  const raw = value == null ? "" : String(value);
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { value: null, raw, confidence: 0, wasAbbreviated: false };
  }

  // Spaces sometimes get OCR'd in place of commas in grouped numbers
  // (e.g. "196 477" instead of "196,477") — safe to fold back to commas
  // only when every group after the first is exactly 3 digits, which is
  // the one case that can't collide with a genuine decimal or two
  // separate numbers.
  let cleaned = trimmed.replace(/,/g, "");
  const spaceGroups = cleaned.split(/\s+/);
  if (spaceGroups.length > 1 && spaceGroups.slice(1).every(g => /^\d{3}$/.test(g))) {
    cleaned = spaceGroups.join("");
  } else {
    cleaned = cleaned.replace(/\s+/g, "");
  }

  const match = cleaned.match(CLEAN_PATTERN);
  if (!match) {
    return { value: null, raw, confidence: 0, wasAbbreviated: false };
  }

  const numeric = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return { value: null, raw, confidence: 0, wasAbbreviated: false };
  }

  const suffix = match[2] ? match[2].toUpperCase() : null;
  let multiplier = 1;
  if (suffix === "K") multiplier = 1_000;
  else if (suffix === "M") multiplier = 1_000_000;
  else if (suffix === "B") multiplier = 1_000_000_000;

  const value_ = Math.round(Math.max(0, numeric) * multiplier);

  // Abbreviated values are inherently approximate — a decimal K/M/B value
  // has already been rounded by the game UI before we ever saw it.
  const wasAbbreviated = suffix !== null;
  const confidence = wasAbbreviated ? 0.7 : 1.0;

  return { value: value_, raw, confidence, wasAbbreviated };
}

/**
 * Convenience wrapper returning just the integer (0 if unparseable) — used
 * anywhere the caller doesn't need confidence/abbreviation metadata, e.g.
 * quick manual-entry text fields.
 */
export function parseGameNumberValue(value) {
  return parseGameNumber(value).value ?? 0;
}

/** True if `text` looks like a number the game UI might show (with optional K/M/B suffix). */
export function looksLikeGameNumber(text) {
  if (!text) return false;
  return CLEAN_PATTERN.test(text.trim().replace(/,/g, ""));
}
