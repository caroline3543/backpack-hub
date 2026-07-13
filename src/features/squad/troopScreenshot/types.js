// ─── types.js ─────────────────────────────────────────────────────────────────
// Data model for the troop screenshot parser, expressed as JSDoc typedefs
// rather than actual TypeScript — this app is plain JavaScript (Create
// React App, no TS toolchain), so this is the closest equivalent without a
// separate migration project. Editors that understand JSDoc (VS Code, etc.)
// still get real autocomplete/type-checking from this.
//
// Game configuration is kept here, separate from parsing logic, per the
// spec's "keep game configuration separate" requirement.

/** @typedef {"infantry" | "lancer" | "marksman"} TroopClass */
/** @typedef {"all" | "city" | "wilderness" | "unknown"} TroopLocationTab */

export const TROOP_CLASSES = ["infantry", "lancer", "marksman"];

// Known tier names are used only to *improve* confidence when matched —
// unknown tier names are always preserved, never discarded (per spec).
export const KNOWN_TIER_NAMES = ["apex", "supreme", "elite", "prime", "veteran"];

/**
 * @typedef {Object} BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} ExtractedTroopEntry
 * @property {string} id
 * @property {string} rawLabel
 * @property {string} normalisedTier
 * @property {TroopClass} troopClass
 * @property {number} count
 * @property {string} rawCountText
 * @property {number} labelConfidence
 * @property {number} countConfidence
 * @property {number} associationConfidence
 * @property {BoundingBox} boundingBox
 * @property {"left"|"right"|"unknown"} column
 */

/**
 * @typedef {Object} HeaderFraction
 * @property {number|null} current
 * @property {number|null} maximum
 * @property {string|null} rawText
 * @property {number} confidence
 */

/**
 * @typedef {Object} TroopScreenshotResult
 * @property {ExtractedTroopEntry[]} entries
 * @property {{infantry:number, lancer:number, marksman:number}} totalsByClass
 * @property {number} extractedVisibleTroopSum
 * @property {HeaderFraction} displayedTroops
 * @property {HeaderFraction} marchQueue
 * @property {HeaderFraction} injured
 * @property {TroopLocationTab} selectedTab
 * @property {Object} validation
 * @property {Object} confidence
 * @property {string[]} warnings
 * @property {Object} [debug]
 */

/** Confidence bands used to drive the review UI. */
export const CONFIDENCE_BANDS = {
  HIGH: 0.90,
  REVIEW: 0.70,
};

export function confidenceBand(score) {
  if (score >= CONFIDENCE_BANDS.HIGH) return "high";
  if (score >= CONFIDENCE_BANDS.REVIEW) return "review";
  return "check";
}

function emptyHeaderFraction() {
  return { current: null, maximum: null, rawText: null, confidence: 0 };
}

/** Builds an empty, well-shaped TroopScreenshotResult — used for early-exit error paths so every caller gets a consistent shape. */
export function emptyTroopScreenshotResult(warnings = []) {
  return {
    entries: [],
    totalsByClass: { infantry: 0, lancer: 0, marksman: 0 },
    extractedVisibleTroopSum: 0,
    displayedTroops: emptyHeaderFraction(),
    marchQueue: emptyHeaderFraction(),
    injured: emptyHeaderFraction(),
    selectedTab: "unknown",
    validation: {
      totalDifference: null,
      totalDifferencePercent: null,
      displayedTotalMatchesExtractedSum: null,
      duplicateEntriesDetected: false,
      missingTroopClasses: [...TROOP_CLASSES],
    },
    confidence: { overall: 0, troopEntries: 0, displayedTroops: 0, marchQueue: 0 },
    warnings,
  };
}
