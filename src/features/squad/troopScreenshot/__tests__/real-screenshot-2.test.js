import { buildResultFromWords } from "../index.js";
import realScreenshot2 from "./real-screenshot-2.fixture.json";

// This fixture is REAL Tesseract.js word-level output from an actual
// screenshot (not hand-modeled geometry) — captured via the app's own
// "Copy diagnostic info" button after a real production mismatch. It's the
// most valuable regression test in this suite because every bug it caught
// was a genuine production bug, not a hypothesis.
describe("real-screenshot-2 fixture (actual Tesseract output)", () => {
  test("5 of 6 tiers extracted exactly correctly", () => {
    const result = buildResultFromWords(realScreenshot2);
    const byKey = Object.fromEntries(result.entries.map(e => [`${e.normalisedTier} ${e.troopClass}`, e.count]));

    expect(byKey["Apex infantry"]).toBe(196402);
    expect(byKey["Apex marksman"]).toBe(382485);
    expect(byKey["Supreme infantry"]).toBe(53633);
    expect(byKey["Supreme lancer"]).toBe(55033);
    expect(byKey["Supreme marksman"]).toBe(49792);
  });

  test("infantry and marksman combined totals are exactly correct", () => {
    const result = buildResultFromWords(realScreenshot2);
    expect(result.totalsByClass.infantry).toBe(250035); // 196,402 + 53,633
    expect(result.totalsByClass.marksman).toBe(432277); // 382,485 + 49,792
  });

  test("known limitation: Apex Lancer is read as 92,541 instead of 192,541", () => {
    // Tesseract detected this specific number TWICE with different, both-
    // incomplete segmentation ("192," and "92,541" — overlapping bounding
    // boxes over the same glyphs). There's no way to reconstruct the true
    // value from two incomplete OCR reads without re-examining the source
    // image, which this module doesn't have access to at this stage. The
    // correct, honest behaviour is exactly what happens: pick the more
    // complete-looking read, and flag it low-confidence rather than
    // presenting it as reliable. This test exists to make that limitation
    // explicit and catch any regression in the flagging itself.
    const result = buildResultFromWords(realScreenshot2);
    const apexLancer = result.entries.find(e => e.troopClass === "lancer" && e.normalisedTier === "Apex");
    expect(apexLancer.count).toBe(92541);
    expect(apexLancer.requiresReview).toBe(true);
    expect(apexLancer.associationConfidence).toBeLessThan(0.6);
    expect(result.warnings.some(w => /lancer/i.test(w) && /check/i.test(w))).toBe(true);
  });

  test("header stats read correctly", () => {
    const result = buildResultFromWords(realScreenshot2);
    expect(result.header.availableTroops).toBe(761600);
    expect(result.header.totalTroops).toBe(929800);
    expect(result.header.occupiedMarches).toBe(2);
    expect(result.header.totalMarches).toBe(6);
    expect(result.header.availableMarches).toBe(4);
  });

  test("tier-badge digits and glued-on icon punctuation no longer corrupt real values", () => {
    // Regression guards for two specific fixed bugs: the "4" tier-badge
    // digit was previously picked over "196,402" as Apex Infantry's value,
    // and ")382,485" was previously rejected entirely because of the
    // leading ")" glued on by a misread icon.
    const result = buildResultFromWords(realScreenshot2);
    const apexInfantry = result.entries.find(e => e.troopClass === "infantry" && e.normalisedTier === "Apex");
    const apexMarksman = result.entries.find(e => e.troopClass === "marksman" && e.normalisedTier === "Apex");
    expect(apexInfantry.count).toBe(196402);
    expect(apexInfantry.count).not.toBe(4);
    expect(apexMarksman.count).toBe(382485);
  });

  test("noisy icon/chrome misreads (confidence <70) never influence column splitting", () => {
    // Regression guard for the real production bug: "Troops Preview" title
    // text and the All/City/Wilderness tab row previously produced false
    // column-split evidence that outvoted the genuine troop-panel split.
    const result = buildResultFromWords(realScreenshot2);
    const infantryEntry = result.entries.find(e => e.rawCountText === "196,402");
    expect(infantryEntry.troopClass).toBe("infantry");
    expect(infantryEntry.normalisedTier).toBe("Apex");
  });

  test("overall status reflects the one row that still needs review", () => {
    const result = buildResultFromWords(realScreenshot2);
    expect(result.status).toBe("partial");
  });
});
