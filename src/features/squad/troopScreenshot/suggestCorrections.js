// ─── suggestCorrections.js ────────────────────────────────────────────────────
// When the extracted total doesn't match the screenshot's displayed total,
// and exactly one row is already flagged for review, check whether that
// row's own alternate OCR reading (or a plausible missing leading digit)
// would reconcile the totals. If so, surface a structured suggestion for
// the user to confirm — never silently apply it. Arithmetic agreement is a
// clue, not permission to invent data.

const PLAUSIBLE_LEADING_PLACE_VALUES = [100000, 1000000, 10000, 1000];

function withinTolerance(diff, base) {
  const withinAbsolute = Math.abs(diff) <= 500;
  const withinPercent = base > 0 && Math.abs((diff / base) * 100) <= 0.1;
  return withinAbsolute || withinPercent;
}

/**
 * @param {{ entries: Array, extractedVisibleTroopSum: number, displayedTotalMatchesExtractedSum: boolean|null, displayedMaximum: number|null }} args
 * @returns {Object|null} a suggestion, or null if none applies
 */
export function suggestCorrections({ entries, extractedVisibleTroopSum, displayedTotalMatchesExtractedSum, displayedMaximum }) {
  if (displayedTotalMatchesExtractedSum !== false) return null; // only relevant when we know there's a mismatch
  if (displayedMaximum === null || displayedMaximum === undefined) return null;

  const reviewEntries = entries.filter(e => e.requiresReview);
  // Deliberately conservative: with more than one uncertain row, arithmetic
  // alone can't tell us which one (or which combination) is actually wrong
  // — that's the "a total mismatch alone cannot invent a value when
  // multiple rows are uncertain" requirement.
  if (reviewEntries.length !== 1) return null;

  const entry = reviewEntries[0];
  const baseTotal = extractedVisibleTroopSum - entry.count;

  // Candidate values to test, in priority order: an alternate reading OCR
  // itself already produced (highest confidence — this isn't a guess, it's
  // a real competing read), then plausible missing-leading-digit guesses.
  const candidates = [
    ...(entry.alternateCandidates || []).map(a => ({ value: a.count, fromAlternateRead: true })),
    ...PLAUSIBLE_LEADING_PLACE_VALUES.map(place => ({ value: entry.count + place, fromAlternateRead: false })),
  ];

  for (const candidate of candidates) {
    const reconciledTotal = baseTotal + candidate.value;
    const diff = reconciledTotal - displayedMaximum;
    if (withinTolerance(diff, displayedMaximum)) {
      return {
        rowId: entry.id,
        troopClass: entry.troopClass,
        tier: entry.normalisedTier,
        currentAmount: entry.count,
        suggestedAmount: candidate.value,
        reason: "Possible missing leading digit",
        reconciledTotal,
        wouldMatchScreenshotTotal: true,
        // An alternate value OCR itself already read independently is a much
        // stronger signal than "this arithmetic happens to work out" —
        // reflected directly in the confidence score, and surfaced to the
        // UI so it can auto-apply only for the two-independent-reads case
        // the spec calls out, never for the arithmetic-only case.
        confidence: candidate.fromAlternateRead ? 0.95 : 0.75,
      };
    }
  }

  return null;
}
