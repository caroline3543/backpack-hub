// ─── BackpackScreen.jsx ───────────────────────────────────────────────────────
// Sections: Items · Goals · History · Insights

import { useState, useRef, useCallback } from "react";
import { useI18n }            from "../../i18n/I18nContext.jsx";
import { useBackpackData }    from "./useBackpackData.js";
import BackpackSummary        from "./BackpackSummary.jsx";
import BackpackItems          from "./BackpackItems.jsx";
import BackpackSheet          from "./BackpackSheet.jsx";
import MithrilCalculator      from "./MithrilCalculator.jsx";
import GearPriorityGuide      from "./GearPriorityGuide.jsx";
import ExpertCalculator       from "./ExpertCalculator.jsx";
import UpgradeCalculator      from "./UpgradeCalculator.jsx";
import BackpackScanner        from "./BackpackScanner.jsx";
import haptics from "../../utils/haptics.js";
import { Toast as CelebToast, useCelebration } from "../../components/Celebration.jsx";
import PinReplacePrompt from "../../components/PinReplacePrompt.jsx";

const MAX_PINNED = 3;

// ─── Section chip nav ─────────────────────────────────────────────────────────
function SectionNav({ active, onChange, accent }) {
  const { t } = useI18n();
  const tabs = [
    {key:"Items",label:t("nav.items"),icon:"🎒"},
    {key:"Calculator",label:"Calculator",icon:"🧮"},
    {key:"Scan",label:"Scan",icon:"📷"},
    {key:"Mithril",label:"Mithril",icon:"⚒️"},
    {key:"Experts",label:"Experts",icon:"🎓"}
  ];
  return <nav aria-label="Backpack app navigation" style={{
    position:"fixed",insetInline:0,bottom:0,zIndex:45,
    background:"var(--bp-card, #fff)",borderTop:"1px solid var(--bp-border2, #ddd)",
    boxShadow:"0 -10px 32px rgba(19,35,30,.10)",
    padding:"7px max(10px, env(safe-area-inset-right, 10px)) calc(7px + env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 10px))",
    WebkitBackdropFilter:"blur(20px)",backdropFilter:"blur(20px)"
  }}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:2,maxWidth:760,margin:"0 auto"}}>
      {tabs.map(tab=><button key={tab.key} onClick={()=>onChange(tab.key)}
        aria-current={active===tab.key?"page":undefined} aria-label={tab.label}
        style={{border:"none",background:active===tab.key?"var(--bp-bg,#eff5ef)":"transparent",
          color:active===tab.key?accent:"var(--bp-muted2,#66746b)",
          minHeight:56,borderRadius:14,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",padding:"5px 2px",
          minWidth:0,fontWeight:active===tab.key?800:600}}>
        <span aria-hidden="true" style={{fontSize:22,lineHeight:1.1}}>{tab.icon}</span>
        <span style={{fontSize:10.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{tab.label}</span>
      </button>)}
    </div>
  </nav>;
}

function SectionHeading({ kicker, title }) {
  return (
    <div style={{ paddingTop:8, marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>{kicker}</div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:24,
        fontWeight:600, color:"var(--bp-text, #24312c)" }}>{title}</div>
    </div>
  );
}

// ─── BackpackScreen ───────────────────────────────────────────────────────────
export default function BackpackScreen({ userId, accent = "#78917f" }) {
  const { t } = useI18n();
  const {
    items, transactions, projections, balances, summary,
    pinnedItems, togglePin,
    addItem, updateItem, deleteItem,
    addTransaction, updateTransaction, deleteTransaction, setTotal,
    addProjection, updateProjection, deleteProjection, clearProjections,
    setAverageReset,
    loading: backpackLoading,
  } = useBackpackData({ userId });

  const [activeSection, setActiveSection] = useState("Items");
  const [sheet,         setSheet]         = useState(null);
  const [pinPending,    setPinPending]    = useState(null); // item pending pin, if at cap
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const { toast, toastType, showToast, celebrate, warn } = useCelebration();

  const handleResetAllAverages = useCallback(() => {
    items.forEach(item => setAverageReset(item.id));
    setConfirmResetAll(false);
    showToast("Daily averages reset for all items");
    haptics.success();
  }, [items, setAverageReset, showToast]);

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
    Mithril:  useRef(null),
    Calculator: useRef(null),
    Scan: useRef(null),
    Experts:  useRef(null),
  };

  const scrollTo = useCallback(section=>{
    setActiveSection(section);
    try { window.scrollTo({top:0,behavior:"smooth"}); } catch {}
  },[]);

  const openSheet = useCallback((mode, initial = {}) => setSheet({ mode, initial }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const handleSave = useCallback((data) => {
    const mode = sheet?.mode;
    if (mode === "update") {
      setTotal(sheet.initial.itemId, data.newTotal, { reason: data.reason });
      if (data.currentLevel !== undefined) {
        updateItem(sheet.initial.itemId, { currentLevel: data.currentLevel });
      }
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
    } else if (mode === "transaction") {
      updateTransaction(sheet.initial.id, data);
      showToast(t("toast.entryUpdated"));
      haptics.success();
    }
  }, [sheet, addItem, updateItem, setTotal, updateTransaction, showToast, celebrate, t]);

  // Used by the Mithril / Expert calculators' "Update Goal" buttons — sets
  // a tracked item's target amount directly, no sheet needed.
  const handleSetGoal = useCallback((itemId, targetAmount) => {
    updateItem(itemId, { targetAmount });
    showToast(t("toast.goalSet"));
    haptics.success();
  }, [updateItem, showToast, t]);

  const handleNavigateSheet = useCallback((itemId) => {
    setSheet({ mode: "update", initial: { itemId } });
  }, []);

  if (backpackLoading) {
    return (
      <div className="scroll-content" style={{ display:"flex", alignItems:"center",
        justifyContent:"center", minHeight:"50vh" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🎒</div>
          <div style={{ fontSize:13, color:"var(--bp-muted, #9aa59e)" }}>{t("loading.backpack")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-content" style={{paddingBottom:"calc(98px + env(safe-area-inset-bottom, 0px))"}}>
      {/* ── Hero ── */}
      {activeSection==="Items"&&<div style={{ position:"relative" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
          letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>
          {t("hero.kicker")}
        </div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:33,
          fontWeight:600, color:"var(--bp-text, #24312c)", lineHeight:1.1, marginBottom:4 }}>
          {t("hero.title")}
        </div>
        <p style={{ fontSize:15, color:"var(--bp-muted2, #6f7a73)", lineHeight:1.5, maxWidth:260 }}>
          {t("hero.subtitle")}
        </p>
        <button onClick={() => openSheet("item")} style={{
          position:"absolute", top:0, insetInlineEnd:0,
          width:48, height:48, borderRadius:"50%",
          background:accent, border:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", boxShadow:`0 6px 20px ${accent}59`,
        }} aria-label={t("hero.addItem")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>}

      {/* ── Summary + Growth ── */}
      {activeSection === "Items" && <BackpackSummary
        summary={summary}
        items={items}
        transactions={transactions}
        balances={balances}
        pinnedItems={pinnedItems}
        onChooseResources={() => scrollTo("Items")}
      />}

      {/* ── Items ── */}
      {activeSection==="Items"&&<div ref={refs.Items} style={{ scrollMarginTop:16, marginTop:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <SectionHeading kicker={t("hero.kicker")} title={t("nav.items")} />
          <button onClick={()=>scrollTo("Scan")} style={{minHeight:44,padding:"0 12px",borderRadius:12,border:"1px solid var(--bp-border2)",background:"var(--bp-card)",fontSize:12,color:"var(--bp-text)",fontWeight:700,cursor:"pointer",marginInlineEnd:6}}>📷 Scan</button>
          {!confirmResetAll && (
            <button onClick={() => setConfirmResetAll(true)} style={{
              height:34, padding:"0 14px", borderRadius:99, fontSize:12, fontWeight:700,
              background:"rgba(154,122,98,0.08)", color:"#9a7746",
              border:"1px dashed rgba(154,122,98,0.3)", cursor:"pointer",
              flexShrink:0, marginTop:8,
            }}>
              Reset for SvS
            </button>
          )}
        </div>
        {confirmResetAll && (
          <div style={{ background:"rgba(154,122,98,0.06)", borderRadius:14,
            padding:"12px 14px", border:"1px solid rgba(154,122,98,0.2)",
            marginBottom:14 }}>
            <div style={{ fontSize:12, color:"#9a7746", lineHeight:1.5, marginBottom:10 }}>
              This resets the daily-average tracking for every item back to
              today, so a big SvS spend or dump doesn't distort your pace
              for weeks afterward. It doesn't change any balances.
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => setConfirmResetAll(false)} style={{
                flex:1, height:36, borderRadius:9, fontSize:12, fontWeight:600,
                background:"rgba(255,255,255,0.8)", color:"var(--bp-muted2, #6f7a73)",
                border:"1px solid var(--bp-border2, rgba(72,94,80,0.14))", cursor:"pointer",
              }}>{t("common.cancel")}</button>
              <button onClick={handleResetAllAverages} style={{
                flex:1, height:36, borderRadius:9, fontSize:12, fontWeight:700,
                background:"#9a7746", color:"white", border:"none", cursor:"pointer",
              }}>Reset All Now</button>
            </div>
          </div>
        )}
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
          onUpdateItem={updateItem}
          onDelete={id => { deleteItem(id); showToast(t("toast.itemDeleted")); haptics.warning(); }}
          onDeleteTransaction={id => { deleteTransaction(id); showToast(t("toast.entryRemoved")); }}
        />
      </div>}

      {/* ── Standalone calculator with built-in game costs ── */}
      {activeSection==="Calculator"&&<div ref={refs.Calculator} style={{ scrollMarginTop:16, marginTop:14 }}>
        <UpgradeCalculator key={userId||"local-user"} userId={userId} items={items} balances={balances} onUpdateResource={handleNavigateSheet} />
      </div>}

      {/* ── Screenshot OCR importer ── */}
      {activeSection==="Scan"&&<div ref={refs.Scan} style={{marginTop:12}}>
        <BackpackScanner key={userId||"local-user"} items={items} balances={balances}
          onApply={(id,value)=>setTotal(id,value,{reason:"Reviewed screenshot OCR import"})}/>
      </div>}

      {/* ── Mithril calculator ── */}
      {activeSection==="Mithril"&&<div ref={refs.Mithril} style={{ scrollMarginTop:16, marginTop:14 }}>
        <SectionHeading kicker="Hero Gear" title="Mithril" />
        <MithrilCalculator mithrilBalance={balances["mithril"] ?? 0} onSetGoal={handleSetGoal} />
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.15em", color:"var(--bp-muted, #9aa59e)", marginBottom:8 }}>
            Upgrade Priority Guide
          </div>
          <GearPriorityGuide userId={userId} />
        </div>
      </div>}

      {/* ── Dawn Academy Experts calculator ── */}
      {activeSection==="Experts"&&<div ref={refs.Experts} style={{ scrollMarginTop:16, marginTop:14 }}>
        <SectionHeading kicker="Dawn Academy" title="Experts" />
        <ExpertCalculator items={items} updateItem={updateItem} onSetGoal={handleSetGoal} />
      </div>}

      {/* ── Sheet ── */}
      <BackpackSheet
        open={!!sheet}
        onClose={closeSheet}
        mode={sheet?.mode || "item"}
        initial={sheet?.initial || {}}
        items={items}
        onSave={handleSave}
        onDeleteItem={id => { deleteItem(id); showToast(t("toast.itemDeleted")); haptics.warning(); closeSheet(); }}
        onDeleteTransaction={id => { deleteTransaction(id); showToast(t("toast.entryRemoved")); }}
        onNavigate={handleNavigateSheet}
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
      {!sheet&&<SectionNav active={activeSection} onChange={scrollTo} accent={accent} />}
    </div>
  );
}
