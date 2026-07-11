import { extractTroopsFromWords } from "./ocrParser.js";

// Synthetic Tesseract-shaped word data, geometrically modelled on the real
// "Troops Preview" screenshot supplied for calibration: two columns, three
// rows, each card's label ("Apex Infantry") sitting directly above its
// count ("196,477"), with a tier name as the first word of the label.
function word(text, x0, y0, x1, y1, confidence = 92) {
  return { text, confidence, bbox: { x0, y0, x1, y1 } };
}

function buildScreenshotWords() {
  return [
    // Row 1
    word("Apex", 105, 705, 215, 740), word("Infantry", 225, 705, 500, 740),
    word("196,477", 105, 760, 390, 795),
    word("Apex", 635, 705, 745, 740), word("Lancer", 755, 705, 1000, 740),
    word("192,541", 635, 760, 915, 795),
    // Row 2
    word("Apex", 105, 915, 215, 950), word("Marksman", 225, 915, 545, 950),
    word("381,619", 105, 970, 390, 1005),
    word("Supreme", 635, 915, 800, 950), word("Infantry", 810, 915, 1075, 950),
    word("46,964", 635, 970, 870, 1005),
    // Row 3
    word("Supreme", 105, 1125, 270, 1160), word("Lancer", 280, 1125, 540, 1160),
    word("48,374", 105, 1180, 355, 1215),
    word("Supreme", 635, 1125, 800, 1160), word("Marksman", 810, 1125, 1060, 1160),
    word("43,133", 635, 1180, 870, 1215),
    // Unrelated chrome text that shouldn't be picked up as a value.
    word("Troops", 170, 140, 340, 200), word("Preview", 350, 140, 545, 200),
    word("Total", 90, 435, 200, 470), word("Troops", 210, 435, 350, 470),
    word("870.7K/909.1K", 90, 480, 350, 515),
  ];
}

describe("extractTroopsFromWords — calibrated against a real screenshot", () => {
  test("sums both tiers correctly for each troop type", () => {
    const result = extractTroopsFromWords(buildScreenshotWords());
    expect(result.inventory.infantry.total).toBe(196477 + 46964); // 243,441
    expect(result.inventory.lancer.total).toBe(192541 + 48374);   // 240,915
    expect(result.inventory.marksman.total).toBe(381619 + 43133); // 424,752
  });

  test("grand total matches the screenshot's own reported total (909.1K)", () => {
    const result = extractTroopsFromWords(buildScreenshotWords());
    const grandTotal = result.inventory.infantry.total + result.inventory.lancer.total + result.inventory.marksman.total;
    expect(grandTotal).toBe(909108);
  });

  test("preserves per-tier breakdown", () => {
    const result = extractTroopsFromWords(buildScreenshotWords());
    expect(result.inventory.infantry.tiers.Apex).toBe(196477);
    expect(result.inventory.infantry.tiers.Supreme).toBe(46964);
    expect(result.inventory.lancer.tiers.Apex).toBe(192541);
    expect(result.inventory.lancer.tiers.Supreme).toBe(48374);
  });

  test("does not pick up unrelated numbers like the total-troops summary line", () => {
    const result = extractTroopsFromWords(buildScreenshotWords());
    // 870700 / 909100 should never appear as any troop type's value.
    Object.values(result.inventory).forEach(t => {
      expect(t.total).not.toBe(870700);
      expect(t.total).not.toBe(909100);
    });
  });

  test("reasonable confidence scores when OCR reads cleanly", () => {
    const result = extractTroopsFromWords(buildScreenshotWords());
    expect(result.confidence.infantry).toBeGreaterThanOrEqual(60);
    expect(result.confidence.lancer).toBeGreaterThanOrEqual(60);
    expect(result.confidence.marksman).toBeGreaterThanOrEqual(60);
  });

  test("low-confidence word triggers a warning on that specific type", () => {
    const words = buildScreenshotWords().map(w =>
      w.text === "381,619" ? { ...w, confidence: 5 } : w
    );
    const result = extractTroopsFromWords(words);
    expect(result.confidence.marksman).toBeLessThan(60);
    expect(result.warnings.some(w => w.includes("marksman"))).toBe(true);
  });

  test("missing a troop type entirely produces a specific warning, not a crash", () => {
    const words = buildScreenshotWords().filter(w => !w.text.includes("Lancer"));
    const result = extractTroopsFromWords(words);
    expect(result.inventory.lancer.total).toBe(0);
    expect(result.warnings.some(w => /lancer/i.test(w))).toBe(true);
  });

  test("empty word list returns zeros and a warning instead of throwing", () => {
    const result = extractTroopsFromWords([]);
    expect(result.inventory.infantry.total).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
