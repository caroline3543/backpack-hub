// ─── squadCalculations.js ──────────────────────────────────────────────────────
// Pure, dependency-free calculation engine for the Squad Calculator. Nothing
// in this file touches React, the DOM, or localStorage — every function takes
// plain data in and returns plain data out, so it's fully unit-testable and
// safe to reuse from any future UI (or OCR pipeline) without modification.
//
// Troop values are always whole integers. Internally, ratio math uses
// floating point (unavoidable for shares/percentages), but every function
// that returns a troop allocation rounds down to integers via
// allocateByLargestRemainder() or Math.round()/Math.floor(), and every
// allocation is checked against real inventory before being returned.

export const TROOP_TYPES = ["infantry", "lancer", "marksman"];

// ── Number parsing ─────────────────────────────────────────────────────────

/**
 * Parses a troop-count string into a whole integer. Accepts plain numbers,
 * comma-separated numbers, and K/M/B abbreviations (case-insensitive).
 * Returns 0 for anything unparseable rather than throwing, since this is
 * meant to be used directly against live user input on every keystroke.
 */
export function parseTroopNumber(input) {
  if (input === null || input === undefined || input === "") return 0;
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input) : 0;
  }
  const cleaned = String(input).trim().toUpperCase().replace(/,/g, "");
  if (cleaned === "") return 0;

  const match = cleaned.match(/^(-?\d*\.?\d+)\s*([KMB])?$/);
  if (!match) {
    const fallback = Number(cleaned);
    return Number.isFinite(fallback) ? Math.round(fallback) : 0;
  }

  let value = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === "K") value *= 1_000;
  else if (suffix === "M") value *= 1_000_000;
  else if (suffix === "B") value *= 1_000_000_000;

  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** Formats an integer with thousands separators for display, e.g. 153250 -> "153,250". */
export function formatTroopNumber(n) {
  const v = Number(n) || 0;
  return Math.round(v).toLocaleString("en-US");
}

// ── Ratio math ──────────────────────────────────────────────────────────────

/**
 * Normalises arbitrary ratio "parts" (which don't need to sum to 100, e.g.
 * 1/9/20) into shares that sum to exactly 1. Returns all-zero shares if the
 * total is zero or negative, so callers can detect that as a distinct case
 * rather than getting a NaN.
 */
export function normaliseRatio(parts) {
  const total = TROOP_TYPES.reduce((sum, t) => sum + Math.max(0, Number(parts[t]) || 0), 0);
  const shares = {};
  TROOP_TYPES.forEach(t => {
    shares[t] = total > 0 ? Math.max(0, Number(parts[t]) || 0) / total : 0;
  });
  return shares;
}

/**
 * Splits an integer capacity across troop-type shares (which must sum to
 * ~1) into whole-number troop counts that sum to exactly `capacity` — no
 * more, no less. Uses the largest-remainder method: floor every share, then
 * hand out the leftover unallocated units one at a time to whichever types
 * had the largest fractional remainder (ties broken by fixed type order, so
 * results are deterministic).
 */
export function allocateByLargestRemainder(capacity, shares) {
  const cap = Math.max(0, Math.round(capacity));
  const raw = {};
  const floored = {};
  let flooredTotal = 0;

  TROOP_TYPES.forEach(t => {
    raw[t] = cap * (shares[t] || 0);
    floored[t] = Math.floor(raw[t]);
    flooredTotal += floored[t];
  });

  let remainder = cap - flooredTotal;
  const byRemainder = TROOP_TYPES
    .map(t => ({ t, frac: raw[t] - floored[t] }))
    .sort((a, b) => b.frac - a.frac || TROOP_TYPES.indexOf(a.t) - TROOP_TYPES.indexOf(b.t));

  const result = { ...floored };
  let i = 0;
  while (remainder > 0 && i < byRemainder.length) {
    result[byRemainder[i].t] += 1;
    remainder -= 1;
    i += 1;
  }
  return result;
}

// ── Deployment capacity ─────────────────────────────────────────────────────

/**
 * Combines a base deployment capacity with any number of enabled bonuses
 * (flat or percentage), returning both the effective total and a
 * line-by-line breakdown suitable for display. Percentage bonuses are
 * always computed against the BASE capacity, never compounded against each
 * other or against other flat bonuses — this is a deliberate, documented
 * choice since the actual game behaviour isn't confirmed either way.
 */
export function calculateEffectiveDeploymentCapacity(baseCapacity, bonuses = []) {
  const base = Math.max(0, Math.round(Number(baseCapacity) || 0));
  const breakdown = [{ label: "Base capacity", amount: base }];
  let effective = base;

  bonuses.filter(b => b.enabled).forEach(bonus => {
    let amount = 0;
    if (bonus.kind === "percent") {
      amount = Math.round(base * (Number(bonus.value) || 0) / 100);
    } else {
      amount = Math.round(Number(bonus.value) || 0);
    }
    effective += amount;
    breakdown.push({ label: bonus.name || "Bonus", amount });
  });

  return { effective, breakdown };
}

/** Ursa's Bane: flat personal deployment-capacity bonus for Bear Hunt. */
export function calculateCyrilleDeploymentBonus(level, perLevel = 3000, maxLevel = 10) {
  const clamped = Math.max(0, Math.min(maxLevel, Math.round(Number(level) || 0)));
  return clamped * perLevel;
}

/** Entrapment: flat total rally-capacity bonus for a Bear Hunt rally the player starts. */
export function calculateCyrilleRallyBonus(level, perLevel = 30000, maxLevel = 10) {
  const clamped = Math.max(0, Math.min(maxLevel, Math.round(Number(level) || 0)));
  return clamped * perLevel;
}

// ── Fair distribution across marches ────────────────────────────────────────

/**
 * "Water-fills" a total amount across marches with (possibly different)
 * capacities, such that every march's allocation differs from any other by
 * at most 1 unless a capacity ceiling forces otherwise, no march exceeds its
 * own capacity, and the total allocated never exceeds `totalAmount` or the
 * combined capacity. Returns one integer per march, in the same order as
 * `capacities`. This is the O(n log n) binary-search formulation of
 * "give everyone an equal share, capped at their own limit."
 */
export function waterFillCapacities(totalAmount, capacities) {
  const caps = capacities.map(c => Math.max(0, Math.round(c)));
  const n = caps.length;
  if (n === 0) return [];

  const totalCapacity = caps.reduce((a, b) => a + b, 0);
  const target = Math.max(0, Math.min(Math.round(totalAmount), totalCapacity));

  const sumAtLevel = (level) => caps.reduce((s, c) => s + Math.min(c, level), 0);

  let lo = 0, hi = Math.max(0, ...caps);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (sumAtLevel(mid) <= target) lo = mid; else hi = mid - 1;
  }
  const level = lo;

  const allocated = caps.map(c => Math.min(c, level));
  let used = allocated.reduce((a, b) => a + b, 0);
  let leftover = target - used;

  for (let i = 0; i < n && leftover > 0; i++) {
    if (allocated[i] < caps[i]) {
      allocated[i] += 1;
      leftover -= 1;
    }
  }
  return allocated;
}

// ── Inventory-aware clamping ─────────────────────────────────────────────────

/**
 * Given a desired {infantry, lancer, marksman} target for one formation and
 * how much of each troop type is actually left in inventory, returns what
 * can actually be allocated: each type is capped at whatever remains, and
 * if that creates a shortfall against the formation's intended size, the
 * shortfall is offered to other types (in `priorityOrder`) that still have
 * room within the formation and inventory. Never returns more of any type
 * than `remaining` has, and never returns a total above `capacity`.
 */
export function clampFormationToInventory(target, remaining, capacity, priorityOrder = ["marksman", "lancer", "infantry"]) {
  const allocated = {};
  TROOP_TYPES.forEach(t => {
    allocated[t] = Math.max(0, Math.min(Math.round(target[t] || 0), Math.round(remaining[t] || 0)));
  });

  const intendedTotal = Math.min(
    Math.round(capacity),
    TROOP_TYPES.reduce((s, t) => s + Math.max(0, Math.round(target[t] || 0)), 0)
  );
  let used = TROOP_TYPES.reduce((s, t) => s + allocated[t], 0);
  let shortfall = intendedTotal - used;

  for (const t of priorityOrder) {
    if (shortfall <= 0) break;
    const room = Math.round(remaining[t] || 0) - allocated[t];
    if (room > 0) {
      const add = Math.min(room, shortfall);
      allocated[t] += add;
      shortfall -= add;
    }
  }
  return allocated;
}

// ── Crazy Joe ────────────────────────────────────────────────────────────────

/**
 * Builds Crazy Joe formations: distributes Infantry and Lancers (and
 * optionally Marksmen) across the given marches.
 *
 * options:
 *   method: "even" | "ratio" | "priorityInfantry" | "priorityLancer"
 *   ratio?: { infantry, lancer } — used when method === "ratio"
 *   includeMarksmen?: boolean
 *   minPerMarch?: { infantry?, lancer? } — best-effort minimums, not a hard
 *     constraint solver; see squadCalculations.test.js for covered cases.
 */
export function calculateCrazyJoeFormations(inventory, marches, options = {}) {
  const { method = "even", ratio, includeMarksmen = false, minPerMarch = {} } = options;
  const capacities = marches.map(m => Math.max(0, Math.round(m.capacity)));
  const totalCapacity = capacities.reduce((a, b) => a + b, 0);

  const ownedInfantry = Math.max(0, Math.round(inventory.infantry || 0));
  const ownedLancer   = Math.max(0, Math.round(inventory.lancer || 0));
  const ownedMarksman = includeMarksmen ? Math.max(0, Math.round(inventory.marksman || 0)) : 0;

  const totalJoeTroops = ownedInfantry + ownedLancer + ownedMarksman;
  const amountToDistribute = Math.min(totalJoeTroops, totalCapacity);
  const perMarchTotals = waterFillCapacities(amountToDistribute, capacities);

  // Per-march type shares, derived from the selected method.
  let shares;
  if (method === "ratio" && ratio) {
    const norm = normaliseRatio({ infantry: ratio.infantry, lancer: ratio.lancer, marksman: 0 });
    shares = { infantry: norm.infantry, lancer: norm.lancer, marksman: 0 };
  } else if (method === "priorityInfantry") {
    shares = { infantry: 1, lancer: 0, marksman: 0 };
  } else if (method === "priorityLancer") {
    shares = { infantry: 0, lancer: 1, marksman: 0 };
  } else {
    // "even" — proportional to what's actually owned, so a full deploy
    // (case B) exactly matches owned inventory, and a partial deploy
    // (case A) depletes both types in the same proportion they're owned.
    const base = ownedInfantry + ownedLancer;
    shares = base > 0
      ? { infantry: ownedInfantry / base, lancer: ownedLancer / base, marksman: 0 }
      : { infantry: 0.5, lancer: 0.5, marksman: 0 };
  }
  if (includeMarksmen) {
    // Marksmen (when included) share the remaining pool evenly against
    // the combined I+L pool, proportional to how much of the total army
    // they represent — kept simple and clearly documented as an assumption
    // since the spec doesn't fully define ratio semantics once Marksmen
    // are opted in.
    const grandTotal = ownedInfantry + ownedLancer + ownedMarksman;
    const marksmanShare = grandTotal > 0 ? ownedMarksman / grandTotal : 0;
    const rest = 1 - marksmanShare;
    shares = {
      infantry: shares.infantry * rest,
      lancer: shares.lancer * rest,
      marksman: marksmanShare,
    };
  }

  const priorityOrder = method === "priorityLancer"
    ? ["lancer", "infantry", "marksman"]
    : ["infantry", "lancer", "marksman"];

  const remaining = { infantry: ownedInfantry, lancer: ownedLancer, marksman: ownedMarksman };
  const formations = marches.map((march, i) => {
    const slotTotal = perMarchTotals[i];
    const rawTarget = allocateByLargestRemainder(slotTotal, shares);
    let troops = clampFormationToInventory(rawTarget, remaining, capacities[i], priorityOrder);

    // Best-effort minimum enforcement: borrow from the other type within
    // this same march's own allocation if a minimum isn't met and there's
    // room to shift. Not a full constraint solver — flagged as a known
    // limitation in the handoff doc.
    if (minPerMarch.infantry && troops.infantry < minPerMarch.infantry) {
      const need = Math.min(minPerMarch.infantry - troops.infantry, troops.lancer);
      troops = { ...troops, infantry: troops.infantry + need, lancer: troops.lancer - need };
    }
    if (minPerMarch.lancer && troops.lancer < minPerMarch.lancer) {
      const need = Math.min(minPerMarch.lancer - troops.lancer, troops.infantry);
      troops = { ...troops, lancer: troops.lancer + need, infantry: troops.infantry - need };
    }

    TROOP_TYPES.forEach(t => { remaining[t] -= troops[t]; });

    const total = TROOP_TYPES.reduce((s, t) => s + troops[t], 0);
    return {
      id: march.id ?? `march-${i + 1}`,
      name: march.name || `March ${i + 1}`,
      role: "ordinary",
      capacity: capacities[i],
      troops,
      actualRatio: normaliseRatio(troops),
      unusedCapacity: capacities[i] - total,
      isComplete: total >= Math.min(capacities[i], slotTotal),
      warnings: [],
    };
  });

  const allocated = { infantry: 0, lancer: 0, marksman: 0 };
  formations.forEach(f => TROOP_TYPES.forEach(t => { allocated[t] += f.troops[t]; }));

  const inventoryUsed = { infantry: ownedInfantry, lancer: ownedLancer, marksman: ownedMarksman };
  const remainingInventory = {
    infantry: inventoryUsed.infantry - allocated.infantry,
    lancer: inventoryUsed.lancer - allocated.lancer,
    marksman: inventoryUsed.marksman - allocated.marksman,
  };

  const warnings = [];
  const totalAllocated = TROOP_TYPES.reduce((s, t) => s + allocated[t], 0);
  const totalRemaining = TROOP_TYPES.reduce((s, t) => s + remainingInventory[t], 0);
  const totalUnusedCapacity = totalCapacity - totalAllocated;

  if (totalJoeTroops > totalCapacity) {
    warnings.push(
      `You cannot deploy all your Infantry${includeMarksmen ? ", Lancers, and Marksmen" : " and Lancers"}. ` +
      `Available march space: ${formatTroopNumber(totalCapacity)}. ` +
      `You have ${formatTroopNumber(totalJoeTroops)}. ` +
      `${formatTroopNumber(totalRemaining)} will remain in your city.`
    );
  } else if (totalUnusedCapacity > 0) {
    warnings.push(
      `All Infantry${includeMarksmen ? ", Lancers, and Marksmen" : " and Lancers"} can be deployed. ` +
      `Unused capacity in this plan: ${formatTroopNumber(totalUnusedCapacity)} troops. ` +
      `This is not your account's overall training limit — just the space left in these ${marches.length} march(es).`
    );
  }

  return {
    formations,
    allocated,
    remaining: remainingInventory,
    totalCapacity,
    unusedCapacity: totalUnusedCapacity,
    warnings,
  };
}

// ── Bear Trap ────────────────────────────────────────────────────────────────

/**
 * Builds Bear Trap formations across an arbitrary list of march "slots"
 * (ordinary / rallyLeader / bonus), each with its own capacity and either a
 * ratio or an exact troop target.
 *
 * options:
 *   strategy: "equalSquads" | "fillInOrder"
 *   prioritiseMarksmen?: boolean
 */
export function calculateBearTrapFormations(inventory, marchSlots, options = {}) {
  const { strategy = "equalSquads", prioritiseMarksmen = false } = options;

  const owned = {
    infantry: Math.max(0, Math.round(inventory.infantry || 0)),
    lancer:   Math.max(0, Math.round(inventory.lancer || 0)),
    marksman: Math.max(0, Math.round(inventory.marksman || 0)),
  };

  // Resolve each slot's *intended* full-strength target (ignoring inventory
  // limits for now) from either its ratio or its exact amounts. Exact
  // amounts are capped to the slot's own capacity right here — if the user
  // entered more than the march can hold, we scale down proportionally
  // (largest-remainder) rather than silently overflowing the march.
  const intended = marchSlots.map(slot => {
    if (slot.exactAmounts) {
      const requested = {
        infantry: Math.max(0, Math.round(slot.exactAmounts.infantry || 0)),
        lancer:   Math.max(0, Math.round(slot.exactAmounts.lancer || 0)),
        marksman: Math.max(0, Math.round(slot.exactAmounts.marksman || 0)),
      };
      const requestedTotal = TROOP_TYPES.reduce((s, t) => s + requested[t], 0);
      if (requestedTotal > slot.capacity) {
        return allocateByLargestRemainder(slot.capacity, normaliseRatio(requested));
      }
      return requested;
    }
    const shares = normaliseRatio(slot.ratio || { infantry: 0, lancer: 0, marksman: 1 });
    return allocateByLargestRemainder(slot.capacity, shares);
  });

  const priorityOrder = prioritiseMarksmen
    ? ["marksman", "lancer", "infantry"]
    : ["infantry", "lancer", "marksman"];

  let formations;

  if (strategy === "fillInOrder") {
    const remaining = { ...owned };
    formations = marchSlots.map((slot, i) => {
      const target = intended[i];
      const troops = clampFormationToInventory(target, remaining, slot.capacity, priorityOrder);
      TROOP_TYPES.forEach(t => { remaining[t] -= troops[t]; });
      return buildFormation(slot, i, troops, target);
    });
  } else {
    // Equal squads: scale every slot's intended size down by the same
    // factor (driven by whichever troop type is most constrained overall),
    // so all formations shrink together rather than some staying full while
    // others come up empty.
    const totalIntended = { infantry: 0, lancer: 0, marksman: 0 };
    intended.forEach(t => TROOP_TYPES.forEach(k => { totalIntended[k] += t[k]; }));

    let scale = 1;
    TROOP_TYPES.forEach(k => {
      if (totalIntended[k] > 0) {
        scale = Math.min(scale, owned[k] / totalIntended[k]);
      }
    });
    scale = Math.max(0, Math.min(1, scale));

    const remaining = { ...owned };
    formations = marchSlots.map((slot, i) => {
      const target = intended[i];
      const scaledCapacity = Math.floor(
        TROOP_TYPES.reduce((s, k) => s + target[k], 0) * scale
      );
      const shares = slot.exactAmounts
        ? normaliseRatio(target)
        : normaliseRatio(slot.ratio || { infantry: 0, lancer: 0, marksman: 1 });
      const scaledTarget = allocateByLargestRemainder(scaledCapacity, shares);
      const troops = clampFormationToInventory(scaledTarget, remaining, slot.capacity, priorityOrder);
      TROOP_TYPES.forEach(t => { remaining[t] -= troops[t]; });
      return buildFormation(slot, i, troops, target);
    });
  }

  const allocated = { infantry: 0, lancer: 0, marksman: 0 };
  formations.forEach(f => TROOP_TYPES.forEach(t => { allocated[t] += f.troops[t]; }));

  const remainingInventory = {
    infantry: owned.infantry - allocated.infantry,
    lancer: owned.lancer - allocated.lancer,
    marksman: owned.marksman - allocated.marksman,
  };

  const totalCapacity = marchSlots.reduce((s, m) => s + m.capacity, 0);
  const totalAllocated = TROOP_TYPES.reduce((s, t) => s + allocated[t], 0);

  const warnings = [];
  const anyIncomplete = formations.some(f => !f.isComplete);
  if (anyIncomplete) {
    const totalIntended = { infantry: 0, lancer: 0, marksman: 0 };
    intended.forEach(t => TROOP_TYPES.forEach(k => { totalIntended[k] += t[k]; }));
    const intendedShares = normaliseRatio(totalIntended);
    const actualShares = normaliseRatio(allocated);
    const fmtPct = (shares) => TROOP_TYPES.map(t => (shares[t] * 100).toFixed(1)).join(" / ");
    warnings.push(
      `Requested overall ratio: ${fmtPct(intendedShares)} (Infantry/Lancer/Marksman). ` +
      `Actual overall allocation: ${fmtPct(actualShares)}. ` +
      `Your troops ran out before every formation could reach the requested ratio.`
    );
  }

  return {
    formations,
    allocated,
    remaining: remainingInventory,
    totalCapacity,
    unusedCapacity: totalCapacity - totalAllocated,
    warnings,
  };
}

function buildFormation(slot, index, troops, requestedTroops) {
  const total = TROOP_TYPES.reduce((s, t) => s + troops[t], 0);
  const requestedTotal = TROOP_TYPES.reduce((s, t) => s + (requestedTroops[t] || 0), 0);
  return {
    id: slot.id ?? `slot-${index + 1}`,
    name: slot.name || `Squad ${index + 1}`,
    role: slot.role || "ordinary",
    capacity: slot.capacity,
    troops,
    requestedRatio: requestedTroops,
    actualRatio: normaliseRatio(troops),
    unusedCapacity: slot.capacity - total,
    isComplete: total >= Math.min(slot.capacity, requestedTotal),
    warnings: total < requestedTotal
      ? [`Missing ${formatTroopNumber(requestedTotal - total)} troops from the requested formation.`]
      : [],
  };
}

// ── Summaries & validation ──────────────────────────────────────────────────

export function summariseUnallocatedTroops(inventory, allocated) {
  const remaining = {};
  TROOP_TYPES.forEach(t => {
    remaining[t] = Math.max(0, Math.round(inventory[t] || 0) - Math.round(allocated[t] || 0));
  });
  return remaining;
}

/**
 * Lightweight validation for common setup mistakes. Returns an array of
 * human-readable warning strings (empty if nothing's wrong) — deliberately
 * specific rather than generic, per the "avoid 'Invalid input'" requirement.
 */
export function validateFormationPlan({ marches, inventory, ratio }) {
  const warnings = [];

  if (!marches || marches.length === 0) {
    warnings.push("Add at least one march before calculating a formation.");
  } else {
    marches.forEach((m, i) => {
      if (!m.capacity || m.capacity <= 0) {
        warnings.push(`March ${i + 1} needs a capacity greater than 0.`);
      }
    });
  }

  if (ratio) {
    const total = TROOP_TYPES.reduce((s, t) => s + (Number(ratio[t]) || 0), 0);
    if (total <= 0) {
      warnings.push("Your ratio is all zeros — enter at least one non-zero value for Infantry, Lancer, or Marksman.");
    }
    TROOP_TYPES.forEach(t => {
      if ((Number(ratio[t]) || 0) < 0) {
        warnings.push(`${t[0].toUpperCase()}${t.slice(1)} ratio can't be negative.`);
      }
    });
  }

  if (inventory) {
    TROOP_TYPES.forEach(t => {
      if ((Number(inventory[t]) || 0) < 0) {
        warnings.push(`${t[0].toUpperCase()}${t.slice(1)} count can't be negative.`);
      }
    });
    if (TROOP_TYPES.every(t => (Number(inventory[t]) || 0) === 0)) {
      warnings.push("You haven't entered any troops yet.");
    }
  }

  return warnings;
}
