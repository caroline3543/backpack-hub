// ─── BackpackSummary.jsx ──────────────────────────────────────────────────────
// Hero stats + Recent Activity panel.

import { useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { formatAmount, formatMinutes } from "./backpackConstants.js";
import { calcGrowthInsights, formatCompact } from "./backpackForecast.js";
import { useSvsPrepDate } from "./useSvsPrepDate.js";

function StatCard({ label, value, sub, empty }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.82)",
      border:"1px solid rgba(74,92,80,0.09)",
      boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
      borderRadius:20, padding:"12px 14px",
    }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.18em", color:"#819286", marginBottom:6, lineHeight:1.2 }}>
        {label}
      </div>
      {empty ? (
        <div style={{ fontSize:12, color:"#b8c0ba", lineHeight:1.4 }}>{empty}</div>
      ) : (
        <>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:18,
            fontWeight:600, color:"#24312c", lineHeight:1.2 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize:11, color:"#9aa59e", marginTop:3 }}>{sub}</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SvS Prep countdown card ──────────────────────────────────────────────────
// Tap the card to edit the target date inline (native <input type="date">).
function SvsPrepCard() {
  const { t, dateLocale } = useI18n();
  const [date, setDate] = useSvsPrepDate();
  const [editing, setEditing] = useState(false);

  const daysLeft = useMemo(() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today  = new Date(); today.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }, [date]);

  let value, sub;
  if (!date) {
    value = "—";
    sub = t("svsPrep.setDate");
  } else if (daysLeft > 1) {
    value = new Date(date + "T00:00:00").toLocaleDateString(dateLocale, { day:"numeric", month:"short" });
    sub = t("svsPrep.daysLeft", { count: daysLeft });
  } else if (daysLeft === 1) {
    value = new Date(date + "T00:00:00").toLocaleDateString(dateLocale, { day:"numeric", month:"short" });
    sub = t("svsPrep.dayLeft", { count: 1 });
  } else if (daysLeft === 0) {
    value = t("svsPrep.today");
    sub = null;
  } else {
    value = new Date(date + "T00:00:00").toLocaleDateString(dateLocale, { day:"numeric", month:"short" });
    sub = t("svsPrep.started");
  }

  if (editing) {
    return (
      <div style={{
        background:"rgba(255,255,255,0.82)",
        border:"1px solid rgba(74,92,80,0.09)",
        boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
        borderRadius:20, padding:"12px 14px",
      }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
          letterSpacing:"0.18em", color:"#819286", marginBottom:6, lineHeight:1.2 }}>
          {t("svsPrep.editLabel")}
        </div>
        <input
          type="date"
          autoFocus
          value={date || ""}
          onChange={e => setDate(e.target.value)}
          style={{
            width:"100%", border:"1px solid #e3e8e2", borderRadius:10,
            padding:"6px 8px", fontSize:13, color:"#24312c",
            fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box",
            marginBottom:8,
          }}
        />
        <button onClick={() => setEditing(false)} style={{
          width:"100%", height:32, borderRadius:10, border:"none",
          background:"#78917f", color:"white", fontSize:12, fontWeight:700, cursor:"pointer",
        }}>
          {t("svsPrep.save")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        textAlign:"left", background:"rgba(255,255,255,0.82)",
        border:"1px solid rgba(74,92,80,0.09)",
        boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
        borderRadius:20, padding:"12px 14px", cursor:"pointer",
        font:"inherit",
      }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.18em", color:"#819286", marginBottom:6, lineHeight:1.2 }}>
        {t("svsPrep.label")}
      </div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:18,
        fontWeight:600, color:"#24312c", lineHeight:1.2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize:11, color:"#9aa59e", marginTop:3 }}>{sub}</div>
      )}
    </button>
  );
}

function timeAgo(iso, t) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (m < 2) return t("common.justNow");
  if (m < 60) return `${m}${t("common.minAgo")}`;
  if (h < 24) return `${h}${t("common.hourAgo")}`;
  return `${d}${t("common.dayAgo")}`;
}

export default function BackpackSummary({ summary, items, transactions, onGain, onSpend, onSnapshot }) {
  const { t, tItem } = useI18n();
  const { topPriority, closestToTarget, biggestShortage, recent } = summary;

  useMemo(() => calcGrowthInsights(transactions, items), [transactions, items]);

  const recentActivity = recent.slice(0, 3).map(tx => {
    const item = items.find(i => i.id === tx.itemId);
    const verb = tx.type === "gain" ? t("summary.gained")
      : tx.type === "spend" ? t("summary.spent")
      : t("summary.contributedToGoal");
    const fmt = item?.isMinutes
      ? formatMinutes(tx.amount)
      : formatAmount(tx.amount, item?.displayUnit);
    return {
      text: `${verb} ${fmt} ${item ? tItem(item.id, item.name) : ""}`,
      sub:  tx.reason || null,
      time: timeAgo(tx.date, t),
      type: tx.type,
    };
  });

  return (
    <>
      {/* ── 4-stat grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
        <SvsPrepCard />
        <StatCard
          label={t("summary.almostThere")}
          value={closestToTarget ? tItem(closestToTarget.id, closestToTarget.name) : undefined}
          sub={closestToTarget ? t("summary.percentThere", { pct: Math.round((closestToTarget.ratio||0)*100) }) : undefined}
          empty={!closestToTarget ? t("summary.setTargetToTrack") : undefined}
        />
        <StatCard
          label={t("summary.couldUseLove")}
          value={biggestShortage ? tItem(biggestShortage.id, biggestShortage.name) : undefined}
          sub={biggestShortage ? t("summary.largestGap") : undefined}
          empty={!biggestShortage ? t("summary.noGapsDetected") : undefined}
        />
        <StatCard
          label={t("summary.yourFocus")}
          value={topPriority ? tItem(topPriority.id, topPriority.name) : undefined}
          sub={topPriority ? t("summary.highestUrgency") : undefined}
          empty={!topPriority ? t("summary.nothingSetYet") : undefined}
        />
      </div>

      {/* ── Recent activity ── */}
      <div style={{
        background:"rgba(255,255,255,0.82)",
        border:"1px solid rgba(74,92,80,0.09)",
        boxShadow:"0 4px 16px rgba(71,86,75,0.07)",
        borderRadius:22, padding:16, marginTop:14,
      }}>
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.18em", color:"#9a7a62", marginBottom:4 }}>
              {t("summary.recentChanges")}
            </div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20,
              fontWeight:600, color:"#24312c" }}>{t("summary.recentActivity")}</div>
          </div>
          <div style={{ width:40, height:40, borderRadius:12, background:"#edf2ec",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#78917f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ fontSize:13, color:"#9aa59e", padding:"4px 0 8px" }}>
            {t("summary.noActivity")}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", marginTop:5,
                  background: a.type === "gain" ? "#5c7a6e"
                    : a.type === "spend" ? "#a06358" : "#78917f",
                  flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"#24312c", fontWeight:500 }}>
                    {a.text}
                  </div>
                  {a.sub && (
                    <div style={{ fontSize:11, color:"#9aa59e" }}>{a.sub}</div>
                  )}
                </div>
                <div style={{ fontSize:11, color:"#b0b8b2", flexShrink:0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          <button onClick={onGain} style={{
            height:44, borderRadius:14, fontSize:13, fontWeight:700,
            background:"#edf4ea", color:"#5c7a6e", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#5c7a6e" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t("summary.gain")}
          </button>
          <button onClick={onSpend} style={{
            height:44, borderRadius:14, fontSize:13, fontWeight:700,
            background:"#f7edd9", color:"#9a7746", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#9a7746" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t("summary.spend")}
          </button>
          <button onClick={onSnapshot} style={{
            height:44, borderRadius:14, fontSize:13, fontWeight:700,
            background:"#edf2ec", color:"#5c7a6e", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#5c7a6e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t("summary.snapshot")}
          </button>
        </div>
      </div>
    </>
  );
}
