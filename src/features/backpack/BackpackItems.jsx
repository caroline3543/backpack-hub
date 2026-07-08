// ─── BackpackItems.jsx ────────────────────────────────────────────────────────
// Accordion per category — single open at a time.
// Each item row shows pace status, full at-a-glance stats, and an inline
// graph + forecast on expand.

import { useState, useMemo, useRef } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { CATEGORIES, formatAmount, formatMinutes } from "./backpackConstants.js";
import haptics from "../../utils/haptics.js";
import {
  calcDailyAverage, calcWeeklyAverage, estimateCompletion,
  calcPaceStatus, PACE_COLORS, PACE_I18N_KEY, calcMonthOverMonth, MOM_CONFIG,
  formatDate,
} from "./backpackForecast.js";

// ─── SVG Mini Chart ───────────────────────────────────────────────────────────
function MiniChart({ transactions, itemId, item }) {
  const { t } = useI18n();
  const txs = transactions
    .filter(t => t.itemId === itemId)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(-30);

  if (txs.length < 2) {
    return (
      <div style={{ padding:"16px 0", textAlign:"center",
        fontSize:12, color:"#9aa59e" }}>
        {t("itemsSection.notEnoughHistory")}
      </div>
    );
  }

  const W = 300, H = 80;
  let running = Number(item.currentAmount);
  const earlierTxs = transactions.filter(t => t.itemId === itemId);
  earlierTxs.forEach(t => {
    if (!txs.includes(t)) {
      running += (t.type === "spend") ? Number(t.amount) : -Number(t.amount);
    }
  });

  const points = [{ x: 0, y: running }];
  txs.forEach((t, i) => {
    running += (t.type === "gain" || t.type === "goal_contribution")
      ? Number(t.amount) : -Number(t.amount);
    points.push({ x: i + 1, y: running });
  });

  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) || 1;
  const range = maxY - minY || 1;

  const toSvg = (pt) => ({
    sx: (pt.x / (points.length - 1)) * W,
    sy: H - ((pt.y - minY) / range) * H * 0.8 - H * 0.1,
  });

  const svgPts = points.map(toSvg);
  let d = `M ${svgPts[0].sx} ${svgPts[0].sy}`;
  for (let i = 1; i < svgPts.length; i++) {
    const cpx = (svgPts[i-1].sx + svgPts[i].sx) / 2;
    d += ` C ${cpx} ${svgPts[i-1].sy}, ${cpx} ${svgPts[i].sy}, ${svgPts[i].sx} ${svgPts[i].sy}`;
  }
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  const last = svgPts[svgPts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ display:"block", margin:"8px 0" }}>
      <defs>
        <linearGradient id={`mg-${itemId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#78917f" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#78917f" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75].map(p => (
        <line key={p} x1="0" y1={H*p} x2={W} y2={H*p}
          stroke="rgba(72,94,80,0.08)" strokeWidth="1"/>
      ))}
      <path d={area} fill={`url(#mg-${itemId})`}/>
      <path d={d} fill="none" stroke="#78917f" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last.sx} cy={last.sy} r="4" fill="#78917f"/>
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const c = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height:7, background:"rgba(72,94,80,0.10)",
      borderRadius:99, overflow:"hidden" }}>
      <div style={{
        height:"100%", borderRadius:99, width:`${c}%`,
        background: c >= 100 ? "#5c7a6e"
          : "linear-gradient(90deg,#8aab9b 0%,#5c7a6e 100%)",
        transition:"width 0.4s ease",
      }}/>
    </div>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, balance, transactions, onGoal, onEdit, onUpdate, onDeleteTransaction, onAverageReset, onClearAverageReset }) {
  const { t, tItem, dateLocale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const hasTarget  = Number(item.targetAmount) > 0;
  const target     = Number(item.targetAmount);
  const pct        = hasTarget ? (balance / target) * 100 : 0;
  const unit       = item.displayUnit;
  const isMins     = item.isMinutes;
  const resetAt    = item.averageResetAt || null;

  const fmt = v => isMins ? formatMinutes(v) : formatAmount(v, unit);

  const dailyAvg   = useMemo(() => calcDailyAverage(transactions, item.id, 30, resetAt), [transactions, item.id, resetAt]);
  const weeklyAvg  = useMemo(() => calcWeeklyAverage(transactions, item.id, 30, resetAt), [transactions, item.id, resetAt]);
  const momComparison = useMemo(() => calcMonthOverMonth(transactions, item.id, 30, resetAt), [transactions, item.id, resetAt]);
  const completion = useMemo(() => estimateCompletion(balance, target, dailyAvg), [balance, target, dailyAvg]);
  const paceStatus = useMemo(() => calcPaceStatus(balance, target, item.targetDate, dailyAvg), [balance, target, item.targetDate, dailyAvg]);
  const paceColors = PACE_COLORS[paceStatus];
  const paceLabel  = t(`pace.${PACE_I18N_KEY[paceStatus]}`);

  const remaining = Math.max(0, target - balance);

  return (
    <div style={{ borderBottom:"1px solid rgba(72,94,80,0.07)" }}>
      {/* ── Main row ── */}
      <div style={{ padding:"14px 0" }}>
        {/* Name + pace badge */}
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:14, fontWeight:600, color:"#24312c",
            flex:1, marginRight:8, lineHeight:1.3 }}>{tItem(item.id, item.name)}</span>
          <span style={{ fontSize:10, fontWeight:700, borderRadius:99,
            padding:"2px 8px", flexShrink:0, whiteSpace:"nowrap",
            background:paceColors.background, color:paceColors.color }}>
            {paceLabel}
          </span>
        </div>

        {/* Balance / target */}
        <div style={{ display:"flex", alignItems:"baseline",
          gap:8, marginBottom: hasTarget ? 8 : 12 }}>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:18,
            fontWeight:600, color:"#24312c" }}>{fmt(balance)}</span>
          {hasTarget && (
            <span style={{ fontSize:12, color:"#9aa59e" }}>
              / {fmt(target)} · {Math.round(Math.min(pct,100))}%
            </span>
          )}
          {!hasTarget && (
            <span style={{ fontSize:12, color:"#b8c0ba" }}>{t("itemsSection.noTargetSet")}</span>
          )}
        </div>

        {hasTarget && (
          <div style={{ marginBottom:12 }}>
            <ProgressBar pct={pct}/>
          </div>
        )}

        {/* Quick stats row */}
        {dailyAvg !== 0 && (
          <div style={{ display:"flex", gap:16, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
                textTransform:"uppercase", letterSpacing:"0.1em" }}>{t("itemsSection.dailyAvg")}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:12, fontWeight:700,
                  color: dailyAvg >= 0 ? "#5c7a6e" : "#a06358" }}>
                  {dailyAvg >= 0 ? "+" : ""}{fmt(Math.round(dailyAvg))}
                </span>
                {momComparison.direction === "rebuilding" && (
                  <span style={{ fontSize:10, fontWeight:700, color:"#9a7746" }}>
                    {t("itemsSection.rebuilding")}
                  </span>
                )}
                {momComparison.direction !== "new" && momComparison.direction !== "rebuilding" && momComparison.deltaPct !== null && (
                  <span style={{ fontSize:10, fontWeight:700,
                    color: MOM_CONFIG[momComparison.direction].color }}>
                    {MOM_CONFIG[momComparison.direction].arrow}
                    {Math.abs(Math.round(momComparison.deltaPct))}%
                  </span>
                )}
              </div>
              {momComparison.direction === "rebuilding" && (
                <div style={{ fontSize:9, color:"#9a7746", marginTop:1 }}>
                  {t("itemsSection.since", { date: formatDate(resetAt, dateLocale) })}
                </div>
              )}
              {momComparison.direction !== "new" && momComparison.direction !== "rebuilding" && momComparison.deltaPct !== null && (
                <div style={{ fontSize:9, color:"#b8c0ba", marginTop:1 }}>
                  {t("itemsSection.vsLast30")}
                </div>
              )}
            </div>
            {hasTarget && remaining > 0 && completion && (
              <div>
                <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.1em" }}>{t("itemsSection.estDone")}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#24312c" }}>
                  {formatDate(completion, dateLocale)}
                </div>
              </div>
            )}
            {hasTarget && remaining > 0 && (
              <div>
                <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.1em" }}>{t("itemsSection.remaining")}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#24312c" }}>
                  {fmt(remaining)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => { onUpdate(item); haptics.light(); }} style={{
            flex:2, height:44, borderRadius:12, fontSize:13, fontWeight:700,
            background:"#78917f", color:"white", border:"none", cursor:"pointer",
          }}>{t("itemsSection.update")}</button>
          <button onClick={() => { onGoal(item); haptics.light(); }} style={{
            flex:1, height:44, borderRadius:12, fontSize:12, fontWeight:700,
            background:"#edf2ec", color:"#5c7a6e", border:"none", cursor:"pointer",
          }}>{t("itemsSection.goalBtn")}</button>
          <button onClick={() => setExpanded(e => !e)} style={{
            width:44, height:44, borderRadius:12, fontSize:12, fontWeight:700,
            background: expanded ? "#78917f" : "rgba(255,255,255,0.7)",
            color: expanded ? "white" : "#6f7a73",
            border:"1px solid rgba(72,94,80,0.14)",
            cursor:"pointer", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "none",
                transition:"transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ background:"rgba(237,242,236,0.3)",
          borderRadius:14, padding:"12px 14px", marginBottom:12 }}>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              [t("itemsSection.dailyAvg"),   dailyAvg ? fmt(Math.round(dailyAvg)) : "—"],
              [t("itemsSection.weeklyAvg"),  weeklyAvg ? fmt(Math.round(weeklyAvg)) : "—"],
              [t("itemsSection.estDone"),    completion ? formatDate(completion, dateLocale) : hasTarget ? t("itemsSection.insufficientData") : "—"],
              [t("itemsSection.remaining"),  hasTarget ? fmt(remaining) : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.7)",
                borderRadius:10, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>
                  {label}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#24312c" }}>{val}</div>
              </div>
            ))}
          </div>

          {item.targetDate && (
            <div style={{ fontSize:12, color:"#6f7a73", marginBottom:10 }}>
              {t("itemsSection.targetDeadline", { date: formatDate(item.targetDate, dateLocale) })}
            </div>
          )}

          {/* ── SvS / event reset ── */}
          <div style={{ marginBottom:12 }}>
            {!resetAt && !confirmReset && (
              <button onClick={() => setConfirmReset(true)} style={{
                width:"100%", height:38, borderRadius:10, fontSize:12, fontWeight:700,
                background:"rgba(154,122,98,0.08)", color:"#9a7746",
                border:"1px dashed rgba(154,122,98,0.3)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
                {t("itemsSection.resetAverage")}
              </button>
            )}
            {!resetAt && confirmReset && (
              <div style={{ background:"rgba(154,122,98,0.06)", borderRadius:10,
                padding:"10px 12px", border:"1px solid rgba(154,122,98,0.2)" }}>
                <div style={{ fontSize:12, color:"#9a7746", lineHeight:1.5, marginBottom:8 }}>
                  {t("itemsSection.resetConfirmText")}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setConfirmReset(false)} style={{
                    flex:1, height:34, borderRadius:8, fontSize:12, fontWeight:600,
                    background:"rgba(255,255,255,0.8)", color:"#6f7a73",
                    border:"1px solid rgba(72,94,80,0.14)", cursor:"pointer",
                  }}>{t("common.cancel")}</button>
                  <button onClick={() => { onAverageReset(item.id); setConfirmReset(false); haptics.medium(); }} style={{
                    flex:1, height:34, borderRadius:8, fontSize:12, fontWeight:700,
                    background:"#9a7746", color:"white", border:"none", cursor:"pointer",
                  }}>{t("itemsSection.resetNow")}</button>
                </div>
              </div>
            )}
            {resetAt && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                background:"rgba(154,122,98,0.06)", borderRadius:10,
                padding:"8px 12px", border:"1px solid rgba(154,122,98,0.2)" }}>
                <span style={{ fontSize:11, color:"#9a7746" }}>
                  {t("itemsSection.rebuildingSince", { date: formatDate(resetAt, dateLocale) })}
                </span>
                <button onClick={() => { onClearAverageReset(item.id); haptics.light(); }} style={{
                  fontSize:11, fontWeight:700, color:"#9aa59e",
                  background:"none", border:"none", cursor:"pointer",
                }}>{t("common.undo")}</button>
              </div>
            )}
          </div>

          {/* Mini chart */}
          <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            {t("itemsSection.balanceHistory")}
          </div>
          <MiniChart transactions={transactions} itemId={item.id} item={item}/>

          {/* Inline log */}
          {(() => {
            const itemTxs = transactions
              .filter(t => t.itemId === item.id)
              .sort((a,b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10);
            if (itemTxs.length === 0) return (
              <div style={{ fontSize:12, color:"#b8c0ba", marginTop:8 }}>
                {t("itemsSection.noHistoryYet")}
              </div>
            );
            return (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:10, color:"#9aa59e", fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>
                  {t("itemsSection.recentHistory")}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {itemTxs.map(tx => {
                    const isGain = tx.type === "gain" || tx.type === "goal_contribution";
                    const fmtAmt = item.isMinutes
                      ? formatMinutes(tx.amount)
                      : formatAmount(tx.amount, item.displayUnit);
                    const d = new Date(tx.date);
                    const ago = (() => {
                      const diff = Date.now() - d;
                      const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), dy = Math.floor(diff/86400000);
                      if (m < 2) return t("common.justNow");
                      if (m < 60) return `${m}${t("common.minAgo")}`;
                      if (h < 24) return `${h}${t("common.hourAgo")}`;
                      return `${dy}${t("common.dayAgo")}`;
                    })();
                    return (
                      <div key={tx.id} style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"6px 8px", borderRadius:10,
                        background:"rgba(255,255,255,0.6)",
                      }}>
                        <span style={{ fontSize:13, fontWeight:700, flexShrink:0,
                          color: isGain ? "#5c7a6e" : "#a06358" }}>
                          {isGain ? "+" : "−"}{fmtAmt}
                        </span>
                        <span style={{ fontSize:11, color:"#9aa59e", flex:1,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {tx.reason || (tx.autoDetected ? t("itemsSection.totalUpdated") : t("itemsSection.manualEntry"))}
                        </span>
                        <span style={{ fontSize:10, color:"#b8c0ba", flexShrink:0 }}>{ago}</span>
                        <button onClick={() => onDeleteTransaction(tx.id)}
                          style={{ width:24, height:24, borderRadius:7, flexShrink:0,
                            background:"#fdf0ee", border:"none", cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="#a1766e" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Edit item link */}
          <button onClick={() => onEdit(item)} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:12, color:"#78917f", fontWeight:600,
            padding:"8px 0 0", display:"block",
          }}>
            {t("itemsSection.editItemSettings")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Category accordion — single open at a time via lifted state ───────────────
function CategoryAccordion({
  category, items, transactions, balances,
  isOpen, onToggle,
  onGoal, onEdit, onAddCustom,
  onUpdate, onDeleteTransaction,
  onAverageReset, onClearAverageReset,
}) {
  const { t, tCategory } = useI18n();
  const isWidgets = category === "Widgets";

  return (
    <div style={{
      background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)",
      boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
      borderRadius:22, overflow:"hidden", marginBottom:10,
    }}>
      <button
        onClick={e => { e.preventDefault(); onToggle(); e.currentTarget.blur(); haptics.selection(); }}
        style={{
          width:"100%", display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"14px 16px",
          background:"none", border:"none", cursor:"pointer", minHeight:44,
        }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:16,
            fontWeight:600, color:"#24312c" }}>{tCategory(category)}</span>
          <span style={{ fontSize:11, borderRadius:99, padding:"2px 8px",
            background:"#edf2ec", color:"#5c7a6e", fontWeight:600 }}>
            {items.length}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#9aa59e" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition:"transform 0.2s", flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div style={{ padding:"0 16px 16px" }}>
          {items.length === 0 && !isWidgets && (
            <div style={{ fontSize:13, color:"#9aa59e",
              textAlign:"center", padding:"16px 0" }}>
              {t("itemsSection.noItemsInCategory")}
            </div>
          )}
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              balance={balances[item.id] ?? 0}
              transactions={transactions}
              onGoal={onGoal}
              onEdit={onEdit}
              onUpdate={onUpdate}
              onDeleteTransaction={onDeleteTransaction}
              onAverageReset={onAverageReset}
              onClearAverageReset={onClearAverageReset}
            />
          ))}
          {isWidgets && (
            <button onClick={onAddCustom} style={{
              width:"100%", height:44, marginTop:8, borderRadius:12,
              background:"rgba(255,255,255,0.7)", color:"#78917f",
              fontSize:13, fontWeight:600,
              border:"1px dashed rgba(120,145,127,0.4)", cursor:"pointer",
            }}>
              {t("itemsSection.addCustomItem")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORY_ORDER_KEY = "backpack-hub-category-order-v1";

function loadCategoryOrder() {
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_KEY);
    if (!raw) return CATEGORIES;
    const saved = JSON.parse(raw);
    const merged = saved.filter(c => CATEGORIES.includes(c));
    CATEGORIES.forEach(c => { if (!merged.includes(c)) merged.push(c); });
    return merged;
  } catch { return CATEGORIES; }
}
function saveCategoryOrder(order) {
  try { localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(order)); } catch {}
}

// ─── BackpackItems ─────────────────────────────────────────────────────────────
export default function BackpackItems({
  items, balances, transactions,
  onGoal, onEdit, onAddItem,
  onUpdate, onDeleteTransaction,
  onAverageReset, onClearAverageReset,
}) {
  const { t, tCategory } = useI18n();
  const [openCategory,   setOpenCategory]   = useState("General");
  const [categoryOrder,  setCategoryOrder]  = useState(loadCategoryOrder);
  const [dragging,       setDragging]       = useState(null);
  const [dragOver,       setDragOver]       = useState(null);
  const [reorderMode,    setReorderMode]    = useState(false);

  const toggle = cat => {
    if (reorderMode) return;
    setOpenCategory(prev => prev === cat ? null : cat);
  };

  const commitOrder = (newOrder) => {
    setCategoryOrder(newOrder);
    saveCategoryOrder(newOrder);
  };

  const dragStartY    = useRef(null);
  const dragIndex     = useRef(null);
  const itemHeightRef = useRef(60);

  const onDragTouchStart = (e, index) => {
    dragStartY.current = e.touches[0].clientY;
    dragIndex.current  = index;
    setDragging(index);
    haptics.medium();
  };

  const onDragTouchMove = (e) => {
    if (dragIndex.current === null) return;
    const dy      = e.touches[0].clientY - dragStartY.current;
    const steps   = Math.round(dy / itemHeightRef.current);
    const newOver = Math.max(0, Math.min(categoryOrder.length - 1, dragIndex.current + steps));
    setDragOver(newOver);
  };

  const onDragTouchEnd = () => {
    if (dragIndex.current !== null && dragOver !== null && dragOver !== dragIndex.current) {
      const newOrder = [...categoryOrder];
      const [moved]  = newOrder.splice(dragIndex.current, 1);
      newOrder.splice(dragOver, 0, moved);
      commitOrder(newOrder);
      haptics.success();
    }
    setDragging(null);
    setDragOver(null);
    dragIndex.current  = null;
    dragStartY.current = null;
  };

  return (
    <div>
      {/* Reorder toggle */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
        <button
          onClick={() => setReorderMode(r => !r)}
          style={{ fontSize:12, fontWeight:700, color: reorderMode ? "#78917f" : "#9aa59e",
            background: reorderMode ? "#edf2ec" : "none",
            border: reorderMode ? "1px solid rgba(92,122,110,0.2)" : "none",
            borderRadius:99, padding:"4px 12px", cursor:"pointer" }}>
          {reorderMode ? t("itemsSection.doneReordering") : t("itemsSection.reorderSections")}
        </button>
      </div>

      {categoryOrder.map((cat, index) => {
        const catItems = items.filter(i => i.category === cat);
        const isDragged = dragging === index;
        const isTarget  = dragOver  === index && dragging !== index;

        if (reorderMode) {
          return (
            <div
              key={cat}
              ref={el => { if (el) itemHeightRef.current = el.offsetHeight + 8; }}
              style={{
                marginBottom: 8,
                opacity: isDragged ? 0.5 : 1,
                transform: isTarget ? "scale(1.02)" : "scale(1)",
                transition: "transform 0.15s, opacity 0.15s",
              }}>
              <div style={{
                display:"flex", alignItems:"center", gap:12,
                background: isTarget ? "rgba(237,244,236,0.95)" : "rgba(255,255,255,0.82)",
                border:`1px solid ${isTarget ? "rgba(92,122,110,0.3)" : "rgba(74,92,80,0.09)"}`,
                borderRadius:18, padding:"14px 16px",
                boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
              }}>
                <div
                  onTouchStart={e => onDragTouchStart(e, index)}
                  onTouchMove={onDragTouchMove}
                  onTouchEnd={onDragTouchEnd}
                  style={{ cursor:"grab", padding:"4px 8px 4px 0",
                    touchAction:"none", flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#b8c0ba" strokeWidth="2" strokeLinecap="round">
                    <line x1="8" y1="6"  x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6"  x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </div>
                <span style={{ fontFamily:"'Fraunces',serif", fontSize:16,
                  fontWeight:600, color:"#24312c", flex:1 }}>{tCategory(cat)}</span>
                <span style={{ fontSize:11, borderRadius:99, padding:"2px 8px",
                  background:"#edf2ec", color:"#5c7a6e", fontWeight:600 }}>
                  {catItems.length}
                </span>
                <div style={{ display:"flex", gap:4 }}>
                  <button
                    onClick={() => {
                      if (index === 0) return;
                      const o = [...categoryOrder];
                      [o[index-1], o[index]] = [o[index], o[index-1]];
                      commitOrder(o); haptics.light();
                    }}
                    disabled={index === 0}
                    style={{ width:30, height:30, borderRadius:8, border:"none",
                      background:"rgba(72,94,80,0.07)", cursor:"pointer",
                      color: index === 0 ? "#d6ddd6" : "#78917f",
                      fontSize:16, display:"flex", alignItems:"center",
                      justifyContent:"center" }}>↑</button>
                  <button
                    onClick={() => {
                      if (index === categoryOrder.length-1) return;
                      const o = [...categoryOrder];
                      [o[index], o[index+1]] = [o[index+1], o[index]];
                      commitOrder(o); haptics.light();
                    }}
                    disabled={index === categoryOrder.length-1}
                    style={{ width:30, height:30, borderRadius:8, border:"none",
                      background:"rgba(72,94,80,0.07)", cursor:"pointer",
                      color: index === categoryOrder.length-1 ? "#d6ddd6" : "#78917f",
                      fontSize:16, display:"flex", alignItems:"center",
                      justifyContent:"center" }}>↓</button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <CategoryAccordion
            key={cat}
            category={cat}
            items={catItems}
            balances={balances}
            transactions={transactions}
            isOpen={openCategory === cat}
            onToggle={() => toggle(cat)}
            onGoal={onGoal}
            onEdit={onEdit}
            onAddCustom={() => onAddItem(cat)}
            onUpdate={onUpdate}
            onDeleteTransaction={onDeleteTransaction}
            onAverageReset={onAverageReset}
            onClearAverageReset={onClearAverageReset}
          />
        );
      })}
    </div>
  );
}
