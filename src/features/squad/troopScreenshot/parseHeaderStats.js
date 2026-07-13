// ─── parseHeaderStats.js ──────────────────────────────────────────────────────
// Reads the three header fractions (Total Troops, March Queue, Injured) and
// the selected location tab, independently of troop-row extraction.

import { parseGameNumber } from "./parseGameNumber.js";

function groupIntoLines(words) {
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
  lines.forEach(l => l.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  lines.sort((a, b) => a[0].bbox.y0 - b[0].bbox.y0);
  return lines;
}

function emptyFraction() {
  return { current: null, maximum: null, rawText: null, confidence: 0 };
}

function xCenter(w) { return (w.bbox.x0 + w.bbox.x1) / 2; }

/**
 * Looks for a "current/maximum" fraction within a small window of lines
 * below the label, picking whichever candidate is horizontally NEAREST to
 * labelX — not just the first one found. Total Troops / March Queue /
 * Injured commonly sit side-by-side on the exact same visual line (same
 * y-band, different x), which means their labels — and their fraction
 * values one line below — all get grouped into the same shared "line"
 * array. Taking the first match there would grab whichever section
 * happens to come first in reading order, regardless of which label it's
 * actually under; matching by nearest x fixes that the same way the troop
 * row association does.
 */
function extractFractionNear(lines, lineIndex, labelX, windowAfter = 2) {
  const candidates = [];
  for (let i = lineIndex; i <= lineIndex + windowAfter && i < lines.length; i++) {
    lines[i].forEach(w => candidates.push(w));
  }

  const glued = candidates
    .map(w => {
      const m = w.text.match(/^([\d.,]+\s*[KMBkmb]?)\s*\/\s*([\d.,]+\s*[KMBkmb]?)$/);
      if (!m) return null;
      const a = parseGameNumber(m[1]);
      const b = parseGameNumber(m[2]);
      if (a.value === null || b.value === null) return null;
      return { current: a.value, maximum: b.value, rawText: w.text.trim(),
        confidence: a.wasAbbreviated || b.wasAbbreviated ? 0.75 : 0.95, x: xCenter(w) };
    })
    .filter(Boolean);

  if (glued.length > 0) {
    glued.sort((p, q) => Math.abs(p.x - labelX) - Math.abs(q.x - labelX));
    const best = glued[0];
    return { current: best.current, maximum: best.maximum, rawText: best.rawText, confidence: best.confidence };
  }

  // Split-across-words fallback ("5", "/", "6"), same nearest-x preference.
  const split = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].text.trim() === "/" && i > 0 && i < candidates.length - 1) {
      const a = parseGameNumber(candidates[i - 1].text);
      const b = parseGameNumber(candidates[i + 1].text);
      if (a.value !== null && b.value !== null) {
        split.push({ current: a.value, maximum: b.value, rawText: `${candidates[i - 1].text}/${candidates[i + 1].text}`, confidence: 0.7, x: xCenter(candidates[i]) });
      }
    }
    const leadingSlash = candidates[i].text.match(/^\/(.+)$/);
    if (leadingSlash && i > 0) {
      const a = parseGameNumber(candidates[i - 1].text);
      const b = parseGameNumber(leadingSlash[1]);
      if (a.value !== null && b.value !== null) {
        split.push({ current: a.value, maximum: b.value, rawText: `${candidates[i - 1].text}${candidates[i].text}`, confidence: 0.65, x: xCenter(candidates[i]) });
      }
    }
  }
  if (split.length > 0) {
    split.sort((p, q) => Math.abs(p.x - labelX) - Math.abs(q.x - labelX));
    const best = split[0];
    return { current: best.current, maximum: best.maximum, rawText: best.rawText, confidence: best.confidence };
  }

  return emptyFraction();
}

function findLineAndX(lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    const matched = lines[i].filter(w => patterns.some(p => p.test(w.text)));
    if (matched.length > 0 && patterns.every(p => lines[i].some(w => p.test(w.text)))) {
      const x = matched.reduce((s, w) => s + xCenter(w), 0) / matched.length;
      return { lineIndex: i, x };
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const matched = lines[i].filter(w => patterns.some(p => p.test(w.text)));
    if (matched.length > 0) {
      const x = matched.reduce((s, w) => s + xCenter(w), 0) / matched.length;
      return { lineIndex: i, x };
    }
  }
  return { lineIndex: -1, x: null };
}

/**
 * @param {Array} words - full-image word list (not column-split)
 * @param {(x:number,y:number)=>{r:number,g:number,b:number}|null} [sampleColor] - optional pixel sampler for tab-selection detection
 * @returns {{ displayedTroops, marchQueue, injured, selectedTab, warnings: string[] }}
 */
export function parseHeaderStats(words, sampleColor) {
  const lines = groupIntoLines(words);
  const warnings = [];

  const totalTroops = findLineAndX(lines, [/total/i, /troops/i]);
  const displayedTroops = totalTroops.lineIndex >= 0
    ? extractFractionNear(lines, totalTroops.lineIndex, totalTroops.x)
    : emptyFraction();
  if (totalTroops.lineIndex < 0) warnings.push("Couldn't find the \"Total Troops\" header — that screenshot may be cropped.");

  const marchQueueLoc = findLineAndX(lines, [/march/i, /queue/i]);
  const marchQueue = marchQueueLoc.lineIndex >= 0
    ? extractFractionNear(lines, marchQueueLoc.lineIndex, marchQueueLoc.x)
    : emptyFraction();
  if (marchQueueLoc.lineIndex < 0) warnings.push("Couldn't find the \"March Queue\" count — you can enter it manually in the next step.");

  const injuredLoc = findLineAndX(lines, [/injured/i]);
  const injured = injuredLoc.lineIndex >= 0
    ? extractFractionNear(lines, injuredLoc.lineIndex, injuredLoc.x)
    : emptyFraction();

  // Tab detection: find the words, then (if we can sample pixel colour)
  // pick whichever tab's background is lightest, matching the real game's
  // "selected tab is pale, unselected tabs are blue" visual style. Without
  // a colour sampler, we genuinely can't tell which is selected from text
  // alone — all three labels are always visible — so we report "unknown"
  // rather than guessing.
  const tabWords = { all: null, city: null, wilderness: null };
  words.forEach(w => {
    const t = w.text.trim().toLowerCase();
    if (t === "all") tabWords.all = w;
    else if (t === "city") tabWords.city = w;
    else if (t === "wilderness") tabWords.wilderness = w;
  });

  let selectedTab = "unknown";
  if (sampleColor) {
    let best = null, bestLightness = -1;
    for (const [tab, word] of Object.entries(tabWords)) {
      if (!word) continue;
      const cx = (word.bbox.x0 + word.bbox.x1) / 2;
      const cy = word.bbox.y0 - (word.bbox.y1 - word.bbox.y0) * 0.8; // sample the pill background above the label text
      const color = sampleColor(cx, cy);
      if (!color) continue;
      const lightness = (color.r + color.g + color.b) / 3;
      if (lightness > bestLightness) { bestLightness = lightness; best = tab; }
    }
    if (best) selectedTab = best;
  }
  if (selectedTab === "unknown" && (tabWords.all || tabWords.city || tabWords.wilderness)) {
    warnings.push("Couldn't determine which tab (All/City/Wilderness) was selected — assuming it might not be \"All.\" Double-check your troops include everything you expect.");
  }
  if (selectedTab === "city") {
    warnings.push("This screenshot appears to show only City troops. Upload a screenshot with the All tab selected for a complete squad calculation.");
  } else if (selectedTab === "wilderness") {
    warnings.push("This screenshot appears to show only Wilderness troops. Upload a screenshot with the All tab selected for a complete squad calculation.");
  }

  return { displayedTroops, marchQueue, injured, selectedTab, warnings };
}
