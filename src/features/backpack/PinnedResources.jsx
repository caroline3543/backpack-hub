// ─── PinnedResources.jsx ──────────────────────────────────────────────────────
// "What are the 3 resources I'm currently focusing on?" — pinned items get a
// prominent, detail-rich section at the very top of the Backpack page.

import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import PinIcon from "../../components/PinIcon.jsx";
import { formatAmount, formatMinutes } from "./backpackConstants.js";
import { ITEM_ICONS } from "./itemIcons.js";
import { calcDailyAverage, estimateCompletion, formatDate } from "./backpackForecast.js";

function PinnedCard({ item, balance, transactions, onUnpin }) {
  const { t, tItem, dateLocale } = useI18n();
  const hasTarget = Number(item.targetAmount) > 0;
  const target = Number(item.targetAmount);
  const fmt = v => item.isMinutes ? formatMinutes(v) : formatAmount(v, item.displayUnit);
  const pct = hasTarget ? Math.round(Math.min(100, (balance / target) * 100)) : null;

  const dailyAvg = useMemo(() => calcDailyAverage(transactions, item.id), [transactions, item.id]);
  const completion = useMemo(() => estimateCompletion(balance, target, dailyAvg), [balance, target, dailyAvg]);

  return (
    <div style={{
      background:"rgba(255,255,255,0.9)",
      border:"1px solid rgba(201,150,47,0.25)",
      boxShadow:"0 4px 16px rgba(71,86,75,0.08)",
      borderRadius:20, padding:16, position:"relative",
    }}>
      <button
        onClick={() => onUnpin(item.id)}
        aria-label={t("itemsSection.unpin")}
        style={{
          position:"absolute", top:12, insetInlineEnd:12,
          background:"none", border:"none", cursor:"pointer", padding:4,
        }}>
        <PinIcon pinned size={17} />
      </button>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingInlineEnd:24 }}>
        {ITEM_ICONS[item.id] ? (
          <img src={ITEM_ICONS[item.id]} alt="" width={28} height={28}
            style={{ borderRadius:8, objectFit:"cover", flexShrink:0 }} />
        ) : (
          <span aria-hidden="true" style={{ width:28, height:28, borderRadius:8,
            background:"rgba(72,94,80,0.06)", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:14, flexShrink:0 }}>🎒</span>
        )}
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:600, color:"#24312c" }}>
          {tItem(item.id, item.name)}
        </span>
      </div>

      <div style={{ display:"flex", gap:20, marginBottom: hasTarget ? 10 : 0 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:"#9aa59e", textTransform:"uppercase",
            letterSpacing:"0.1em", marginBottom:2 }}>{t("pinnedSection.current")}</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:600, color:"#24312c" }}>
            {fmt(balance)}
          </div>
        </div>
        {hasTarget ? (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#9aa59e", textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:2 }}>{t("pinnedSection.goal")}</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:600, color:"#24312c" }}>
              {fmt(target)}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#b8c0ba" }}>{t("pinnedSection.noGoalSet")}</span>
          </div>
        )}
      </div>

      {hasTarget && (
        <>
          <div style={{ height:8, background:"rgba(72,94,80,0.10)",
            borderRadius:99, overflow:"hidden", marginBottom:6 }}>
            <div style={{ height:"100%", borderRadius:99, width:`${pct}%`,
              background: pct >= 100 ? "#5c7a6e" : "linear-gradient(90deg,#e0b65a 0%,#c9962f 100%)",
              transition:"width 0.4s ease" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#9a7746" }}>{pct}%</span>
            <span style={{ fontSize:11, color:"#9aa59e" }}>
              {completion
                ? t("pinnedSection.estimatedGoal", { date: formatDate(completion, dateLocale) })
                : t("pinnedSection.notEnoughData")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function PinnedResources({ items, balances, transactions, pinnedItems, onTogglePin }) {
  const { t } = useI18n();
  const pinnedObjs = (pinnedItems || []).map(id => items.find(i => i.id === id)).filter(Boolean);

  return (
    <div style={{ marginTop:16, marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:600, color:"#24312c" }}>
          📌 {t("pinnedSection.title")}
        </span>
      </div>

      {pinnedObjs.length === 0 ? (
        <div style={{
          background:"rgba(255,255,255,0.6)", border:"1px dashed rgba(201,150,47,0.35)",
          borderRadius:18, padding:"16px 18px",
        }}>
          <div style={{ fontSize:13, color:"#9a7746", lineHeight:1.5 }}>
            {t("pinnedSection.emptyHint")}
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {pinnedObjs.map(item => (
            <PinnedCard
              key={item.id}
              item={item}
              balance={balances[item.id] ?? 0}
              transactions={transactions}
              onUnpin={onTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
