// ─── parseTroopLabel.js ───────────────────────────────────────────────────────
// Matches a single OCR word against the known troop classes, tolerating
// common OCR substitutions (rn/m, l/I/1, 0/O) via edit-distance rather than
// a combinatorial explosion of regex alternatives — one clear rule instead
// of trying to anticipate every possible misread by hand.
//
// Deliberately word-level, not "whole compound label" level: Tesseract
// already segments "Apex Infantry" into two separate word tokens in
// practice, so matching one word at a time against class names, and
// treating the previous word on the same line as the tier, is both simpler
// and matches the real data shape (see associateTroopRows.js).

import { KNOWN_TIER_NAMES } from "./types.js";

const CANONICAL_CLASSES = {
  infantry: "infantry",
  lancer: "lancer",
  marksman: "marksman",
};

function normalise(s) {
  return s
    .toLowerCase()
    .replace(/rn/g, "m")
    .replace(/[l1]/g, "i")
    .replace(/0/g, "o")
    .replace(/[^a-z]/g, "");
}

/** Classic Levenshtein edit distance — small, dependency-free, good enough at these string lengths. */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

const MAX_EDIT_DISTANCE = 2;

/**
 * @param {string} wordText
 * @returns {{ troopClass: string, confidence: number } | null}
 */
export function matchTroopClass(wordText) {
  const cleaned = normalise(wordText);
  if (cleaned.length < 4) return null; // too short to be any class name, avoid false positives

  let best = null;
  for (const [key, canonical] of Object.entries(CANONICAL_CLASSES)) {
    const dist = editDistance(cleaned, canonical);
    if (dist <= MAX_EDIT_DISTANCE && (!best || dist < best.dist)) {
      best = { troopClass: key, dist };
    }
  }
  if (!best) return null;

  // Ambiguous match: acceptable distance to more than one class at the same
  // distance means we genuinely can't tell — don't silently pick one.
  const tiedCount = Object.values(CANONICAL_CLASSES).filter(
    canonical => editDistance(cleaned, canonical) === best.dist
  ).length;
  if (tiedCount > 1) return null;

  const confidence = best.dist === 0 ? 1.0 : best.dist === 1 ? 0.85 : 0.65;
  return { troopClass: best.troopClass, confidence };
}

/**
 * @param {string} wordText
 * @returns {{ normalisedTier: string, isKnownTier: boolean }}
 */
export function normaliseTierName(wordText) {
  const trimmed = (wordText || "").trim().replace(/[^A-Za-z]/g, "");
  if (!trimmed) return { normalisedTier: "Unknown", isKnownTier: false };
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
  const isKnownTier = KNOWN_TIER_NAMES.includes(trimmed.toLowerCase());
  return { normalisedTier: capitalised, isKnownTier };
}
