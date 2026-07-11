import {
  parseTroopNumber,
  normaliseRatio,
  allocateByLargestRemainder,
  waterFillCapacities,
  clampFormationToInventory,
  calculateEffectiveDeploymentCapacity,
  calculateCyrilleDeploymentBonus,
  calculateCyrilleRallyBonus,
  calculateCrazyJoeFormations,
  calculateBearTrapFormations,
  summariseUnallocatedTroops,
  TROOP_TYPES,
} from "./squadCalculations.js";

// ── parseTroopNumber: K/M/B and comma-formatted OCR-style numbers ──────────
describe("parseTroopNumber", () => {
  test("plain integer", () => expect(parseTroopNumber("153250")).toBe(153250));
  test("comma-formatted", () => expect(parseTroopNumber("153,250")).toBe(153250));
  test("K suffix", () => expect(parseTroopNumber("153.25K")).toBe(153250));
  test("M suffix", () => expect(parseTroopNumber("1.2M")).toBe(1200000));
  test("B suffix", () => expect(parseTroopNumber("1.25B")).toBe(1250000000));
  test("lowercase suffix", () => expect(parseTroopNumber("1.2m")).toBe(1200000));
  test("empty/garbage returns 0, not a throw", () => {
    expect(parseTroopNumber("")).toBe(0);
    expect(parseTroopNumber("not a number")).toBe(0);
    expect(parseTroopNumber(null)).toBe(0);
    expect(parseTroopNumber(undefined)).toBe(0);
  });
  test("plain number input", () => expect(parseTroopNumber(42000)).toBe(42000));
});

// ── normaliseRatio ───────────────────────────────────────────────────────────
describe("normaliseRatio", () => {
  test("ratio that already sums to 100", () => {
    const shares = normaliseRatio({ infantry: 3, lancer: 27, marksman: 70 });
    expect(shares.infantry + shares.lancer + shares.marksman).toBeCloseTo(1);
    expect(shares.marksman).toBeCloseTo(0.7);
  });
  test("ratio that does not sum to 100 (parts like 1/9/20)", () => {
    const shares = normaliseRatio({ infantry: 1, lancer: 9, marksman: 20 });
    expect(shares.infantry + shares.lancer + shares.marksman).toBeCloseTo(1);
    expect(shares.marksman).toBeCloseTo(20 / 30);
  });
  test("zero infantry", () => {
    const shares = normaliseRatio({ infantry: 0, lancer: 30, marksman: 70 });
    expect(shares.infantry).toBe(0);
  });
  test("all zero returns all-zero shares, not NaN", () => {
    const shares = normaliseRatio({ infantry: 0, lancer: 0, marksman: 0 });
    TROOP_TYPES.forEach(t => expect(shares[t]).toBe(0));
  });
});

// ── allocateByLargestRemainder: integer conservation ────────────────────────
describe("allocateByLargestRemainder", () => {
  test("sums exactly to capacity for an awkward capacity", () => {
    const shares = normaliseRatio({ infantry: 3, lancer: 27, marksman: 70 });
    const result = allocateByLargestRemainder(144030, shares);
    expect(result.infantry + result.lancer + result.marksman).toBe(144030);
  });
  test("never produces negative values", () => {
    const result = allocateByLargestRemainder(100, { infantry: 0, lancer: 0, marksman: 1 });
    TROOP_TYPES.forEach(t => expect(result[t]).toBeGreaterThanOrEqual(0));
  });
  test("very small capacity still conserves total", () => {
    const shares = normaliseRatio({ infantry: 1, lancer: 1, marksman: 1 });
    const result = allocateByLargestRemainder(2, shares);
    expect(result.infantry + result.lancer + result.marksman).toBe(2);
  });
});

// ── waterFillCapacities: fairness across marches ────────────────────────────
describe("waterFillCapacities", () => {
  test("equal capacities split evenly, difference never exceeds 1", () => {
    const result = waterFillCapacities(100, [40, 40, 40]);
    const max = Math.max(...result), min = Math.min(...result);
    expect(max - min).toBeLessThanOrEqual(1);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });
  test("different capacity for every march", () => {
    const result = waterFillCapacities(1000, [174030, 174030, 144030, 144030, 144030, 136500]);
    result.forEach((v, i) => expect(v).toBeLessThanOrEqual([174030, 174030, 144030, 144030, 144030, 136500][i]));
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });
  test("never exceeds a march's own capacity even when demand is huge", () => {
    const caps = [100, 50, 200];
    const result = waterFillCapacities(1_000_000, caps);
    result.forEach((v, i) => expect(v).toBeLessThanOrEqual(caps[i]));
    expect(result.reduce((a, b) => a + b, 0)).toBe(caps.reduce((a, b) => a + b, 0));
  });
});

// ── clampFormationToInventory ───────────────────────────────────────────────
describe("clampFormationToInventory", () => {
  test("clamps to remaining inventory without going negative", () => {
    const result = clampFormationToInventory(
      { infantry: 100, lancer: 100, marksman: 100 },
      { infantry: 50, lancer: 200, marksman: 0 },
      300,
      ["marksman", "lancer", "infantry"]
    );
    expect(result.infantry).toBeLessThanOrEqual(50);
    expect(result.marksman).toBe(0);
    TROOP_TYPES.forEach(t => expect(result[t]).toBeGreaterThanOrEqual(0));
  });
});

// ── Cyrille ──────────────────────────────────────────────────────────────────
describe("Cyrille bonuses", () => {
  test("deployment bonus at level 0 is 0", () => expect(calculateCyrilleDeploymentBonus(0)).toBe(0));
  test("deployment bonus at level 10 is 30,000", () => expect(calculateCyrilleDeploymentBonus(10)).toBe(30000));
  test("rally bonus at level 10 is 300,000", () => expect(calculateCyrilleRallyBonus(10)).toBe(300000));
  test("levels above 10 are clamped", () => expect(calculateCyrilleDeploymentBonus(15)).toBe(30000));
  test("both skills active simultaneously are independent", () => {
    const deploy = calculateCyrilleDeploymentBonus(4);
    const rally = calculateCyrilleRallyBonus(7);
    expect(deploy).toBe(12000);
    expect(rally).toBe(210000);
  });
});

// ── Effective deployment capacity (flat + percent bonuses, plus Cyrille) ────
describe("calculateEffectiveDeploymentCapacity", () => {
  test("flat bonuses add directly to base", () => {
    const { effective, breakdown } = calculateEffectiveDeploymentCapacity(144030, [
      { name: "Pet bonus", kind: "flat", value: 12000, enabled: true },
      { name: "Deployment buff", kind: "flat", value: 10000, enabled: true },
    ]);
    expect(effective).toBe(166030);
    expect(breakdown).toHaveLength(3);
  });
  test("disabled bonuses are ignored", () => {
    const { effective } = calculateEffectiveDeploymentCapacity(100000, [
      { name: "Off", kind: "flat", value: 50000, enabled: false },
    ]);
    expect(effective).toBe(100000);
  });
  test("percent bonus computed against base only", () => {
    const { effective } = calculateEffectiveDeploymentCapacity(100000, [
      { name: "10% buff", kind: "percent", value: 10, enabled: true },
    ]);
    expect(effective).toBe(110000);
  });
  test("capacity buffs plus Cyrille combine as flat additions", () => {
    const cyrilleBonus = calculateCyrilleDeploymentBonus(5); // 15,000
    const { effective } = calculateEffectiveDeploymentCapacity(144030, [
      { name: "Pet bonus", kind: "flat", value: 12000, enabled: true },
      { name: "Cyrille (Ursa's Bane)", kind: "flat", value: cyrilleBonus, enabled: true },
    ]);
    expect(effective).toBe(144030 + 12000 + 15000);
  });
});

// ── Crazy Joe ────────────────────────────────────────────────────────────────
describe("calculateCrazyJoeFormations", () => {
  const marches = [{ capacity: 144030 }, { capacity: 144030 }, { capacity: 144030 }];

  test("more Infantry+Lancer than available space (Case A)", () => {
    const result = calculateCrazyJoeFormations(
      { infantry: 461300, lancer: 461300, marksman: 0 },
      marches
    );
    const totalAllocated = TROOP_TYPES.reduce((s, t) => s + result.allocated[t], 0);
    expect(totalAllocated).toBe(144030 * 3);
    expect(result.warnings.length).toBeGreaterThan(0);
    // Nothing allocated should exceed what's owned.
    expect(result.remaining.infantry).toBeGreaterThanOrEqual(0);
    expect(result.remaining.lancer).toBeGreaterThanOrEqual(0);
  });

  test("unused space when there's more than enough (Case B)", () => {
    const result = calculateCrazyJoeFormations(
      { infantry: 50000, lancer: 50000, marksman: 0 },
      marches
    );
    expect(result.allocated.infantry + result.allocated.lancer).toBe(100000);
    expect(result.unusedCapacity).toBe(144030 * 3 - 100000);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("Marksmen excluded by default", () => {
    const result = calculateCrazyJoeFormations(
      { infantry: 10000, lancer: 10000, marksman: 999999 },
      marches
    );
    expect(result.allocated.marksman).toBe(0);
  });

  test("Marksmen included when opted in", () => {
    const result = calculateCrazyJoeFormations(
      { infantry: 10000, lancer: 10000, marksman: 10000 },
      marches,
      { includeMarksmen: true }
    );
    expect(result.allocated.marksman).toBeGreaterThan(0);
  });

  test("never allocates more than owned", () => {
    const result = calculateCrazyJoeFormations(
      { infantry: 1000, lancer: 500, marksman: 0 },
      marches
    );
    expect(result.allocated.infantry).toBeLessThanOrEqual(1000);
    expect(result.allocated.lancer).toBeLessThanOrEqual(500);
  });
});

// ── Bear Trap ────────────────────────────────────────────────────────────────
describe("calculateBearTrapFormations", () => {
  function sixSlots(capacity = 144030) {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `s${i + 1}`,
      capacity,
      ratio: { infantry: 3, lancer: 27, marksman: 70 },
    }));
  }

  test("six normal squads plus one bonus squad", () => {
    const slots = [...sixSlots(), { id: "bonus", role: "bonus", capacity: 136500, ratio: { infantry: 3, lancer: 27, marksman: 70 } }];
    const result = calculateBearTrapFormations(
      { infantry: 1_000_000, lancer: 1_000_000, marksman: 1_000_000 },
      slots
    );
    expect(result.formations).toHaveLength(7);
    result.formations.forEach(f => {
      const total = TROOP_TYPES.reduce((s, t) => s + f.troops[t], 0);
      expect(total).toBeLessThanOrEqual(f.capacity);
    });
  });

  test("insufficient Marksmen triggers a warning and honest actual ratio", () => {
    const result = calculateBearTrapFormations(
      { infantry: 1_000_000, lancer: 1_000_000, marksman: 10000 },
      sixSlots()
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.allocated.marksman).toBeLessThanOrEqual(10000);
  });

  test("equal reduction across incomplete squads (equalSquads strategy)", () => {
    const result = calculateBearTrapFormations(
      { infantry: 3000, lancer: 27000, marksman: 70000 },
      sixSlots(),
      { strategy: "equalSquads" }
    );
    const totals = result.formations.map(f => TROOP_TYPES.reduce((s, t) => s + f.troops[t], 0));
    const max = Math.max(...totals), min = Math.min(...totals);
    expect(max - min).toBeLessThanOrEqual(3); // roughly equal, small integer rounding slack
  });

  test("fill-squads-in-order leaves later squads short first", () => {
    const result = calculateBearTrapFormations(
      { infantry: 3000, lancer: 27000, marksman: 70000 },
      sixSlots(),
      { strategy: "fillInOrder" }
    );
    const totals = result.formations.map(f => TROOP_TYPES.reduce((s, t) => s + f.troops[t], 0));
    expect(totals[0]).toBeGreaterThanOrEqual(totals[totals.length - 1]);
  });

  test("exact formation exceeding capacity is capped, not overflowed", () => {
    const result = calculateBearTrapFormations(
      { infantry: 1_000_000, lancer: 1_000_000, marksman: 1_000_000 },
      [{ id: "s1", capacity: 144030, exactAmounts: { infantry: 100000, lancer: 100000, marksman: 100000 } }]
    );
    const total = TROOP_TYPES.reduce((s, t) => s + result.formations[0].troops[t], 0);
    expect(total).toBeLessThanOrEqual(144030);
  });

  test("different capacity for every march is respected", () => {
    const slots = [174030, 174030, 144030, 144030, 144030, 136500].map((capacity, i) => ({
      id: `s${i + 1}`, capacity, ratio: { infantry: 10, lancer: 30, marksman: 60 },
    }));
    const result = calculateBearTrapFormations(
      { infantry: 1_000_000, lancer: 1_000_000, marksman: 1_000_000 },
      slots
    );
    result.formations.forEach((f, i) => expect(f.capacity).toBe(slots[i].capacity));
  });

  test("very small inventory still conserves total (no troops created or lost)", () => {
    const inventory = { infantry: 3, lancer: 2, marksman: 1 };
    const result = calculateBearTrapFormations(inventory, sixSlots(100));
    TROOP_TYPES.forEach(t => {
      expect(result.allocated[t] + result.remaining[t]).toBe(inventory[t]);
    });
  });
});

// ── Conservation invariant across the board ─────────────────────────────────
describe("summariseUnallocatedTroops / conservation", () => {
  test("allocated + remaining always equals original inventory", () => {
    const inventory = { infantry: 123456, lancer: 234567, marksman: 345678 };
    const allocated = { infantry: 100000, lancer: 200000, marksman: 300000 };
    const remaining = summariseUnallocatedTroops(inventory, allocated);
    TROOP_TYPES.forEach(t => {
      expect(allocated[t] + remaining[t]).toBe(inventory[t]);
    });
  });
});
