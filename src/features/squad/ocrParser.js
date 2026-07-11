// ─── ocrParser.js ─────────────────────────────────────────────────────────────
// TroopScreenshotParser abstraction: parse(image) -> { inventory, confidence,
// rawText, warnings }. Implemented with Tesseract.js loaded lazily from a
// CDN — nothing in this file is npm-installed, so the calculation engine and
// UI never have a hard dependency on any particular OCR provider. Swap
// TesseractTroopParser for a different implementation later without
// touching any caller.
//
// Calibrated against a real "Troops Preview" screenshot: troop cards are
// laid out as TWO lines per card — a tier+type label on top (e.g. "Apex
// Infantry") and the count directly BELOW it (e.g. "196,477"), not beside
// it. Multiple tier cards can exist per troop type (Apex, Supreme, etc.),
// so totals are the SUM across every matching card, and each tier's own
// value is preserved in `inventory[type].tiers`.

import { parseTroopNumber } from "./squadCalculations.js";

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const LOW_CONFIDENCE_THRESHOLD = 60; // Tesseract confidence is 0-100

const TYPE_PATTERNS = {
  infantry: /infantry/i,
  lancer: /lancer/i,
  marksman: /marks?man/i,
};

const NUMBER_TOKEN = /^-?\d[\d,]*\.?\d*[KMBkmb]?$/;

let loadPromise = null;

/** Lazily loads Tesseract.js from a CDN — only fetched the first time it's needed. */
function loadTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR library loaded but Tesseract was not found on window.")));
    script.onerror = () => reject(new Error("Couldn't load the OCR library — check your connection, or enter troop numbers manually."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Groups words into visual lines by vertical (y-range) overlap, top-to-bottom, each line sorted left-to-right. */
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

/**
 * Finds the number belonging to a label word: prefer a number-shaped word
 * roughly below it (within the next couple of lines) whose horizontal
 * center is nearest the label GROUP's center — the label group being the
 * tier-prefix + type words together (e.g. "Supreme" + "Infantry"), not
 * just the type word alone. Matching on the full group's span is what
 * keeps this from picking up the neighbouring column's number on a
 * multi-column layout (two cards can share a row, and a loose horizontal
 * overlap margin will otherwise happily match across both).
 */
function findValueForLabel(labelWord, labelLineIndex, lines, tierWord) {
  const groupX0 = tierWord ? Math.min(tierWord.bbox.x0, labelWord.bbox.x0) : labelWord.bbox.x0;
  const groupX1 = tierWord ? Math.max(tierWord.bbox.x1, labelWord.bbox.x1) : labelWord.bbox.x1;
  const groupCenter = (groupX0 + groupX1) / 2;
  const maxDist = Math.max(150, groupX1 - groupX0);

  for (let li = labelLineIndex + 1; li <= labelLineIndex + 2 && li < lines.length; li++) {
    const numbers = lines[li].filter(w => NUMBER_TOKEN.test(w.text.trim()));
    if (numbers.length === 0) continue;
    let best = null, bestDist = Infinity;
    for (const w of numbers) {
      const dist = Math.abs(xCenter(w) - groupCenter);
      if (dist < bestDist) { bestDist = dist; best = w; }
    }
    if (best && bestDist <= maxDist) return best;
  }
  const sameLine = lines[labelLineIndex].filter(w =>
    w !== labelWord && NUMBER_TOKEN.test(w.text.trim()) && w.bbox.x0 >= labelWord.bbox.x0
  );
  if (sameLine.length > 0) return sameLine[0];
  return null;
}

/** The word immediately before the type word on its line, if any — that's the tier name (e.g. "Apex", "Supreme"). */
function findTierWord(labelWord, line) {
  const idx = line.indexOf(labelWord);
  if (idx <= 0) return null;
  const prev = line[idx - 1];
  if (NUMBER_TOKEN.test(prev.text.trim())) return null; // a tier badge number, not a tier name
  return prev;
}

/**
 * Pure word-processing core: takes Tesseract-shaped word objects
 * ({ text, confidence, bbox: {x0,y0,x1,y1} }) and returns the extracted
 * troop inventory. Separated from the actual Tesseract.recognize() call so
 * this logic is fully unit-testable without mocking an OCR engine —
 * see ocrParser.test.js, which replays a real screenshot's word geometry.
 */
export function extractTroopsFromWords(words, rawText = "") {
  const cleanWords = words.filter(w => w.text && w.text.trim());
  if (cleanWords.length === 0) {
    return {
      inventory: { infantry: { total: 0 }, lancer: { total: 0 }, marksman: { total: 0 } },
      confidence: { infantry: 0, lancer: 0, marksman: 0 },
      rawText,
      warnings: ["No readable text was found in that image."],
    };
  }

  const lines = groupIntoLines(cleanWords);
  const inventory = { infantry: { total: 0, tiers: {} }, lancer: { total: 0, tiers: {} }, marksman: { total: 0, tiers: {} } };
  const confidenceSums = { infantry: [], lancer: [], marksman: [] };
  const warnings = [];

  lines.forEach((line, li) => {
    line.forEach(word => {
      for (const [type, pattern] of Object.entries(TYPE_PATTERNS)) {
        if (!pattern.test(word.text)) continue;
        const tierWord = findTierWord(word, line);
        const valueWord = findValueForLabel(word, li, lines, tierWord);
        if (!valueWord) continue;
        const value = parseTroopNumber(valueWord.text);
        const tierName = tierWord ? tierWord.text.trim() : `Tier ${Object.keys(inventory[type].tiers).length + 1}`;
        inventory[type].tiers[tierName] = (inventory[type].tiers[tierName] || 0) + value;
        inventory[type].total += value;
        confidenceSums[type].push(Math.min(word.confidence, valueWord.confidence));
      }
    });
  });

  const confidence = {};
  for (const type of Object.keys(TYPE_PATTERNS)) {
    const scores = confidenceSums[type];
    confidence[type] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    if (scores.length === 0) {
      warnings.push(`Couldn't find ${type[0].toUpperCase()}${type.slice(1)} on the screenshot — enter it manually.`);
    } else if (confidence[type] < LOW_CONFIDENCE_THRESHOLD) {
      warnings.push(`Low confidence on ${type} — please double-check this value.`);
    }
  }

  return { inventory, confidence, rawText, warnings };
}

/**
 * TroopScreenshotParser implementation backed by Tesseract.js.
 * parse(image: File) -> Promise<{ inventory, confidence, rawText, warnings }>
 */
export const TesseractTroopParser = {
  async parse(image) {
    const emptyResult = (warnings) => ({
      inventory: { infantry: { total: 0 }, lancer: { total: 0 }, marksman: { total: 0 } },
      confidence: { infantry: 0, lancer: 0, marksman: 0 },
      rawText: "",
      warnings,
    });

    let Tesseract;
    try {
      Tesseract = await loadTesseract();
    } catch (e) {
      return emptyResult([e.message]);
    }

    let data;
    try {
      const result = await Tesseract.recognize(image, "eng");
      data = result.data;
    } catch {
      return emptyResult(["The screenshot could not be read. Try a clearer or less cropped image, or enter troop numbers manually."]);
    }

    const words = (data.words || []).filter(w => w.text && w.text.trim());
    return extractTroopsFromWords(words, data.text);
  },
};

export { LOW_CONFIDENCE_THRESHOLD };
