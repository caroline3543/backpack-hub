// ─── BackpackScreen.jsx ───────────────────────────────────────────────────────
// Sections: Items · Goals · History · Insights

import { useState, useRef, useCallback } from "react";
import { useI18n }            from "../../i18n/I18nContext.jsx";
import { useBackpackData }    from "./useBackpackData.js";
import BackpackSummary        from "./BackpackSummary.jsx";
import PinnedResources        from "./PinnedResources.jsx";
import BackpackItems          from "./BackpackItems.jsx";
import BackpackGoals          from "./BackpackGoals.jsx";
import BackpackHistory        from "./BackpackHistory.jsx";
import BackpackSheet          from "./BackpackSheet.jsx";
import { calcGrowthInsights, formatCompact } from "./backpackForecast.js";
import haptics from "../../utils/haptics.js";
import { Toast as CelebToast, useCelebration } from "../../components/Celebration.jsx";
import PinReplacePrompt from "../../components/PinReplacePrompt.jsx";

const MAX_PINNED = 3;

// ─── Section chip nav ─────────────────────────────────────────────────────────
function SectionNav({ active, onChange }) {
  const { t } = useI18n();
  const chips = [
    { key: "Items",    label: t("nav.items") },
    { key: "Goals",    label: t("nav.goals") },
    { key: "History",  label: t("nav.history") },
    { key: "Insights", label: t("nav.insights") },
  ];
  return (
    <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"12px 0 4px",
      scrollbarWidth:"none" }}>
      {chips.map(chip => (
        <button key={chip.key} onClick={() => onChange(chip.key)} style={{
          padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:700,
          whiteSpace:"nowrap", flexShrink:0,
          background: active === chip.key ? "#78917f" : "rgba(255,255,255,0.72)",
          color: active === chip.key ? "white" : "#6f7a73",
          border: active === chip.key ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
          cursor:"pointer", transition:"all 0.15s",
        }}>{chip.label}</button>
      ))}
    </div>
  );
}

function SectionHeading({ kicker, title }) {
  return (
    <div style={{ paddingTop:8, marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>{kicker}</div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:24,
        fontWeight:600, color:"#24312c" }}>{title}</div>
    </div>
  );
}

// ─── Insights section ─────────────────────────────────────────────────────────
function InsightsSection({ items, transactions, balances }) {
  const { t, tItem } = useI18n();

  const resourceItems = items.filter(i =>
    transactions.some(t => t.itemId === i.id)
  ).slice(0, 6);

  if (resourceItems.length === 0) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {resourceItems.map(item => {
        const txs     = transactions.filter(t => t.itemId === item.id);
        const gains7d = txs.filter(t => {
          const d = new Date(); d.setDate(d.getDate()-7);
          return new Date(t.date) >= d && (t.type==="gain"||t.type==="goal_contribution");
        }).reduce((s,t) => s+Number(t.amount), 0);
        const spends7d = txs.filter(t => {
          const d = new Date(); d.setDate(d.getDate()-7);
          return new Date(t.date) >= d && t.type==="spend";
        }).reduce((s,t) => s+Number(t.amount), 0);
        const bal = balances[item.id] ?? 0;
        const fmt = v => item.isMinutes ? `${Math.round(v/1440)}d` : formatCompact(v);

        return (
          <div key={item.id} style={{ background:"rgba(255,255,255,0.82)",
            border:"1px solid rgba(74,92,80,0.09)",
            borderRadius:18, padding:"12px 14px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#24312c", marginBottom:6 }}>
              {tItem(item.id, item.name)}
            </div>
            <div style={{ display:"flex", gap:16 }}>
              <div>
                <div style={{ fontSize:10, color:"#9aa59e", textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:2 }}>{t("insights.balance")}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#24312c" }}>{fmt(bal)}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:"#5c7a6e", textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:2 }}>{t("insights.gain7d")}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#5c7a6e" }}>+{fmt(gains7d)}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:"#a06358", textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:2 }}>{t("insights.spend7d")}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#a06358" }}>−{fmt(spends7d)}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:"#819286", textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:2 }}>{t("insights.net")}</div>
                <div style={{ fontSize:13, fontWeight:700,
                  color: gains7d-spends7d>=0 ? "#5c7a6e" : "#a06358" }}>
                  {gains7d-spends7d>=0?"+":""}{fmt(gains7d-spends7d)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BackpackScreen ───────────────────────────────────────────────────────────
export default function BackpackScreen({ userId }) {
  const { t } = useI18n();
  const {
    items, transactions, projections, snapshots, balances, summary,
    pinnedItems, togglePin,
    addItem, updateItem, deleteItem,
    addTransaction, updateTransaction, deleteTransaction, setTotal,
    addProjection, updateProjection, deleteProjection, clearProjections,
    takeSnapshot,
    setAverageReset, clearAverageReset,
    loading: backpackLoading,
  } = useBackpackData({ userId });

  const [activeSection, setActiveSection] = useState("Items");
  const [sheet,         setSheet]         = useState(null);
  const [pinPending,    setPinPending]    = useState(null); // item pending pin, if at cap
  const { toast, toastType, showToast, celebrate, warn } = useCelebration();

  const handleTogglePin = useCallback((itemId) => {
    const isPinned = pinnedItems.includes(itemId);
    if (isPinned) { togglePin(itemId); return; }
    if (pinnedItems.length >= MAX_PINNED) {
      const item = items.find(i => i.id === itemId);
      if (item) setPinPending(item);
      return;
    }
    togglePin(itemId);
  }, [pinnedItems, togglePin, items]);

  const handleReplacePin = useCallback((oldItemId) => {
    togglePin(oldItemId);
    togglePin(pinPending.id);
    setPinPending(null);
    haptics.success();
  }, [togglePin, pinPending]);

  const refs = {
    Items:    useRef(null),
    Goals:    useRef(null),
    History:  useRef(null),
    Insights: useRef(null),
  };

  const scrollTo = useCallback((section) => {
    setActiveSection(section);
    refs[section]?.current?.scrollIntoView({ behavior:"smooth", block:"start" });
  }, []);

  const openSheet = useCallback((mode, initial = {}) => setSheet({ mode, initial }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const handleSave = useCallback((data) => {
    const mode = sheet?.mode;
    if (mode === "update") {
      setTotal(sheet.initial.itemId, data.newTotal, { reason: data.reason });
      showToast(t("toast.backpackUpdated"));
      haptics.success();
    } else if (mode === "item") {
      if (data.id) { updateItem(data.id, data); showToast(t("toast.itemUpdated")); haptics.success(); }
      else         { addItem(data); celebrate(t("toast.itemAdded")); haptics.medium(); }
    } else if (mode === "goal") {
      updateItem(data.itemId, {
        targetAmount: data.targetAmount,
        targetDate:   data.targetDate || null,
      });
      celebrate(t("toast.goalSet"));
      haptics.medium();
    }
  }, [sheet, addItem, updateItem, setTotal, showToast, celebrate, t]);

  const handleSnapshot = useCallback(() => {
    takeSnapshot();
    showToast(t("toast.snapshotSaved"));
    haptics.success();
  }, [takeSnapshot, showToast, t]);

  if (backpackLoading) {
    return (
      <div className="scroll-content" style={{ display:"flex", alignItems:"center",
        justifyContent:"center", minHeight:"50vh" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🎒</div>
          <div style={{ fontSize:13, color:"#9aa59e" }}>{t("loading.backpack")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-content">
      {/* ── Pinned Resources — always first, answers "what am I focusing on" ── */}
      <PinnedResources
        items={items}
        balances={balances}
        transactions={transactions}
        pinnedItems={pinnedItems}
        onTogglePin={handleTogglePin}
      />

      {/* ── Hero ── */}
      <div style={{ position:"relative" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
          letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>
          {t("hero.kicker")}
        </div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:33,
          fontWeight:600, color:"#24312c", lineHeight:1.1, marginBottom:4 }}>
          {t("hero.title")}
        </div>
        <p style={{ fontSize:15, color:"#6f7a73", lineHeight:1.5, maxWidth:260 }}>
          {t("hero.subtitle")}
        </p>
        <button onClick={() => openSheet("item")} style={{
          position:"absolute", top:0, insetInlineEnd:0,
          width:48, height:48, borderRadius:"50%",
          background:"#78917f", border:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", boxShadow:"0 6px 20px rgba(120,145,127,0.35)",
        }} aria-label={t("hero.addItem")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* ── Summary + Growth ── */}
      <BackpackSummary
        summary={summary}
        items={items}
        transactions={transactions}
        onGain={() => openSheet("update", {})}
        onSpend={() => openSheet("update", {})}
        onSnapshot={handleSnapshot}
      />

      {/* ── Section nav ── */}
      <SectionNav active={activeSection} onChange={scrollTo} />

      {/* ── Items ── */}
      <div ref={refs.Items} style={{ scrollMarginTop:16, marginTop:8 }}>
        <SectionHeading kicker={t("hero.kicker")} title={t("nav.items")} />
        <BackpackItems
          items={items}
          balances={balances}
          transactions={transactions}
          pinnedItems={pinnedItems}
          onTogglePin={handleTogglePin}
          onGain={item  => openSheet("update", { itemId:item.id })}
          onSpend={item => openSheet("update", { itemId:item.id })}
          onGoal={item  => openSheet("goal", {
            itemId:       item.id,
            targetAmount: item.targetAmount || 0,
            targetDate:   item.targetDate   || "",
          })}
          onEdit={item  => openSheet("item", item)}
          onAddItem={cat => openSheet("item", { category:cat })}
          onUpdate={item => openSheet("update", { itemId:item.id })}
          onDelete={id => { deleteItem(id); showToast(t("toast.itemDeleted")); haptics.warning(); }}
          onDeleteTransaction={id => { deleteTransaction(id); showToast(t("toast.entryRemoved")); }}
          onAverageReset={id => { setAverageReset(id); showToast(t("toast.averageReset")); }}
          onClearAverageReset={id => { clearAverageReset(id); showToast(t("toast.resetUndone")); }}
        />
      </div>

      {/* ── Goals ── */}
      <div ref={refs.Goals} style={{ scrollMarginTop:16, marginTop:32 }}>
        <SectionHeading kicker={t("sheet.goalsKicker")} title={t("nav.goals")} />
        <BackpackGoals items={items} balances={balances} transactions={transactions} />
      </div>

      {/* ── History ── */}
      <div ref={refs.History} style={{ scrollMarginTop:16, marginTop:32 }}>
        <SectionHeading kicker={t("nav.history")} title={t("nav.history")} />
        <BackpackHistory
          transactions={transactions}
          snapshots={snapshots}
          items={items}
          balances={balances}
          onEdit={tx => openSheet("transaction", tx)}
        />
      </div>

      {/* ── Insights — only shown when there is transaction data ── */}
      {transactions.length > 0 && (
        <div ref={refs.Insights} style={{ scrollMarginTop:16, marginTop:32 }}>
          <SectionHeading kicker={t("nav.insights")} title={t("nav.insights")} />
          <InsightsSection items={items} transactions={transactions} balances={balances} />
        </div>
      )}

      {/* ── Sheet ── */}
      <BackpackSheet
        open={!!sheet}
        onClose={closeSheet}
        mode={sheet?.mode || "item"}
        initial={sheet?.initial || {}}
        items={items}
        onSave={handleSave}
        currentBalance={
          sheet?.initial?.itemId
            ? (balances[sheet.initial.itemId] ?? 0)
            : 0
        }
        hasTransactions={
          sheet?.initial?.itemId
            ? transactions.some(t => t.itemId === sheet.initial.itemId)
            : false
        }
      />

      <CelebToast message={toast} type={toastType} />

      <PinReplacePrompt
        pendingItem={pinPending}
        pinnedItemObjs={pinnedItems.map(id => items.find(i => i.id === id)).filter(Boolean)}
        onReplace={handleReplacePin}
        onCancel={() => setPinPending(null)}
      />
    </div>
  );
}
