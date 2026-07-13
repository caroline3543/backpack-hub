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

function findValueBelow(labelWord, tierWord, labelLineIndex, lines) {
  const groupX0 = tierWord ? Math.min(tierWord.bbox.x0, labelWord.bbox.x0) : labelWord.bbox.x0;
  const groupX1 = tierWord ? Math.max(tierWord.bbox.x1, labelWord.bbox.x1) : labelWord.bbox.x1;
  const groupCenter = (groupX0 + groupX1) / 2;
  const maxDist = Math.max(150, groupX1 - groupX0);

  for (let li = labelLineIndex + 1; li <= labelLineIndex + 2 && li < lines.length; li++) {
    const numbers = lines[li].filter(w => looksLikeGameNumber(w.text));
    if (numbers.length === 0) continue;
    let best = null, bestDist = Infinity;
    for (const w of numbers) {
      const dist = Math.abs(xCenter(w) - groupCenter);
      if (dist < bestDist) { bestDist = dist; best = w; }
    }
    if (best && bestDist <= maxDist) return { word: best, associationConfidence: Math.max(0.5, 1 - bestDist / (maxDist * 2)) };
  }
  const sameLine = lines[labelLineIndex].filter(w =>
    w !== labelWord && looksLikeGameNumber(w.text) && w.bbox.x0 >= labelWord.bbox.x0
  );
  if (sameLine.length > 0) return { word: sameLine[0], associationConfidence: 0.6 };
  return null;
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

  lines.forEach((line, li) => {
    line.forEach(word => {
      const match = matchTroopClass(word.text);
      if (!match) return;

      const tierWord = findTierWord(word, line);
      const found = findValueBelow(word, tierWord, li, lines);
      if (!found) return;

      const { normalisedTier } = normaliseTierName(tierWord ? tierWord.text : "Unknown");
      const parsed = parseGameNumber(found.word.text);
      if (parsed.value === null) return;

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
        countConfidence: found.word.confidence !== undefined ? found.word.confidence / 100 : parsed.confidence,
        associationConfidence: found.associationConfidence,
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
