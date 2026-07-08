// ─── BackpackHistory.jsx ──────────────────────────────────────────────────────
// Transaction log with snapshot comparison card at top.

import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { formatAmount, formatMinutes } from "./backpackConstants.js";

function timeAgo(iso, t, dateLocale) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2)  return t("common.justNow");
  if (mins < 60) return `${mins}${t("common.minAgo")}`;
  if (hrs < 24)  return `${hrs}${t("common.hourAgo")}`;
  if (days < 7)  return `${days}${t("common.dayAgo")}`;
  return new Date(iso).toLocaleDateString(dateLocale, { month:"short", day:"numeric" });
}

function SnapshotCard({ snapshots, items, balances }) {
  const { t, tItem, dateLocale } = useI18n();
  if (snapshots.length === 0) return null;
  const latest = snapshots[0];
  let data = {};
  try { data = JSON.parse(latest.snapshotData); } catch {}

  const changes = items.slice(0,4).map(item => {
    const snap   = data[item.id];
    const current = balances[item.id] ?? 0;
    const prev   = snap?.balance ?? 0;
    const delta  = current - prev;
    const fmt    = v => item.isMinutes ? formatMinutes(v) : formatAmount(v, item.displayUnit);
    return { name: tItem(item.id, item.name), delta, fmt };
  });

  return (
    <div style={{
      background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)",
      borderRadius:20, padding:14, marginBottom:14,
    }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.15em", color:"#9a7a62", marginBottom:6 }}>
        {t("history.snapshotComparison")}
      </div>
      <div style={{ fontSize:12, color:"#9aa59e", marginBottom:10 }}>
        {t("history.vs", { time: timeAgo(latest.date, t, dateLocale) })}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {changes.map(c => (
          <div key={c.name} style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:"#4c5a52" }}>{c.name}</span>
            <span style={{ fontSize:13, fontWeight:700,
              color: c.delta > 0 ? "#5c7a6e" : c.delta < 0 ? "#a06358" : "#9aa59e" }}>
              {c.delta > 0 ? "+" : ""}{c.fmt(c.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TxRow({ tx, items, onEdit }) {
  const { t, tItem, dateLocale } = useI18n();
  const item   = items.find(i => i.id === tx.itemId);
  const isGain = tx.type === "gain";
  const fmt    = v => item?.isMinutes ? formatMinutes(v) : formatAmount(v, item?.displayUnit);

  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:12,
      padding:"12px 0", borderBottom:"1px solid rgba(72,94,80,0.07)",
    }}>
      {/* Icon */}
      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
        background: isGain ? "#edf4ea" : "#f7edd9",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={isGain ? "#5c7a6e" : "#9a7746"}
          strokeWidth="2.5" strokeLinecap="round">
          {isGain
            ? <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
            : <line x1="5" y1="12" x2="19" y2="12"/>
          }
        </svg>
      </div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#24312c",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {item ? tItem(item.id, item.name) : t("history.unknownItem")}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:2, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"#9aa59e" }}>{timeAgo(tx.date, t, dateLocale)}</span>
          {tx.reason && (
            <span style={{ fontSize:11, color:"#6f7a73" }}>{tx.reason}</span>
          )}
        </div>
      </div>

      {/* Amount + edit */}
      <div style={{ display:"flex", flexDirection:"column",
        alignItems:"flex-end", gap:4, flexShrink:0 }}>
        <span style={{ fontSize:14, fontWeight:700,
          color: isGain ? "#5c7a6e" : "#a06358" }}>
          {isGain ? "+" : "−"}{fmt(tx.amount)}
        </span>
        <button onClick={() => onEdit(tx)} style={{
          background:"none", border:"none", cursor:"pointer",
          fontSize:11, color:"#9aa59e", padding:0 }}>{t("history.edit")}</button>
      </div>
    </div>
  );
}

export default function BackpackHistory({ transactions, snapshots, items, balances, onEdit }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all"); // all | gain | spend

  const filtered = transactions.filter(tx =>
    filter === "all" ? true : tx.type === filter
  );

  const filterLabels = { all: t("history.all"), gain: t("history.gainsFilter"), spend: t("history.spendsFilter") };

  return (
    <div>
      <SnapshotCard snapshots={snapshots} items={items} balances={balances} />

      {/* Filter row */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {["all","gain","spend"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
            background: filter === f ? "#78917f" : "rgba(255,255,255,0.7)",
            color: filter === f ? "white" : "#6f7a73",
            border: filter === f ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
            cursor:"pointer",
          }}>{filterLabels[f]}</button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div style={{ background:"rgba(255,255,255,0.82)",
          border:"1px solid rgba(74,92,80,0.09)",
          borderRadius:20, padding:"28px 16px", textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#24312c", marginBottom:4 }}>
            {t("history.noTransactionsTitle")}
          </div>
          <div style={{ fontSize:13, color:"#9aa59e" }}>
            {t("history.noTransactionsBody")}
          </div>
        </div>
      ) : (
        <div style={{ background:"rgba(255,255,255,0.82)",
          border:"1px solid rgba(74,92,80,0.09)",
          borderRadius:20, padding:"0 16px" }}>
          {filtered.map(tx => (
            <TxRow key={tx.id} tx={tx} items={items} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
