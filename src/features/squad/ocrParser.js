// ─── ocrParser.js ─────────────────────────────────────────────────────────────
// TroopScreenshotParser abstraction: parse(image) -> { inventory, confidence,
// rawText, warnings }. Implemented with Tesseract.js loaded lazily from a
// CDN — nothing in this file is npm-installed, so the calculation engine and
// UI never have a hard dependency on any particular OCR provider. Swap
// TesseractTroopParser for a different implementation later without
// touching any caller.
//
// Approach: rather than assuming fixed pixel crop-regions (which breaks the
// moment someone's on a different device, language, or cropped screenshot),
// this runs full-image OCR and then looks for the words "Infantry" /
// "Lancer" / "Marksman" and takes the nearest number token on roughly the
// same line. More robust to layout variation, at some cost to precision —
// that trade-off is exactly why every extracted value stays editable and
// nothing calculates silently on a low-confidence read.

import { parseTroopNumber } from "./squadCalculations.js";

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const LOW_CONFIDENCE_THRESHOLD = 60; // Tesseract confidence is 0-100

const LABEL_PATTERNS = {
  infantry: /^inf(antry)?[:.]?$/i,
  lancer: /^lancer[:.]?$/i,
  marksman: /^marks?man[:.]?$/i,
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

/** Same visual line if their vertical ranges overlap by more than half the shorter word's height. */
function sameLine(a, b) {
  const aH = a.bbox.y1 - a.bbox.y0;
  const bH = b.bbox.y1 - b.bbox.y0;
  const overlap = Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0);
  return overlap > Math.min(aH, bH) * 0.5;
}

function findNumberNear(labelWord, words) {
  const candidates = words.filter(w =>
    w !== labelWord &&
    NUMBER_TOKEN.test(w.text.trim()) &&
    sameLine(labelWord, w) &&
    w.bbox.x0 >= labelWord.bbox.x0 // number reads after the label, not before
  );
  if (candidates.length === 0) return null;
  // Nearest by horizontal distance.
  candidates.sort((a, b) => (a.bbox.x0 - labelWord.bbox.x1) - (b.bbox.x0 - labelWord.bbox.x1));
  return candidates[0];
}

/**
 * TroopScreenshotParser implementation backed by Tesseract.js.
 * parse(image: File) -> Promise<{ inventory, confidence, rawText, warnings }>
 */
export const TesseractTroopParser = {
  async parse(image) {
    const warnings = [];
    let Tesseract;
    try {
      Tesseract = await loadTesseract();
    } catch (e) {
      return {
        inventory: { infantry: { total: 0 }, lancer: { total: 0 }, marksman: { total: 0 } },
        confidence: { infantry: 0, lancer: 0, marksman: 0 },
        rawText: "",
        warnings: [e.message],
      };
    }

    let data;
    try {
      const result = await Tesseract.recognize(image, "eng");
      data = result.data;
    } catch {
      return {
        inventory: { infantry: { total: 0 }, lancer: { total: 0 }, marksman: { total: 0 } },
        confidence: { infantry: 0, lancer: 0, marksman: 0 },
        rawText: "",
        warnings: ["The screenshot could not be read. Try a clearer or less cropped image, or enter troop numbers manually."],
      };
    }

    const words = (data.words || []).filter(w => w.text && w.text.trim());
    const inventory = {};
    const confidence = {};

    for (const [type, pattern] of Object.entries(LABEL_PATTERNS)) {
      const labelWord = words.find(w => pattern.test(w.text.trim()));
      if (!labelWord) {
        inventory[type] = { total: 0 };
        confidence[type] = 0;
        warnings.push(`Couldn't find "${type[0].toUpperCase()}${type.slice(1)}" on the screenshot — enter it manually.`);
        continue;
      }
      const numberWord = findNumberNear(labelWord, words);
      if (!numberWord) {
        inventory[type] = { total: 0 };
        confidence[type] = 0;
        warnings.push(`Found "${type[0].toUpperCase()}${type.slice(1)}" but no nearby number — enter it manually.`);
        continue;
      }
      inventory[type] = { total: parseTroopNumber(numberWord.text) };
      confidence[type] = Math.round(Math.min(labelWord.confidence, numberWord.confidence));
      if (confidence[type] < LOW_CONFIDENCE_THRESHOLD) {
        warnings.push(`Low confidence on ${type} — please double-check this value.`);
      }
    }

    return { inventory, confidence, rawText: data.text, warnings };
  },
};

export { LOW_CONFIDENCE_THRESHOLD };
