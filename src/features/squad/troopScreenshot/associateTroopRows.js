// ─── associateTroopRows.js ────────────────────────────────────────────────────
// The fix for the real bug: split OCR words into left/right columns FIRST,
// then do line-grouping and label→number association independently within
// each column. The previous implementation grouped lines across the full
// image width, so once the two columns' internal row spacing drifted out of
// vertical sync (which real OCR output does — baselines aren't pixel-
// identical between columns), "look N lines below" could silently grab a
// number from the *other* column's card. Splitting into columns first makes
// that class of bug structurally impossible, not just less likely.

import { matchTroopClass, normaliseTierName } from "./parseTroopLabel.js";
import { parseGameNumber, looksLikeGameNumber } from "./parseGameNumber.js";

/** Groups words into visual lines by vertical (y-range) overlap across the full word set — used only to detect column structure, not for final association (see per-column groupIntoLines below). */
function groupIntoLinesForColumnDetection(words) {
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lines = [];
  for (const w of sorted) {
    const line = lines.find(l => {
      const ref = l[0];
      const overlap = Math.min(ref.bbox.y1, w.bbox.y1) - Math.max(ref.bbox.y0, w.bbox.y0);
      return overlap > Math.min(ref.bbox.y1 - ref.bbox.y0, w.bbox.y1 - w.bbox.y0) * 0.4;
    });
    if (line) line.push(w); else lines.push([w]);
  }
  return lines;
}

/**
 * Splits words into two columns. A single global "biggest gap between any
 * two word centers" is NOT a reliable column detector on its own — a wide
 * multi-word label (e.g. "Apex Infantry") can create a large gap relative
 * to a narrower number below it, in an otherwise genuinely single-column
 * layout, and falsely look like a column boundary. Instead, this looks for
 * a gap that recurs at roughly the same x-position across MULTIPLE lines —
 * that's what a real two-column layout actually looks like, and a stray
 * one-line gap (from label word-width variance) can't fake it.
 */
export function splitIntoColumns(words) {
  if (words.length === 0) return { left: [], right: [], singleColumn: true };

  const lines = groupIntoLinesForColumnDetection(words);
  const candidateSplits = [];

  lines.forEach(line => {
    if (line.length < 3) return; // a lone 2-word label ("Apex Infantry") has exactly
    // one inter-word gap and nothing to compare it against — never enough
    // evidence of a column boundary on its own. Need at least 3 words so a
    // genuine "gap between two side-by-side entries" can stand out against
    // at least one ordinary within-label gap on the same line.
    const xs = line.map(w => (w.bbox.x0 + w.bbox.x1) / 2).sort((a, b) => a - b);
    const lineWidth = Math.max(...line.map(w => w.bbox.x1)) - Math.min(...line.map(w => w.bbox.x0));
    let maxGap = 0, gapAt = null;
    for (let i = 1; i < xs.length; i++) {
      const gap = xs[i] - xs[i - 1];
      if (gap > maxGap) { maxGap = gap; gapAt = (xs[i] + xs[i - 1]) / 2; }
    }
    if (maxGap > lineWidth * 0.3) candidateSplits.push(gapAt);
  });

  // Need the same rough split point on at least 2 separate lines — a real
  // column boundary shows up consistently, a one-off label-width gap doesn't.
  if (candidateSplits.length < 2) {
    return { left: words, right: [], singleColumn: true };
  }

  candidateSplits.sort((a, b) => a - b);
  const splitAt = candidateSplits[Math.floor(candidateSplits.length / 2)]; // median, robust to outliers

  const left = words.filter(w => (w.bbox.x0 + w.bbox.x1) / 2 <= splitAt);
  const right = words.filter(w => (w.bbox.x0 + w.bbox.x1) / 2 > splitAt);

  // Sanity check: both sides need actual content, or this wasn't really a
  // two-column layout after all.
  if (left.length === 0 || right.length === 0) {
    return { left: words, right: [], singleColumn: true };
  }

  return { left, right, singleColumn: false, splitAt };
}

/** Groups words into visual lines by vertical (y-range) overlap, top-to-bottom, each line sorted left-to-right. Operates within ONE column's words only. */
function groupIntoLines(words) {
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lines = [];
  for (const w of sorted) {
    const line = lines.find(l => {
      const ref = l[0];
      const refH = ref.bbox.y1 - ref.bbox.y0;
      const wH = w.bbox.y1 - w.bbox.y0;
      const overlap = Math.min(ref.bbox.y1, w.bbox.y1) - Math.max(ref.bbox.y0, w.bbox.y0);
      return overlap > Math.min(refH, wH) * 0.4;
    });
    if (line) line.push(w);
    else lines.push([w]);
  }
  lines.forEach(l => l.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  lines.sort((a, b) => a[0].bbox.y0 - b[0].bbox.y0);
  return lines;
}

function xCenter(w) { return (w.bbox.x0 + w.bbox.x1) / 2; }

function digitCount(text) {
  return (text.match(/\d/g) || []).length;
}

function findValueBelow(labelWord, tierWord, labelLineIndex, lines, claimedWords) {
  const groupX0 = tierWord ? Math.min(tierWord.bbox.x0, labelWord.bbox.x0) : labelWord.bbox.x0;
  const groupX1 = tierWord ? Math.max(tierWord.bbox.x1, labelWord.bbox.x1) : labelWord.bbox.x1;
  const groupCenter = (groupX0 + groupX1) / 2;
  const maxDist = Math.max(150, groupX1 - groupX0);

  for (let li = labelLineIndex + 1; li <= labelLineIndex + 2 && li < lines.length; li++) {
    const allNumbers = lines[li].filter(w => looksLikeGameNumber(w.text) && !claimedWords.has(w));
    if (allNumbers.length === 0) continue;
    // Real troop counts are always at least a few thousand (4+ digits) in
    // practice; a bare 1-2 digit token nearby is almost always a tier
    // badge number, not the value — prefer substantial numbers when any
    // exist, only falling back to short ones if that's truly all there is.
    const substantial = allNumbers.filter(w => digitCount(w.text) >= 3);
    const numbers = substantial.length > 0 ? substantial : allNumbers;

    let best = null, bestDist = Infinity;
    for (const w of numbers) {
      const dist = Math.abs(xCenter(w) - groupCenter);
      if (dist < bestDist) { bestDist = dist; best = w; }
    }
    if (best && bestDist <= maxDist) {
      // A second candidate with a heavily overlapping bounding box is a red
      // flag that OCR detected the same physical number twice with
      // different (both possibly incomplete) segmentation — e.g. "192,"
      // and "92,541" both covering the same glyph region. We can't safely
      // reconstruct the true value without the source image, so surface
      // this as low confidence rather than silently trusting either read
      // — but we DO keep the alternate around, since arithmetic
      // reconciliation against the header total can sometimes tell us
      // which of the two was actually right (see suggestCorrections.js).
      const overlapping = numbers.find(w => w !== best && boxesOverlapSignificantly(w.bbox, best.bbox));
      const chosen = overlapping && digitCount(overlapping.text) > digitCount(best.text) ? overlapping : best;
      const alternate = overlapping ? (chosen === overlapping ? best : overlapping) : null;
      const ambiguous = !!overlapping;
      return {
        word: chosen,
        alternateWord: alternate,
        associationConfidence: ambiguous ? 0.4 : Math.max(0.5, 1 - bestDist / (maxDist * 2)),
      };
    }
  }
  const sameLine = lines[labelLineIndex].filter(w =>
    w !== labelWord && looksLikeGameNumber(w.text) && !claimedWords.has(w) && w.bbox.x0 >= labelWord.bbox.x0
  );
  if (sameLine.length > 0) return { word: sameLine[0], associationConfidence: 0.6 };
  return null;
}

function boxesOverlapSignificantly(a, b) {
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const overlapY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (overlapX <= 0 || overlapY <= 0) return false;
  const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
  const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
  const overlapArea = overlapX * overlapY;
  return overlapArea > Math.min(areaA, areaB) * 0.4;
}

function findTierWord(labelWord, line) {
  const idx = line.indexOf(labelWord);
  if (idx <= 0) return null;
  const prev = line[idx - 1];
  if (looksLikeGameNumber(prev.text)) return null; // a tier badge number, not a tier name
  if (matchTroopClass(prev.text)) return null; // another class word (e.g. duplicate-detection bleed-through), not a real tier name
  return prev;
}

let idCounter = 0;
function nextId() { idCounter += 1; return `entry-${idCounter}`; }

/**
 * Runs the full column-aware association for one column's words.
 * @returns {import('./types.js').ExtractedTroopEntry[]}
 */
function associateColumn(words, columnLabel) {
  const lines = groupIntoLines(words);
  const entries = [];
  const claimedWords = new Set();

  lines.forEach((line, li) => {
    line.forEach(word => {
      const match = matchTroopClass(word.text);
      if (!match) return;

      const tierWord = findTierWord(word, line);
      const found = findValueBelow(word, tierWord, li, lines, claimedWords);
      if (!found) return;
      claimedWords.add(found.word);

      // Honest null when no tier word was found — a fake "Unknown" string
      // reads as if a tier was actually detected and just happened to be
      // unrecognised; null makes clear no tier was read at all, so the UI
      // can prompt the user to fill it in rather than silently accepting it.
      const tierResult = tierWord ? normaliseTierName(tierWord.text) : null;
      const normalisedTier = tierResult ? tierResult.normalisedTier : null;
      const tierConfidence = tierResult ? (tierResult.isKnownTier ? 0.95 : 0.75) : 0;

      const parsed = parseGameNumber(found.word.text);
      if (parsed.value === null) return;

      const countConfidence = found.word.confidence !== undefined ? found.word.confidence / 100 : parsed.confidence;
      const requiresReview = normalisedTier === null || tierConfidence < 0.6 || countConfidence < 0.75 || found.associationConfidence < 0.6;

      const alternateCandidates = [];
      if (found.alternateWord) {
        const altParsed = parseGameNumber(found.alternateWord.text);
        if (altParsed.value !== null && altParsed.value !== parsed.value) {
          alternateCandidates.push({ count: altParsed.value, rawText: found.alternateWord.text });
        }
      }

      const labelBox = tierWord
        ? { x0: Math.min(tierWord.bbox.x0, word.bbox.x0), y0: Math.min(tierWord.bbox.y0, word.bbox.y0), x1: Math.max(tierWord.bbox.x1, word.bbox.x1), y1: Math.max(tierWord.bbox.y1, word.bbox.y1) }
        : word.bbox;

      entries.push({
        id: nextId(),
        rawLabel: tierWord ? `${tierWord.text} ${word.text}` : word.text,
        normalisedTier,
        troopClass: match.troopClass,
        count: parsed.value,
        rawCountText: found.word.text,
        labelConfidence: match.confidence,
        tierConfidence,
        countConfidence,
        associationConfidence: found.associationConfidence,
        requiresReview,
        alternateCandidates,
        boundingBox: {
          x: labelBox.x0, y: labelBox.y0,
          width: labelBox.x1 - labelBox.x0, height: labelBox.y1 - labelBox.y0,
        },
        column: columnLabel,
      });
    });
  });

  return entries;
}

/**
 * Full column-aware association: split into columns, associate each
 * independently, then merge. This is the entry point used by the parser.
 * @returns {import('./types.js').ExtractedTroopEntry[]}
 */
export function associateTroopRows(words) {
  const { left, right, singleColumn } = splitIntoColumns(words);
  if (singleColumn) {
    return associateColumn(left, "unknown");
  }
  return [
    ...associateColumn(left, "left"),
    ...associateColumn(right, "right"),
  ];
}
