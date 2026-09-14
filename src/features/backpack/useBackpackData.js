// ─── useBackpackData.js ───────────────────────────────────────────────────────
// Local-only version of the Backpack data hook. This stripped-down repo has
// no auth/backend, so everything lives in localStorage under one fixed key.
// The public API (items, transactions, balances, summary, CRUD methods) is
// kept identical to the original Supabase-backed hook so the UI components
// don't need to change.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PREDEFINED_ITEMS, giftXPFromComponents } from "./backpackConstants.js";

// Pre-multi-backpack versions of this app stored everything under this one
// fixed key, regardless of who was using it. Keep the name as the prefix so
// each backpack now gets its own key, and migrate the default backpack's
// data across once so existing users don't appear to lose everything.
const LEGACY_LS_KEY = "backpack-hub-data-v1";
const LS_KEY_PREFIX = "backpack-hub-data-v1";

function storageKey(userId) {
  return `${LS_KEY_PREFIX}:${userId || "local-user"}`;
}

function nowISO() { return new Date().toISOString(); }
function uid(prefix = "id") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function loadState(userId) {
  const key = storageKey(userId);
  try {
    let raw = localStorage.getItem(key);

    // One-time migration: adopt the old single fixed key's data as this
    // backpack's data, but only for the original default backpack and only
    // if it hasn't already been migrated (its own scoped key is still empty).
    if (!raw && userId === "local-user") {
      const legacy = localStorage.getItem(LEGACY_LS_KEY);
      if (legacy) {
        raw = legacy;
        try { localStorage.setItem(key, legacy); } catch {}
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items:        Array.isArray(parsed.items) ? parsed.items : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        projections:  Array.isArray(parsed.projections) ? parsed.projections : [],
        snapshots:    Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
        pinnedItems:  Array.isArray(parsed.pinnedItems) ? parsed.pinnedItems : [],
        deletedIds:   Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
      };
    }
  } catch (e) {
    console.error("Backpack: failed to read local storage:", e.message);
  }
  return { items: [], transactions: [], projections: [], snapshots: [], pinnedItems: [], deletedIds: [] };
}

function persist(userId, state) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch (e) {
    console.error("Backpack: failed to save to local storage:", e.message);
  }
}

// Predefined items are normally kept in sync automatically (new ones added
// in an app update get seeded in) — but if the person explicitly deleted
// one, it should stay gone, not silently reappear on next load.
function seedPredefinedItems(existingItems, deletedIds = []) {
  const existingIds = new Set(existingItems.map(i => i.id));
  const deletedSet = new Set(deletedIds);
  const missing = PREDEFINED_ITEMS
    .filter(def => !existingIds.has(def.id) && !deletedSet.has(def.id))
    .map(def => ({
    id:             def.id,
    name:           def.name,
    category:       def.category,
    currentAmount:  0,
    targetAmount:   0,
    targetDate:     null,
    priority:       def.priority,
    displayUnit:    def.defaultUnit || null,
    isMinutes:      def.isMinutes || false,
    notes:          "",
    isCustom:       false,
    averageResetAt: null,
    createdAt:      nowISO(),
  }));
  return missing.length ? [...existingItems, ...missing] : existingItems;
}

// The reverse case: when an app update removes a predefined item from the
// schema entirely (like folding Compass/Fiery Heart/Sail of Conquest into
// Gift XP), anyone who already had that item saved keeps it forever unless
// something prunes it — seeding above only ever adds, never removes. Only
// touches non-custom items; anything the person added themselves is safe.
function pruneRemovedPredefinedItems(existingItems) {
  const currentIds = new Set(PREDEFINED_ITEMS.map(def => def.id));
  return existingItems.filter(item => item.isCustom || currentIds.has(item.id));
}

export function useBackpackData({ userId } = {}) {
  const [items,        setItems]        = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projections,  setProjections]  = useState([]);
  const [snapshots,    setSnapshots]    = useState([]);
  const [pinnedItems,  setPinnedItems]  = useState([]);
  const [deletedIds,   setDeletedIds]   = useState([]);
  const [loading,      setLoading]      = useState(true);

  // Keep the persisted blob in sync any time the pieces change (skipped on
  // first render since loadState already wrote nothing new).
  const hydrated = useRef(false);

  useEffect(() => {
    const state = loadState(userId);
    const prunedItems = pruneRemovedPredefinedItems(state.items);
    const seededItems = seedPredefinedItems(prunedItems, state.deletedIds);
    const removedIds = new Set(state.items.filter(i => !prunedItems.includes(i)).map(i => i.id));
    const cleanedTransactions = removedIds.size
      ? state.transactions.filter(t => !removedIds.has(t.itemId))
      : state.transactions;
    setItems(seededItems);
    setTransactions(cleanedTransactions);
    setProjections(state.projections);
    setSnapshots(state.snapshots);
    setPinnedItems(state.pinnedItems);
    setDeletedIds(state.deletedIds);
    if (seededItems.length !== state.items.length || cleanedTransactions.length !== state.transactions.length) {
      persist(userId, { ...state, items: seededItems, transactions: cleanedTransactions });
    }
    hydrated.current = true;
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!hydrated.current) return;
    persist(userId, { items, transactions, projections, snapshots, pinnedItems, deletedIds });
  }, [userId, items, transactions, projections, snapshots, pinnedItems, deletedIds]);

  // ── Derived: computed balance per item ───────────────────────────────────
  const balances = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const gains  = transactions
        .filter(t => t.itemId === item.id && (t.type === "gain" || t.type === "goal_contribution"))
        .reduce((s, t) => s + Number(t.amount), 0);
      const spends = transactions
        .filter(t => t.itemId === item.id && t.type === "spend")
        .reduce((s, t) => s + Number(t.amount), 0);
      map[item.id] = Number(item.currentAmount) + gains - spends;
    });

    // Gift XP isn't a plain tracked amount — Compass / Fiery Heart / Sail
    // of Conquest are components living inside this one item. The person
    // types in how many of each they have (item.giftComponents), and the
    // balance is the weighted sum of those counts.
    if (map["gift-xp"] !== undefined) {
      const giftItem = items.find(i => i.id === "gift-xp");
      map["gift-xp"] = giftXPFromComponents(giftItem?.giftComponents);
    }

    return map;
  }, [items, transactions]);

  // ── Item CRUD ────────────────────────────────────────────────────────────
  const addItem = useCallback(async (data) => {
    const itemKey = data.id || uid("custom");
    const item = { ...data, id: itemKey, isCustom: true, createdAt: nowISO() };
    setItems(prev => [...prev, item]);
    return itemKey;
  }, []);

  const updateItem = useCallback(async (id, data) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data, updatedAt: nowISO() } : i));
  }, []);

  const deleteItem = useCallback(async (id) => {
    setItems(prev => {
      const target = prev.find(i => i.id === id);
      // Only predefined items need remembering — custom items were never
      // seeded in the first place, so there's nothing to prevent reappearing.
      if (target && !target.isCustom) {
        setDeletedIds(ids => ids.includes(id) ? ids : [...ids, id]);
      }
      return prev.filter(i => i.id !== id);
    });
    setTransactions(prev => prev.filter(t => t.itemId !== id));
    setProjections(prev => prev.filter(p => p.itemId !== id));
  }, []);

  // ── SvS / event reset ────────────────────────────────────────────────────
  const setAverageReset = useCallback(async (id) => {
    await updateItem(id, { averageResetAt: nowISO() });
  }, [updateItem]);
  const clearAverageReset = useCallback(async (id) => {
    await updateItem(id, { averageResetAt: null });
  }, [updateItem]);

  // ── Transactions ─────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (data) => {
    const tx = { ...data, id: uid("tx"), date: data.date || nowISO(), createdAt: nowISO() };
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const updateTransaction = useCallback(async (id, data) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data, updatedAt: nowISO() } : t));
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Projections ──────────────────────────────────────────────────────────
  const addProjection = useCallback(async (data) => {
    const proj = { ...data, id: uid("proj"), date: data.date || nowISO() };
    setProjections(prev => [...prev, proj]);
  }, []);

  const updateProjection = useCallback(async (id, data) => {
    setProjections(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: nowISO() } : p));
  }, []);

  const deleteProjection = useCallback(async (id) => {
    setProjections(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearProjections = useCallback(async (itemId = null) => {
    setProjections(prev => itemId ? prev.filter(p => p.itemId !== itemId) : []);
  }, []);

  // ── Snapshots ────────────────────────────────────────────────────────────
  const takeSnapshot = useCallback(async () => {
    const snapshotData = {};
    items.forEach(item => {
      snapshotData[item.id] = {
        name:    item.name,
        balance: balances[item.id] ?? 0,
        target:  item.targetAmount,
      };
    });
    const snap = { id: uid("snap"), date: nowISO(), snapshotData: JSON.stringify(snapshotData) };
    setSnapshots(prev => [snap, ...prev]);
    return snap;
  }, [items, balances]);

  // ── Pinned items ─────────────────────────────────────────────────────────
  const togglePin = useCallback(async (itemId) => {
    setPinnedItems(prev => prev.includes(itemId)
      ? prev.filter(id => id !== itemId)
      : [...prev, itemId]);
  }, []);

  // ── Set total (auto-detect gain/spend) ──────────────────────────────────
  const setTotal = useCallback(async (itemId, newTotal, meta = {}) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const hasAnyTransactions = transactions.some(t => t.itemId === itemId);
    const isBaseline = !hasAnyTransactions && Number(item.currentAmount) === 0;

    if (isBaseline) {
      await updateItem(itemId, { currentAmount: Number(newTotal) });
      return;
    }

    const gains  = transactions
      .filter(t => t.itemId === itemId && (t.type === "gain" || t.type === "goal_contribution"))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const spends = transactions
      .filter(t => t.itemId === itemId && t.type === "spend")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const currentBalance = Number(item.currentAmount) + gains - spends;

    const delta = Number(newTotal) - currentBalance;
    if (delta === 0) return;

    await addTransaction({
      itemId,
      type:         delta > 0 ? "gain" : "spend",
      amount:       Math.abs(delta),
      reason:       meta.reason || "",
      notes:        meta.notes  || "",
      date:         meta.date   || nowISO(),
      autoDetected: true,
    });
  }, [items, transactions, updateItem, addTransaction]);

  // ── Summary stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const tracked = items.length;
    const priorityOrder = ["Urgent","High","Medium","Low"];
    const topPriority = items
      .filter(i => i.targetAmount > 0)
      .sort((a,b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))[0];
    const closestToTarget = items
      .filter(i => i.targetAmount > 0)
      .map(i => ({ ...i, ratio: (balances[i.id] ?? 0) / i.targetAmount }))
      .filter(i => i.ratio < 1)
      .sort((a,b) => b.ratio - a.ratio)[0];
    const biggestShortage = items
      .filter(i => i.targetAmount > 0)
      .map(i => ({ ...i, shortage: i.targetAmount - (balances[i.id] ?? 0) }))
      .filter(i => i.shortage > 0)
      .sort((a,b) => b.shortage - a.shortage)[0];
    const recent = [...transactions].sort(
      (a,b) => new Date(b.date) - new Date(a.date)
    ).slice(0,5);
    return { tracked, topPriority, closestToTarget, biggestShortage, recent };
  }, [items, transactions, balances]);

  return {
    loading,
    items, transactions, projections, snapshots, pinnedItems,
    balances, summary,
    addItem, updateItem, deleteItem,
    setAverageReset, clearAverageReset,
    addTransaction, updateTransaction, deleteTransaction,
    setTotal,
    addProjection, updateProjection, deleteProjection, clearProjections,
    takeSnapshot,
    togglePin,
  };
}
