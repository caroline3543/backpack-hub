// ─── validateTroopResult.js ───────────────────────────────────────────────────
// Turns raw associated entries into validated totals: dedupes anything that
// looks like the same visual row detected twice, flags troop classes with
// no confident entry (never silently assumes zero), and compares the
// extracted sum against the displayed header total with a tolerance that
// accounts for the header value being an abbreviated, rounded display —
// never by silently editing the tier values to force a match.

import { TROOP_CLASSES } from "./types.js";

function boxesOverlap(a, b) {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > 0 && overlapY > 0;
}

/**
 * @param {{ entries: import('./types.js').ExtractedTroopEntry[], displayedTroops: import('./types.js').HeaderFraction, tolerancePercent?: number }} args
 */
export function validateTroopResult({ entries, displayedTroops, tolerancePercent = 0.2 }) {
  const warnings = [];

  // Dedupe: same class + tier appearing again with an overlapping bounding
  // box is almost certainly the same visual row detected twice (e.g. two
  // OCR passes, or a re-render artifact) — keep the first, drop the rest.
  const kept = [];
  let duplicateEntriesDetected = false;
  entries.forEach(entry => {
    const dup = kept.find(k =>
      k.troopClass === entry.troopClass &&
      boxesOverlap(k.boundingBox, entry.boundingBox)
    );
    if (dup) {
      duplicateEntriesDetected = true;
      return;
    }
    kept.push(entry);
  });

  const totalsByClass = { infantry: 0, lancer: 0, marksman: 0 };
  kept.forEach(e => { totalsByClass[e.troopClass] += e.count; });
  const extractedVisibleTroopSum = TROOP_CLASSES.reduce((s, c) => s + totalsByClass[c], 0);

  const missingTroopClasses = TROOP_CLASSES.filter(c =>
    !kept.some(e => e.troopClass === c)
  );

  let totalDifference = null;
  let totalDifferencePercent = null;
  let displayedTotalMatchesExtractedSum = null;

  if (displayedTroops && displayedTroops.maximum !== null && displayedTroops.maximum !== undefined) {
    totalDifference = extractedVisibleTroopSum - displayedTroops.maximum;
    totalDifferencePercent = displayedTroops.maximum > 0
      ? (totalDifference / displayedTroops.maximum) * 100
      : null;
    // Configurable tolerance: a value shown as "909.1K" has already been
    // rounded to one decimal place in K, i.e. it represents anything from
    // 909,050 to 909,149 — roughly ±50. We use a slightly wider
    // percentage-based tolerance on top of that to absorb additional OCR
    // noise, since the spec explicitly calls out that ±50 alone is too
    // tight to be robust against real-world extraction error.
    const tolerance = Math.max(75, Math.abs(displayedTroops.maximum) * (tolerancePercent / 100));
    displayedTotalMatchesExtractedSum = Math.abs(totalDifference) <= tolerance;
  }

  if (duplicateEntriesDetected) {
    warnings.push("Removed what looked like a duplicate reading of the same troop tier.");
  }
  if (missingTroopClasses.length > 0) {
    const names = missingTroopClasses.map(c => c[0].toUpperCase() + c.slice(1)).join(", ");
    warnings.push(`Couldn't confidently find ${names} on this screenshot. Verify whether you actually have none, or add it manually.`);
  }
  if (displayedTotalMatchesExtractedSum === true) {
    warnings.push(`The extracted troop entries total ${extractedVisibleTroopSum.toLocaleString()}, which matches the displayed total of approximately ${displayedTroops.maximum.toLocaleString()}.`);
  } else if (displayedTotalMatchesExtractedSum === false) {
    warnings.push(`We read ${extractedVisibleTroopSum.toLocaleString()} troops from the individual rows, but the screenshot total appears to be approximately ${displayedTroops.maximum.toLocaleString()}. Please check the highlighted entries.`);
  }

  return {
    entries: kept,
    totalsByClass,
    extractedVisibleTroopSum,
    validation: {
      totalDifference,
      totalDifferencePercent,
      displayedTotalMatchesExtractedSum,
      duplicateEntriesDetected,
      missingTroopClasses,
    },
    warnings,
  };
}
