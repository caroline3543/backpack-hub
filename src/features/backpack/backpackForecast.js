// ─── backpackForecast.js ──────────────────────────────────────────────────────
// Pure forecasting functions. No React, no side effects.
// Used by item rows, goals section, and growth insights.

/**
 * Get transactions for a specific item within an optional time window.
 */
export function getItemTransactions(transactions, itemId, sinceDate = null) {
  return transactions.filter(t => {
    if (t.itemId !== itemId) return false;
    if (sinceDate && new Date(t.date) < sinceDate) return false;
    return true;
  });
}

/**
 * Calculate net daily average gain over a rolling window (default 30 days).
 * Only transactions within the window count — older activity (e.g. a one-off
 * SvS resource dump) ages out naturally instead of permanently dragging
 * down the long-term average.
 *
 * The very first transaction for an item is still treated as a baseline
 * anchor and excluded from the movement total, but only when it falls
 * inside the window — this avoids the previous "since the beginning of time"
 * behaviour while still not double-counting the opening balance.
 *
 * resetAt (optional ISO timestamp): if provided and more recent than the
 * 30-day window would normally start, this becomes the effective floor —
 * everything before it is excluded entirely. This is what powers the
 * "Reset average" button for events like SvS where a single huge spend
 * would otherwise distort the average for weeks afterward.
 */
export function calcDailyAverage(transactions, itemId, windowDays = 30, resetAt = null) {
  const txs = transactions.filter(t => t.itemId === itemId);
  if (txs.length < 2) return 0;

  const sorted = [...txs].sort((a,b) => new Date(a.date) - new Date(b.date));
  const now = new Date();
  const rollingWindowStart = new Date(now);
  rollingWindowStart.setDate(rollingWindowStart.getDate() - windowDays);

  const windowStart = resetAt && new Date(resetAt) > rollingWindowStart
    ? new Date(resetAt)
    : rollingWindowStart;

  const baselineId = sorted[0].id;
  const inWindow = sorted.filter(t =>
    t.id !== baselineId && new Date(t.date) >= windowStart
  );
  if (inWindow.length === 0) return 0;

  const earliestInWindow = new Date(Math.max(
    windowStart.getTime(),
    new Date(sorted[0].date).getTime()
  ));
  const daySpan = Math.max(1, (now - earliestInWindow) / 86400000);

  const netGain = inWindow.reduce((sum, t) => {
    if (t.type === "gain" || t.type === "goal_contribution") return sum + Number(t.amount);
    if (t.type === "spend") return sum - Number(t.amount);
    return sum;
  }, 0);

  return netGain / daySpan;
}

/**
 * Calculate weekly average gain (rolling 30-day daily average × 7).
 */
export function calcWeeklyAverage(transactions, itemId, windowDays = 30, resetAt = null) {
  return calcDailyAverage(transactions, itemId, windowDays, resetAt) * 7;
}

/**
 * Compare this rolling window's daily average against the prior window
 * of equal length (e.g. last 30 days vs the 30 days before that).
 * Returns { current, previous, deltaPct, direction } where direction is
 * "up" | "down" | "flat" | "new" | "rebuilding".
 */
export function calcMonthOverMonth(transactions, itemId, windowDays = 30, resetAt = null) {
  const txs = transactions.filter(t => t.itemId === itemId);
  if (txs.length < 2) {
    return { current: 0, previous: 0, deltaPct: null, direction: "new" };
  }

  const sorted = [...txs].sort((a,b) => new Date(a.date) - new Date(b.date));
  const baselineId = sorted[0].id;

  const now = new Date();
  const windowStart    = new Date(now); windowStart.setDate(windowStart.getDate() - windowDays);
  const prevWindowStart = new Date(now); prevWindowStart.setDate(prevWindowStart.getDate() - windowDays * 2);
  const prevWindowEnd   = windowStart;

  if (resetAt && new Date(resetAt) > prevWindowStart) {
    const current = calcDailyAverage(transactions, itemId, windowDays, resetAt);
    return { current, previous: 0, deltaPct: null, direction: "rebuilding", resetAt };
  }

  const current  = calcDailyAverage(transactions, itemId, windowDays, resetAt);

  const prevTxs = sorted.filter(t =>
    t.id !== baselineId &&
    new Date(t.date) >= prevWindowStart &&
    new Date(t.date) <  prevWindowEnd
  );

  if (prevTxs.length === 0) {
    return { current, previous: 0, deltaPct: null, direction: "new" };
  }

  const earliestPrev = new Date(Math.max(
    prevWindowStart.getTime(),
    new Date(sorted[0].date).getTime()
  ));
  const prevDaySpan = Math.max(1, (prevWindowEnd - earliestPrev) / 86400000);
  const prevNet = prevTxs.reduce((sum, t) => {
    if (t.type === "gain" || t.type === "goal_contribution") return sum + Number(t.amount);
    if (t.type === "spend") return sum - Number(t.amount);
    return sum;
  }, 0);
  const previous = prevNet / prevDaySpan;

  if (previous === 0) {
    return { current, previous, deltaPct: null, direction: current === 0 ? "flat" : "new" };
  }

  const deltaPct = ((current - previous) / Math.abs(previous)) * 100;
  const direction = Math.abs(deltaPct) < 5 ? "flat" : (deltaPct > 0 ? "up" : "down");

  return { current, previous, deltaPct, direction };
}

/**
 * Estimate completion date given current balance, target, and daily average.
 * Returns null if no target, no progress, or already complete.
 */
export function estimateCompletion(balance, target, dailyAvg) {
  if (!target || target <= 0) return null;
  if (balance >= target) return null;
  if (dailyAvg <= 0) return null;
  const daysNeeded = (target - balance) / dailyAvg;
  const date = new Date();
  date.setDate(date.getDate() + daysNeeded);
  return date;
}

/**
 * Calculate pace status relative to a target date.
 * Returns: "ahead" | "on-track" | "behind" | "complete" | "no-target" | "no-data"
 */
export function calcPaceStatus(balance, target, targetDate, dailyAvg) {
  if (!target || target <= 0) return "no-target";
  if (balance >= target) return "complete";
  if (!targetDate) {
    if (dailyAvg > 0) return "on-track";
    return "no-data";
  }

  const now = new Date();
  const deadline = new Date(targetDate);
  const daysLeft = Math.max(0, (deadline - now) / 86400000);
  const remaining = target - balance;

  if (dailyAvg <= 0) return "behind";
  if (daysLeft <= 0) return balance >= target ? "complete" : "behind";

  const projectedByDeadline = balance + dailyAvg * daysLeft;
  const ratio = projectedByDeadline / target;

  if (ratio >= 1.1) return "ahead";
  if (ratio >= 0.9) return "on-track";
  return "behind";
}

// Keys map to i18n `pace.*` — components look up the translated label via
// t(`pace.${PACE_I18N_KEY[status]}`) instead of a hardcoded English label.
export const PACE_I18N_KEY = {
  "ahead":     "ahead",
  "on-track":  "onTrack",
  "behind":    "behind",
  "complete":  "complete",
  "no-target": "noTarget",
  "no-data":   "noData",
};

export const PACE_COLORS = {
  "ahead":     { background:"#edf4ea", color:"#5c7a6e" },
  "on-track":  { background:"#edf2ec", color:"#5c7a6e" },
  "behind":    { background:"#f5e3df", color:"#a06358" },
  "complete":  { background:"#edf4ea", color:"#3d6b52" },
  "no-target": { background:"rgba(72,94,80,0.08)", color:"#9aa59e" },
  "no-data":   { background:"rgba(72,94,80,0.08)", color:"#9aa59e" },
};

export const MOM_CONFIG = {
  "up":         { color:"#5c7a6e", arrow:"↑" },
  "down":       { color:"#a06358", arrow:"↓" },
  "flat":       { color:"#9aa59e", arrow:"→" },
  "new":        { color:"#9aa59e", arrow:"" },
  "rebuilding": { color:"#9a7746", arrow:"↻" },
};

/**
 * Format a date to a readable, locale-aware string.
 */
export function formatDate(date, locale = "en-GB") {
  if (!date) return null;
  return new Date(date).toLocaleDateString(locale, {
    day:"numeric", month:"short", year:"numeric",
  });
}

/**
 * Format a number compactly for display: 1234567 → "1.23M"
 */
export function formatCompact(n) {
  if (!n && n !== 0) return "—";
  const abs = Math.abs(Number(n));
  if (abs >= 1e9) return `${(n/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return Number(n).toLocaleString();
}

/**
 * Growth insights: gains, spends, net change for today / 7d / 30d.
 */
export function calcGrowthInsights(transactions, items) {
  const now = new Date();
  const d1  = new Date(now); d1.setHours(0,0,0,0);
  const d7  = new Date(now); d7.setDate(now.getDate() - 7);
  const d30 = new Date(now); d30.setDate(now.getDate() - 30);

  function window(since) {
    const txs = transactions.filter(t => new Date(t.date) >= since);
    const gains  = txs.filter(t => t.type === "gain" || t.type === "goal_contribution")
      .reduce((s,t) => s + Number(t.amount), 0);
    const spends = txs.filter(t => t.type === "spend")
      .reduce((s,t) => s + Number(t.amount), 0);
    return { gains, spends, net: gains - spends };
  }

  const allSorted = [...transactions].sort((a,b) => Number(b.amount) - Number(a.amount));
  const biggestGain  = allSorted.find(t => t.type === "gain");
  const biggestSpend = allSorted.find(t => t.type === "spend");

  const gainsByItem = {};
  transactions.filter(t => new Date(t.date) >= d7 && t.type === "gain").forEach(t => {
    gainsByItem[t.itemId] = (gainsByItem[t.itemId] || 0) + Number(t.amount);
  });
  const fastestItemId = Object.entries(gainsByItem).sort((a,b) => b[1]-a[1])[0]?.[0];
  const fastestItem = items.find(i => i.id === fastestItemId);

  return {
    today: window(d1),
    week:  window(d7),
    month: window(d30),
    biggestGain,
    biggestSpend,
    fastestItem,
  };
}
