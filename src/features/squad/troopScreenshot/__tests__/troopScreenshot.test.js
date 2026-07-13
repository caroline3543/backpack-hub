import { buildResultFromWords } from "../index.js";
import { splitIntoColumns, associateTroopRows } from "../associateTroopRows.js";
import { matchTroopClass } from "../parseTroopLabel.js";
import { parseGameNumber } from "../parseGameNumber.js";

function word(text, x0, y0, x1, y1, confidence = 92) {
  return { text, confidence, bbox: { x0, y0, x1, y1 } };
}

// Geometry modelled directly on the real "Troops Preview" screenshot used
// for calibration — two columns, three rows, tier+class label directly
// above its count. This is the exact regression fixture from the spec.
function screenshotWords({ mirrorColumns = false } = {}) {
  const rows = [
    // [leftTier, leftClass, leftValue, rightTier, rightClass, rightValue]
    ["Apex", "Infantry", "196,477", "Apex", "Lancer", "192,541", 705, 760],
    ["Apex", "Marksman", "381,619", "Supreme", "Infantry", "46,964", 915, 970],
    ["Supreme", "Lancer", "48,374", "Supreme", "Marksman", "43,133", 1125, 1180],
  ];
  const leftX0 = mirrorColumns ? 635 : 105;
  const rightX0 = mirrorColumns ? 105 : 635;

  const words = [];
  rows.forEach(([lt, lc, lv, rt, rc, rv, labelY, valueY]) => {
    words.push(word(lt, leftX0, labelY, leftX0 + 100, labelY + 35));
    words.push(word(lc, leftX0 + 110, labelY, leftX0 + 400, labelY + 35));
    words.push(word(lv, leftX0, valueY, leftX0 + 280, valueY + 35));
    words.push(word(rt, rightX0, labelY, rightX0 + 100, labelY + 35));
    words.push(word(rc, rightX0 + 110, labelY, rightX0 + 400, labelY + 35));
    words.push(word(rv, rightX0, valueY, rightX0 + 280, valueY + 35));
  });

  // Header + chrome text
  words.push(
    word("Total", 90, 435, 200, 470), word("Troops", 210, 435, 350, 470),
    word("870.7K/909.1K", 90, 480, 350, 515),
    word("March", 420, 435, 520, 470), word("Queue", 530, 435, 640, 470),
    word("5/6", 420, 480, 500, 515),
    word("Injured", 800, 435, 950, 470),
    word("0/210.4K", 800, 480, 990, 515),
    word("All", 170, 290, 270, 335), word("City", 550, 290, 650, 335), word("Wilderness", 850, 290, 1050, 335),
  );

  return words;
}

describe("regression fixture — real Troops Preview screenshot", () => {
  test("produces the exact spec-defined totals", () => {
    const result = buildResultFromWords(screenshotWords());
    expect(result.totalsByClass.infantry).toBe(243441);
    expect(result.totalsByClass.lancer).toBe(240915);
    expect(result.totalsByClass.marksman).toBe(424752);
    expect(result.extractedVisibleTroopSum).toBe(909108);
  });

  test("preserves every tier individually before combining", () => {
    const result = buildResultFromWords(screenshotWords());
    expect(result.entries).toHaveLength(6);
    const byLabel = Object.fromEntries(result.entries.map(e => [`${e.normalisedTier} ${e.troopClass}`, e.count]));
    expect(byLabel["Apex infantry"]).toBe(196477);
    expect(byLabel["Supreme infantry"]).toBe(46964);
    expect(byLabel["Apex lancer"]).toBe(192541);
    expect(byLabel["Supreme lancer"]).toBe(48374);
    expect(byLabel["Apex marksman"]).toBe(381619);
    expect(byLabel["Supreme marksman"]).toBe(43133);
  });

  test("never cross-pairs a label with the other column's number", () => {
    const result = buildResultFromWords(screenshotWords());
    // The old bug specifically produced Infantry = 192541 + 43133 (both
    // from the right column). Assert that never happens again.
    const infantryTotal = result.totalsByClass.infantry;
    expect(infantryTotal).not.toBe(192541 + 43133);
    expect(infantryTotal).not.toBe(146964 + 43133);
  });

  test("header stats: Total Troops, March Queue, Injured", () => {
    const result = buildResultFromWords(screenshotWords());
    expect(result.displayedTroops.current).toBe(870700);
    expect(result.displayedTroops.maximum).toBe(909100);
    expect(result.marchQueue.current).toBe(5);
    expect(result.marchQueue.maximum).toBe(6);
    expect(result.injured.current).toBe(0);
    expect(result.injured.maximum).toBe(210400);
  });

  test("extracted sum validates against the displayed (abbreviated) total", () => {
    const result = buildResultFromWords(screenshotWords());
    expect(result.validation.displayedTotalMatchesExtractedSum).toBe(true);
    expect(result.validation.totalDifference).toBe(909108 - 909100);
  });

  test("keeps displayedTroops.current, .maximum, and extractedVisibleTroopSum as genuinely distinct values", () => {
    const result = buildResultFromWords(screenshotWords());
    expect(result.displayedTroops.current).not.toBe(result.extractedVisibleTroopSum);
    expect(result.displayedTroops.maximum).not.toBe(result.extractedVisibleTroopSum);
  });
});

describe("column association", () => {
  test("swapped left/right columns still produce correct per-class totals", () => {
    const result = buildResultFromWords(screenshotWords({ mirrorColumns: true }));
    expect(result.totalsByClass.infantry).toBe(243441);
    expect(result.totalsByClass.lancer).toBe(240915);
    expect(result.totalsByClass.marksman).toBe(424752);
  });

  test("splitIntoColumns finds a real two-column gap", () => {
    const { left, right, singleColumn } = splitIntoColumns(screenshotWords());
    expect(singleColumn).toBe(false);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
  });

  test("single-column layout (no wide gap) falls back gracefully", () => {
    const words = [
      word("Apex", 100, 100, 200, 135), word("Infantry", 210, 100, 400, 135),
      word("196,477", 100, 150, 300, 185),
    ];
    const { singleColumn } = splitIntoColumns(words);
    expect(singleColumn).toBe(true);
    const entries = associateTroopRows(words);
    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(196477);
  });
});

describe("tier count variations", () => {
  test("one tier per troop class", () => {
    const words = [
      word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135), word("196,477", 105, 150, 390, 185),
      word("Apex", 635, 100, 735, 135), word("Lancer", 745, 100, 1000, 135), word("192,541", 635, 150, 915, 185),
      word("Apex", 105, 300, 205, 335), word("Marksman", 215, 300, 545, 335), word("381,619", 105, 350, 390, 385),
    ];
    const result = buildResultFromWords(words);
    expect(result.totalsByClass.infantry).toBe(196477);
    expect(result.totalsByClass.lancer).toBe(192541);
    expect(result.totalsByClass.marksman).toBe(381619);
  });

  test("three or more tiers for one troop class", () => {
    const words = [
      word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135), word("100,000", 105, 150, 390, 185),
      word("Supreme", 105, 300, 250, 335), word("Infantry", 260, 300, 545, 335), word("50,000", 105, 350, 390, 385),
      word("Elite", 105, 500, 220, 535), word("Infantry", 230, 500, 515, 535), word("25,000", 105, 550, 390, 585),
    ];
    const result = buildResultFromWords(words);
    expect(result.totalsByClass.infantry).toBe(175000);
    expect(result.entries).toHaveLength(3);
  });

  test("different tier counts between troop classes (infantry has 2, lancer has 1)", () => {
    const words = [
      word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135), word("100,000", 105, 150, 390, 185),
      word("Supreme", 105, 300, 250, 335), word("Infantry", 260, 300, 545, 335), word("50,000", 105, 350, 390, 385),
      word("Apex", 635, 100, 735, 135), word("Lancer", 745, 100, 1000, 135), word("80,000", 635, 150, 915, 185),
    ];
    const result = buildResultFromWords(words);
    expect(result.totalsByClass.infantry).toBe(150000);
    expect(result.totalsByClass.lancer).toBe(80000);
  });
});

describe("missing data handling", () => {
  test("cropped screenshot missing the header", () => {
    const words = screenshotWords().filter(w => !["Total", "Troops", "870.7K/909.1K", "March", "Queue", "5/6", "Injured", "0/210.4K"].includes(w.text));
    const result = buildResultFromWords(words);
    expect(result.displayedTroops.maximum).toBeNull();
    expect(result.validation.displayedTotalMatchesExtractedSum).toBeNull();
    expect(result.totalsByClass.infantry).toBe(243441); // troop rows still work fine
  });

  test("cropped screenshot missing one troop row marks that class as unconfirmed, not zero-by-assumption", () => {
    const words = screenshotWords().filter(w => w.text !== "Marksman");
    const result = buildResultFromWords(words);
    expect(result.validation.missingTroopClasses).toContain("marksman");
    expect(result.warnings.some(w => /Marksman/i.test(w))).toBe(true);
  });

  test("a tier label with no readable count nearby is simply not extracted (not a crash, not a zero)", () => {
    const words = [word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135)];
    const result = buildResultFromWords(words);
    expect(result.entries).toHaveLength(0);
  });

  test("a readable count with no confident label nearby is not extracted", () => {
    const words = [word("196,477", 105, 150, 390, 185)];
    const result = buildResultFromWords(words);
    expect(result.entries).toHaveLength(0);
  });
});

describe("number formats", () => {
  test("no commas in troop counts", () => {
    const words = [
      word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135), word("196477", 105, 150, 390, 185),
    ];
    const result = buildResultFromWords(words);
    expect(result.totalsByClass.infantry).toBe(196477);
  });

  test("K and M abbreviations are expanded and flagged approximate", () => {
    expect(parseGameNumber("196.4K").value).toBe(196400);
    expect(parseGameNumber("196.4K").wasAbbreviated).toBe(true);
    expect(parseGameNumber("1.25M").value).toBe(1250000);
    expect(parseGameNumber("2M").value).toBe(2000000);
  });
});

describe("OCR substitution tolerance", () => {
  test("'rn' misread instead of 'm' in Marksman", () => {
    const match = matchTroopClass("Marksrnan");
    expect(match?.troopClass).toBe("marksman");
  });
  test("'I' misread as 'l' in Infantry", () => {
    const match = matchTroopClass("lnfantry");
    expect(match?.troopClass).toBe("infantry");
  });
  test("very short or unrelated text never false-positives", () => {
    expect(matchTroopClass("IX")).toBeNull();
    expect(matchTroopClass("Total")).toBeNull();
  });
});

describe("duplicate detection", () => {
  test("the same visual row detected twice by OCR is only counted once", () => {
    const words = [
      word("Apex", 105, 100, 205, 135), word("Infantry", 215, 100, 500, 135), word("196,477", 105, 150, 390, 185),
      // A near-identical duplicate detection of the same row (slightly jittered bbox).
      word("Apex", 106, 101, 206, 136), word("Infantry", 216, 101, 501, 136), word("196,477", 106, 151, 391, 186),
    ];
    const result = buildResultFromWords(words);
    expect(result.totalsByClass.infantry).toBe(196477);
    expect(result.validation.duplicateEntriesDetected).toBe(true);
  });
});

describe("march queue variations", () => {
  test.each([["0/6", 0, 6], ["5/6", 5, 6], ["6/6", 6, 6]])("%s parses to current=%i, maximum=%i", (text, current, maximum) => {
    const words = [word("March", 420, 435, 520, 470), word("Queue", 530, 435, 640, 470), word(text, 420, 480, 500, 515)];
    const result = buildResultFromWords(words);
    expect(result.marchQueue.current).toBe(current);
    expect(result.marchQueue.maximum).toBe(maximum);
  });
});

describe("selected tab detection", () => {
  test("lighter background tab is detected as selected", () => {
    const words = [
      word("All", 170, 290, 270, 335), word("City", 550, 290, 650, 335), word("Wilderness", 850, 290, 1050, 335),
    ];
    const sampleColor = (x) => (x < 400 ? { r: 230, g: 235, b: 230 } : { r: 90, g: 140, b: 200 });
    const result = buildResultFromWords(words, { sampleColor });
    expect(result.selectedTab).toBe("all");
  });

  test("City tab selected triggers an incomplete-inventory warning", () => {
    const words = [
      ...screenshotWords(),
    ];
    const sampleColor = (x) => (x > 400 && x < 700 ? { r: 230, g: 235, b: 230 } : { r: 90, g: 140, b: 200 });
    const result = buildResultFromWords(words, { sampleColor });
    expect(result.selectedTab).toBe("city");
    expect(result.warnings.some(w => /City/i.test(w))).toBe(true);
  });

  test("without a colour sampler, selection is honestly reported as unknown, not guessed", () => {
    const words = [word("All", 170, 290, 270, 335), word("City", 550, 290, 650, 335)];
    const result = buildResultFromWords(words);
    expect(result.selectedTab).toBe("unknown");
  });
});

describe("empty input", () => {
  test("no words at all returns a well-shaped empty result instead of throwing", () => {
    const result = buildResultFromWords([]);
    expect(result.entries).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
