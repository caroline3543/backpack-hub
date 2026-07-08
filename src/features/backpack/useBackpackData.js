// ─── useBackpackData.js ───────────────────────────────────────────────────────
// Local-only version of the Backpack data hook. This stripped-down repo has
// no auth/backend, so everything lives in localStorage under one fixed key.
// The public API (items, transactions, balances, summary, CRUD methods) is
// kept identical to the original Supabase-backed hook so the UI components
// don't need to change.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PREDEFINED_ITEMS } from "./backpackConstants.js";

const LS_KEY = "backpack-hub-data-v1";

function nowISO() { return new Date().toISOString(); }
function uid(prefix = "id") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items:        Array.isArray(parsed.items) ? parsed.items : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        projections:  Array.isArray(parsed.projections) ? parsed.projections : [],
        snapshots:    Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
        pinnedItems:  Array.isArray(parsed.pinnedItems) ? parsed.pinnedItems : [],
      };
    }
  } catch (e) {
    console.error("Backpack: failed to read local storage:", e.message);
  }
  return { items: [], transactions: [], projections: [], snapshots: [], pinnedItems: [] };
}

function persist(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Backpack: failed to save to local storage:", e.message);
  }
}

function seedPredefinedItems(existingItems) {
  const existingIds = new Set(existingItems.map(i => i.id));
  const missing = PREDEFINED_ITEMS.filter(def => !existingIds.has(def.id)).map(def => ({
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

export function useBackpackData({ userId } = {}) {
  const [items,        setItems]        = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projections,  setProjections]  = useState([]);
  const [snapshots,    setSnapshots]    = useState([]);
  const [pinnedItems,  setPinnedItems]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  // Keep the persisted blob in sync any time the pieces change (skipped on
  // first render since loadState already wrote nothing new).
  const hydrated = useRef(false);

  useEffect(() => {
    const state = loadState();
    const seededItems = seedPredefinedItems(state.items);
    setItems(seededItems);
    setTransactions(state.transactions);
    setProjections(state.projections);
    setSnapshots(state.snapshots);
    setPinnedItems(state.pinnedItems);
    if (seededItems.length !== state.items.length) {
      persist({ ...state, items: seededItems });
    }
    hydrated.current = true;
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!hydrated.current) return;
    persist({ items, transactions, projections, snapshots, pinnedItems });
  }, [items, transactions, projections, snapshots, pinnedItems]);

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
    setItems(prev => prev.filter(i => i.id !== id));
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
