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
export function validateTroopResult({ entries, displayedTroops }) {
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
    // A value shown as "929.8K" is already rounded to one decimal place in
    // K — i.e. it represents anything from 929,750 to 929,849. Match if
    // either the absolute gap is small (≤500 troops) or the relative gap
    // is small (≤0.1%), since a fixed troop-count tolerance alone breaks
    // down for very large or very small armies.
    const withinAbsolute = Math.abs(totalDifference) <= 500;
    const withinPercent = totalDifferencePercent !== null && Math.abs(totalDifferencePercent) <= 0.1;
    displayedTotalMatchesExtractedSum = withinAbsolute || withinPercent;
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
    status: computeStatus(kept, missingTroopClasses, displayedTotalMatchesExtractedSum),
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

/**
 * "verified": a full, confident read with no rows needing review and a
 * total that matches the displayed header.
 * "partial": enough was read to be useful, but something needs a look —
 * a missing class, a low-confidence row, or a total mismatch.
 * "failed": too little was extracted to be useful at all.
 */
function computeStatus(entries, missingTroopClasses, totalsMatch) {
  if (entries.length === 0) return "failed";
  if (entries.length < 2 && missingTroopClasses.length >= 2) return "failed";
  const anyNeedsReview = entries.some(e => e.requiresReview);
  if (anyNeedsReview || missingTroopClasses.length > 0 || totalsMatch === false) return "partial";
  return "verified";
}
