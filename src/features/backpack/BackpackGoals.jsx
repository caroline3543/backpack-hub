// ─── BackpackGoals.jsx ────────────────────────────────────────────────────────
// Target date, pace status, daily/weekly required rate, estimated completion.

import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { formatAmount, formatMinutes } from "./backpackConstants.js";
import {
  calcDailyAverage, calcWeeklyAverage, estimateCompletion,
  calcPaceStatus, PACE_COLORS, PACE_I18N_KEY, formatDate,
} from "./backpackForecast.js";

function GoalCard({ item, balance, transactions }) {
  const { t, tItem, dateLocale } = useI18n();
  const target    = Number(item.targetAmount);
  const isMins    = item.isMinutes;
  const fmt       = v => isMins ? formatMinutes(v) : formatAmount(v, item.displayUnit);

  const remaining   = Math.max(0, target - balance);
  const pct         = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  const dailyAvg    = useMemo(() => calcDailyAverage(transactions, item.id), [transactions, item.id]);
  const weeklyAvg   = useMemo(() => calcWeeklyAverage(transactions, item.id), [transactions, item.id]);
  const completion  = useMemo(() => estimateCompletion(balance, target, dailyAvg), [balance, target, dailyAvg]);
  const paceStatus  = useMemo(() => calcPaceStatus(balance, target, item.targetDate, dailyAvg), [balance, target, item.targetDate, dailyAvg]);
  const paceColors  = PACE_COLORS[paceStatus];
  const paceLabel   = t(`pace.${PACE_I18N_KEY[paceStatus]}`);

  const reqDaily = useMemo(() => {
    if (!item.targetDate || !remaining) return null;
    const daysLeft = Math.max(1, (new Date(item.targetDate) - new Date()) / 86400000);
    return remaining / daysLeft;
  }, [item.targetDate, remaining]);

  return (
    <div style={{
      background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)",
      boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
      borderRadius:20, padding:16, marginBottom:10,
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:15, fontWeight:700, color:"#24312c",
          flex:1, marginRight:8, lineHeight:1.3 }}>{tItem(item.id, item.name)}</span>
        <span style={{ fontSize:10, fontWeight:700, borderRadius:99,
          padding:"3px 10px", flexShrink:0,
          background:paceColors.background, color:paceColors.color }}>
          {paceLabel}
        </span>
      </div>

      {/* Progress */}
      <div style={{ fontSize:13, color:"#6f7a73", marginBottom:8 }}>
        {fmt(balance)} / {fmt(target)}
      </div>
      <div style={{ height:8, background:"rgba(72,94,80,0.10)",
        borderRadius:99, overflow:"hidden", marginBottom:12 }}>
        <div style={{ height:"100%", borderRadius:99, width:`${pct}%`,
          background: pct >= 100 ? "#5c7a6e"
            : "linear-gradient(90deg,#8aab9b 0%,#5c7a6e 100%)",
          transition:"width 0.4s ease" }}/>
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          [t("goals.remaining"),  remaining > 0 ? fmt(remaining) : t("goals.done")],
          [t("goals.dailyAvg"),   dailyAvg ? `${dailyAvg>=0?"+":""}${fmt(Math.round(dailyAvg))}` : t("goals.noData")],
          [t("goals.weeklyAvg"),  weeklyAvg ? fmt(Math.round(weeklyAvg)) : t("goals.noData")],
          [t("goals.estDone"),    completion ? formatDate(completion, dateLocale) : remaining === 0 ? t("goals.complete") : t("goals.insufficientData")],
        ].map(([label, val]) => (
          <div key={label} style={{ background:"rgba(237,242,236,0.4)",
            borderRadius:10, padding:"8px 10px" }}>
            <div style={{ fontSize:10, color:"#9aa59e", fontWeight:600,
              textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>
              {label}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:"#24312c" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Target date + required rate */}
      {item.targetDate && (
        <div style={{ marginTop:10, padding:"8px 10px",
          background: paceStatus === "behind" ? "rgba(245,227,223,0.4)" : "rgba(237,242,236,0.4)",
          borderRadius:10 }}>
          <div style={{ fontSize:12, color:"#6f7a73" }}>
            {t("goals.deadline")}: <strong>{formatDate(item.targetDate, dateLocale)}</strong>
          </div>
          {reqDaily && reqDaily > 0 && (
            <div style={{ fontSize:12, color:"#6f7a73", marginTop:3 }}>
              {t("goals.needPerDay", { amount: fmt(Math.ceil(reqDaily)) })}
              {dailyAvg > 0 && (
                <span style={{ color: dailyAvg >= reqDaily ? "#5c7a6e" : "#a06358" }}>
                  {" "}({t("goals.currently", { amount: fmt(Math.round(dailyAvg)) })})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BackpackGoals({ items, balances, transactions }) {
  const { t } = useI18n();
  const goalItems = items
    .filter(i => Number(i.targetAmount) > 0)
    .sort((a,b) => {
      const order = ["behind","on-track","ahead","complete","no-data","no-target"];
      const pA = calcPaceStatus(balances[a.id]??0, a.targetAmount, a.targetDate, calcDailyAverage(transactions,a.id));
      const pB = calcPaceStatus(balances[b.id]??0, b.targetAmount, b.targetDate, calcDailyAverage(transactions,b.id));
      return order.indexOf(pA) - order.indexOf(pB);
    });

  if (goalItems.length === 0) {
    return (
      <div style={{ background:"rgba(255,255,255,0.82)",
        border:"1px solid rgba(74,92,80,0.09)",
        borderRadius:20, padding:"32px 16px", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🎯</div>
        <div style={{ fontSize:16, fontWeight:700, color:"#24312c", marginBottom:6 }}>
          {t("goals.noGoalsTitle")}
        </div>
        <div style={{ fontSize:13, color:"#9aa59e", lineHeight:1.6, maxWidth:240, margin:"0 auto" }}>
          {t("goals.noGoalsBody")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:12, color:"#9aa59e", marginBottom:14, lineHeight:1.5 }}>
        {t(goalItems.length === 1 ? "goals.goalsTracked" : "goals.goalsTrackedPlural", { count: goalItems.length })}
      </div>
      {goalItems.map(item => (
        <GoalCard
          key={item.id}
          item={item}
          balance={balances[item.id] ?? 0}
          transactions={transactions}
        />
      ))}
    </div>
  );
}
