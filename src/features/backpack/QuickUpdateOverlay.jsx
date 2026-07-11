// ─── QuickUpdateOverlay.jsx ───────────────────────────────────────────────────
// "Option A" quick-update flow: page through items one at a time in a single
// full-screen overlay. Saving an item automatically advances to the next one
// — no closing and reopening a sheet per item. Side-mounted arrows let you
// skip forward/back without saving.

import { useState, useMemo, useEffect } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { UpdateTotalForm } from "./BackpackSheet.jsx";
import { ITEM_ICONS } from "./itemIcons.js";
import haptics from "../../utils/haptics.js";

function ArrowButton({ onClick, disabled, side, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        position:"fixed", top:"50%", transform:"translateY(-50%)",
        [side]: 10, zIndex:702,
        width:44, height:44, borderRadius:"50%",
        background: disabled ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.92)",
        border:"1px solid rgba(74,92,80,0.12)",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(0,0,0,0.15)",
        color: disabled ? "#d6ddd6" : "#24312c",
        fontSize:20, cursor: disabled ? "default" : "pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

export default function QuickUpdateOverlay({
  open, onClose, items, balances, transactions, pinnedItems,
  onSaveTotal, onAllDone,
}) {
  const { t, tItem } = useI18n();
  const [filter, setFilter] = useState((pinnedItems || []).length > 0 ? "pinned" : "all");
  const [index, setIndex] = useState(0);

  const queue = useMemo(() => (
    filter === "pinned"
      ? items.filter(i => (pinnedItems || []).includes(i.id))
      : items
  ), [filter, items, pinnedItems]);

  useEffect(() => { setIndex(0); }, [filter, open]);

  if (!open) return null;

  if (queue.length === 0) {
    return (
      <>
        <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:700,
          background:"rgba(36,49,44,0.55)" }} />
        <div style={{ position:"fixed", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)", zIndex:701,
          background:"#f6f1e8", borderRadius:22, padding:24,
          width:"88%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📌</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#24312c", marginBottom:6 }}>
            {t("quickUpdate.emptyPinnedTitle")}
          </div>
          <div style={{ fontSize:13, color:"#6f7a73", marginBottom:16, lineHeight:1.5 }}>
            {t("quickUpdate.emptyPinnedBody")}
          </div>
          <button onClick={() => setFilter("all")} style={{
            width:"100%", height:44, borderRadius:14, border:"none",
            background:"#78917f", color:"white", fontWeight:700, cursor:"pointer", marginBottom:8,
          }}>{t("quickUpdate.switchToAll")}</button>
          <button onClick={onClose} style={{
            width:"100%", height:40, borderRadius:14, border:"none",
            background:"none", color:"#9aa59e", fontWeight:600, cursor:"pointer",
          }}>{t("common.close")}</button>
        </div>
      </>
    );
  }

  const clampedIndex = Math.min(index, queue.length - 1);
  const item = queue[clampedIndex];
  const hasTransactions = transactions.some(t => t.itemId === item.id);

  const goPrev = () => { setIndex(i => Math.max(0, i - 1)); haptics.selection(); };
  const goNext = () => { setIndex(i => Math.min(queue.length - 1, i + 1)); haptics.selection(); };

  const handleSubmit = (data) => {
    onSaveTotal(item.id, data.newTotal, { reason: data.reason });
    haptics.success();
    if (clampedIndex >= queue.length - 1) {
      onAllDone();
      onClose();
    } else {
      setIndex(clampedIndex + 1);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:700,
        background:"rgba(36,49,44,0.55)" }} />

      <ArrowButton onClick={goPrev} disabled={clampedIndex === 0} side="left" label={t("quickUpdate.previous")} />
      <ArrowButton onClick={goNext} disabled={clampedIndex === queue.length - 1} side="right" label={t("quickUpdate.next")} />

      <div style={{
        position:"fixed", top:"6%", bottom:"6%", left:64, right:64,
        zIndex:701, maxWidth:420, margin:"0 auto",
        background:"#f6f1e8", borderRadius:24,
        overflowY:"auto", padding:20, WebkitOverflowScrolling:"touch",
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>
              {t("quickUpdate.title")}
            </div>
            <div style={{ fontSize:12, color:"#9aa59e" }}>
              {t("quickUpdate.progress", { current: clampedIndex + 1, total: queue.length })}
            </div>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} style={{
            width:36, height:36, borderRadius:12, background:"white",
            border:"1px solid rgba(74,92,80,0.10)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#6f7a73" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["pinned", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:600,
              background: filter === f ? "#78917f" : "rgba(255,255,255,0.7)",
              color: filter === f ? "white" : "#6f7a73",
              border: filter === f ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
              cursor:"pointer",
            }}>
              {f === "pinned" ? t("quickUpdate.pinnedFilter") : t("quickUpdate.allFilter")}
            </button>
          ))}
        </div>

        {/* Current item */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          {ITEM_ICONS[item.id] ? (
            <img src={ITEM_ICONS[item.id]} alt="" width={32} height={32} style={{ objectFit:"cover", flexShrink:0 }} />
          ) : (
            <span aria-hidden="true" style={{ width:32, height:32, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🎒</span>
          )}
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, color:"#24312c" }}>
            {tItem(item.id, item.name)}
          </div>
        </div>

        <UpdateTotalForm
          item={item}
          currentBalance={balances[item.id] ?? 0}
          isFirstEntry={!hasTransactions}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}
