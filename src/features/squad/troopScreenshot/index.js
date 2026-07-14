// ─── index.js ─────────────────────────────────────────────────────────────────
// Orchestrates the full pipeline: preprocess → OCR → column-aware
// association → header parsing → validation → TroopScreenshotResult.
//
// `buildResultFromWords` is the pure, fully-testable core (see
// __tests__/troopScreenshot.test.js) — it takes plain word data in and
// returns a plain result out, with no Tesseract/canvas/File dependency.
// `TesseractTroopScreenshotParser.parse()` is the thin real-world wrapper
// that actually loads an image and runs OCR on it.

import { emptyTroopScreenshotResult } from "./types.js";
import { preprocessImage } from "./preprocessImage.js";
import { recognizeCanvas } from "./providers/tesseractProvider.js";
import { associateTroopRows } from "./associateTroopRows.js";
import { parseHeaderStats } from "./parseHeaderStats.js";
import { validateTroopResult } from "./validateTroopResult.js";

const LOW_CONFIDENCE_THRESHOLD = 0.70;

// Real screenshot text (labels, tier names, troop counts, header stats) has
// consistently come back at ~83-97 OCR confidence; misread icon glyphs and
// decorative UI chrome (checkmarks, arrows, badge outlines) come back at
// ~5-68 with no overlap between the two groups in practice. Filtering these
// out before column detection or association runs is what stops junk
// tokens from (a) sitting in the middle of a genuine column gap and
// shrinking it below the detection threshold, and (b) themselves forming
// false "column gap" evidence out of unrelated chrome text like a page
// title or a tab row, which is what caused a real production bug: two
// false-positive candidates (from "Troops Preview" and the All/City/
// Wilderness tab row) outvoted the one genuine troop-panel candidate in
// the median calculation, landing the split between a tier name and the
// troop class name that followed it.
const WORD_CONFIDENCE_FLOOR = 70;

function filterNoiseWords(words) {
  return words.filter(w => w.confidence === undefined || w.confidence >= WORD_CONFIDENCE_FLOOR);
}

/**
 * Pure core: given raw OCR words (+ optional colour sampler/image
 * dimensions), returns the full TroopScreenshotResult. No I/O.
 * @param {Array<{text:string, confidence:number, bbox:Object}>} words
 * @param {{ rawText?: string, sampleColor?: Function, imageWidth?: number, imageHeight?: number, preWarnings?: string[] }} [opts]
 * @returns {import('./types.js').TroopScreenshotResult}
 */
export function buildResultFromWords(words, opts = {}) {
  const { sampleColor, imageWidth, imageHeight, preWarnings = [] } = opts;

  if (!words || words.length === 0) {
    return emptyTroopScreenshotResult([...preWarnings, "No readable text was found in that image."]);
  }

  const cleanWords = filterNoiseWords(words);
  if (cleanWords.length === 0) {
    return emptyTroopScreenshotResult([...preWarnings, "No readable text was found in that image."]);
  }

  const header = parseHeaderStats(cleanWords, sampleColor);
  const rawEntries = associateTroopRows(cleanWords);
  const {
    entries, totalsByClass, extractedVisibleTroopSum, status, validation,
    warnings: validationWarnings,
  } = validateTroopResult({ entries: rawEntries, displayedTroops: header.displayedTroops });

  const warnings = [...preWarnings, ...header.warnings, ...validationWarnings];

  entries.forEach(e => {
    const overall = Math.min(e.labelConfidence, e.countConfidence || 1, e.associationConfidence);
    if (overall < LOW_CONFIDENCE_THRESHOLD) {
      warnings.push(`Low confidence on ${e.normalisedTier} ${e.troopClass}. We read ${e.count.toLocaleString()}. Please check this tier.`);
    }
  });

  const troopEntryConfidence = entries.length
    ? entries.reduce((s, e) => s + Math.min(e.labelConfidence, e.countConfidence || 1, e.associationConfidence), 0) / entries.length
    : 0;

  const confidenceInputs = [troopEntryConfidence, header.displayedTroops.confidence, header.marchQueue.confidence].filter(c => c > 0);
  const overallConfidence = confidenceInputs.length
    ? confidenceInputs.reduce((a, b) => a + b, 0) / confidenceInputs.length
    : 0;

  return {
    entries,
    totalsByClass,
    extractedVisibleTroopSum,
    status,
    displayedTroops: header.displayedTroops,
    marchQueue: header.marchQueue,
    injured: header.injured,
    selectedTab: header.selectedTab,
    // Explicit, unambiguous naming alongside the fields above — occupied/
    // total/available marches spelled out separately, since "2/6" is easy
    // to misread as "2 marches owned" rather than "2 of 6 in use."
    header: {
      availableTroops: header.displayedTroops.current,
      totalTroops: header.displayedTroops.maximum,
      occupiedMarches: header.marchQueue.current,
      totalMarches: header.marchQueue.maximum,
      availableMarches: (header.marchQueue.current !== null && header.marchQueue.maximum !== null)
        ? header.marchQueue.maximum - header.marchQueue.current
        : null,
    },
    validation,
    confidence: {
      overall: overallConfidence,
      troopEntries: troopEntryConfidence,
      displayedTroops: header.displayedTroops.confidence,
      marchQueue: header.marchQueue.confidence,
    },
    warnings,
    debug: {
      imageWidth: imageWidth ?? null,
      imageHeight: imageHeight ?? null,
      // Region-level detection (header / tabs / troop panel / nav bounding
      // boxes) is not implemented — this module works directly off word
      // positions rather than first segmenting named regions. Flagged as a
      // known limitation in the handoff rather than faked here.
      detectedRegions: [],
      rawOcrBlocks: words,
    },
  };
}

/**
 * TroopScreenshotParser implementation. parse(image: File) -> Promise<TroopScreenshotResult>
 */
export const TesseractTroopScreenshotParser = {
  async parse(file) {
    let pre;
    try {
      pre = await preprocessImage(file);
    } catch (e) {
      return emptyTroopScreenshotResult([e.message]);
    }

    let ocr;
    try {
      ocr = await recognizeCanvas(pre.canvas);
    } catch {
      return emptyTroopScreenshotResult([
        ...pre.warnings,
        "The screenshot could not be read. Try a clearer or less cropped image, or enter troop numbers manually.",
      ]);
    }

    return buildResultFromWords(ocr.words, {
      rawText: ocr.rawText,
      sampleColor: pre.sampleColor,
      imageWidth: pre.canvas.width,
      imageHeight: pre.canvas.height,
      preWarnings: pre.warnings,
    });
  },
};
