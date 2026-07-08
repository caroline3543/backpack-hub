// ─── BackpackSheet.jsx ────────────────────────────────────────────────────────
// Slide-up sheet for: update total, add/edit item, set goal.
// "Update total" is the primary mode — user enters their new current amount,
// gain/spend is automatically detected and recorded.

import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";
import {
  CATEGORIES, PRIORITY_OPTIONS, RESOURCE_UNITS, UNIT_MULTIPLIER,
  formatAmount, formatMinutes,
} from "./backpackConstants.js";

const inputStyle = {
  width:"100%", background:"white",
  border:"1px solid #e3e8e2", borderRadius:14,
  padding:"12px 16px", fontSize:15, color:"#24312c",
  outline:"none", fontFamily:"'DM Sans',sans-serif",
  boxSizing:"border-box",
};

const labelStyle = {
  fontSize:11, fontWeight:700, textTransform:"uppercase",
  letterSpacing:"0.15em", color:"#9aa59e", display:"block", marginBottom:6,
};

function UnitChips({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, marginTop:8 }}>
      {RESOURCE_UNITS.map(u => (
        <button key={u} onClick={() => onChange(u)} style={{
          padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700,
          background: value === u ? "#78917f" : "rgba(255,255,255,0.7)",
          color: value === u ? "white" : "#6f7a73",
          border: value === u ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
          cursor:"pointer",
        }}>{u}</button>
      ))}
    </div>
  );
}

// ─── Update Total form (primary) ──────────────────────────────────────────────
function UpdateTotalForm({ item, currentBalance, isFirstEntry, onSubmit }) {
  const { t, tItem } = useI18n();
  const isResource = item?.category === "Resources";
  const isSpeedup  = item?.isMinutes;
  const unit       = item?.displayUnit || null;

  const [rawAmount,   setRawAmount]   = useState("");
  const [displayUnit, setDisplayUnit] = useState(unit);
  const [reason,      setReason]      = useState("");

  const parsedAmount = rawAmount === "" ? null : (() => {
    let n = Number(rawAmount);
    if (isResource && displayUnit) n = n * (UNIT_MULTIPLIER[displayUnit] || 1);
    return n;
  })();

  const delta = parsedAmount !== null ? parsedAmount - currentBalance : null;
  const isGain = delta !== null && delta > 0;

  const fmtVal = v => isSpeedup ? formatMinutes(v) : formatAmount(v, displayUnit || unit);
  const exactStored = rawAmount && isResource && displayUnit
    ? (Number(rawAmount) * (UNIT_MULTIPLIER[displayUnit]||1)).toLocaleString()
    : null;

  const canSubmit = isFirstEntry
    ? parsedAmount !== null && parsedAmount > 0
    : parsedAmount !== null && delta !== 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {!isFirstEntry && (
        <div style={{ background:"rgba(237,242,236,0.5)", borderRadius:12,
          padding:"10px 14px" }}>
          <div style={{ fontSize:12, color:"#6f7a73" }}>
            {t("sheet.currentlyInBackpack")}
          </div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22,
            fontWeight:600, color:"#24312c", marginTop:2 }}>
            {fmtVal(currentBalance)}
          </div>
        </div>
      )}
      {isFirstEntry && (
        <div style={{ background:"rgba(237,242,236,0.5)", borderRadius:12,
          padding:"10px 14px" }}>
          <div style={{ fontSize:13, color:"#5c7a6e", fontWeight:600 }}>
            {t("sheet.firstTimeTracking")}
          </div>
          <div style={{ fontSize:12, color:"#6f7a73", marginTop:3 }}>
            {t("sheet.firstTimeBody")}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>
          {isFirstEntry ? t("sheet.howMuchNow") : t("sheet.whatsNewTotal")}
          {isSpeedup ? t("sheet.inMinutes") : ""}
        </label>
        <input style={inputStyle} type="number" min="0"
          placeholder={isSpeedup ? t("sheet.egMinutes") : t("sheet.enterCurrentAmount")}
          value={rawAmount}
          onChange={e => setRawAmount(e.target.value)} />
        {isResource && (
          <UnitChips value={displayUnit}
            onChange={u => setDisplayUnit(u)} />
        )}
        {exactStored && (
          <div style={{ fontSize:11, color:"#5c7a6e", marginTop:6,
            background:"#edf4ea", borderRadius:8, padding:"5px 10px" }}>
            {t("sheet.storedAs", { value: exactStored })}
          </div>
        )}
      </div>

      {isFirstEntry && rawAmount !== "" && parsedAmount !== null && parsedAmount > 0 && (
        <div style={{ borderRadius:12, padding:"10px 14px",
          background:"#edf2ec", border:"1px solid rgba(92,122,110,0.2)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#5c7a6e" }}>
            {t("sheet.startingAmountSaved")}
          </div>
          <div style={{ fontSize:13, color:"#24312c", marginTop:3 }}>
            {t("sheet.willBeBaseline", { amount: fmtVal(parsedAmount) })}
          </div>
        </div>
      )}
      {!isFirstEntry && delta !== null && delta !== 0 && (
        <div style={{
          borderRadius:12, padding:"10px 14px",
          background: isGain ? "#edf4ea" : "#f7edd9",
          border: `1px solid ${isGain ? "rgba(92,122,110,0.2)" : "rgba(154,119,70,0.2)"}`,
        }}>
          <div style={{ fontSize:12, fontWeight:700,
            color: isGain ? "#5c7a6e" : "#9a7746" }}>
            {isGain ? t("sheet.gainDetected") : t("sheet.spendDetected")}
          </div>
          <div style={{ fontSize:13, color:"#24312c", marginTop:3 }}>
            {isGain
              ? t("sheet.addedToBackpack", { amount: fmtVal(delta) })
              : t("sheet.removedFromBackpack", { amount: fmtVal(Math.abs(delta)) })
            }
          </div>
        </div>
      )}
      {!isFirstEntry && delta === 0 && rawAmount !== "" && (
        <div style={{ borderRadius:12, padding:"10px 14px",
          background:"rgba(72,94,80,0.06)" }}>
          <div style={{ fontSize:13, color:"#9aa59e" }}>
            {t("sheet.sameAsCurrent")}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>{t("sheet.whatsItFrom")}</label>
        <input style={inputStyle} value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t("sheet.egReason")} />
      </div>

      <button onClick={() => canSubmit && onSubmit({ newTotal: parsedAmount, reason })}
        style={{ width:"100%", height:50, borderRadius:16,
          background: canSubmit ? "#78917f" : "rgba(72,94,80,0.2)",
          color: canSubmit ? "white" : "#9aa59e",
          fontSize:15, fontWeight:600, border:"none",
          cursor: canSubmit ? "pointer" : "default" }}>
        {isFirstEntry ? t("sheet.setStartingAmount") : t("sheet.updateBackpack")}
      </button>
    </div>
  );
}

// ─── Item form ────────────────────────────────────────────────────────────────
function ItemForm({ initial, onSubmit }) {
  const { t, tCategory } = useI18n();
  const [form, setForm] = useState({
    name:"", category:"Widgets", priority:"Medium",
    currentAmount:0, targetAmount:0, displayUnit:null, notes:"",
    ...initial,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const isResource = form.category === "Resources";
  const isSpeedup  = form.category === "Speedups";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div>
        <label style={labelStyle}>{t("sheet.itemName")}</label>
        <input style={inputStyle} value={form.name}
          onChange={set("name")} placeholder={t("sheet.egItemName")} />
      </div>
      <div>
        <label style={labelStyle}>{t("sheet.category")}</label>
        <select style={{ ...inputStyle, appearance:"none", cursor:"pointer" }}
          value={form.category} onChange={set("category")}>
          {CATEGORIES.map(c => <option key={c} value={c}>{tCategory(c)}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <label style={labelStyle}>{t("sheet.startingAmount")}</label>
          <input style={inputStyle} type="number" min="0"
            value={form.currentAmount} onChange={set("currentAmount")} />
          {isResource && (
            <UnitChips value={form.displayUnit}
              onChange={u => setForm(f => ({ ...f, displayUnit: u }))} />
          )}
          {isSpeedup && (
            <div style={{ fontSize:11, color:"#9aa59e", marginTop:4 }}>{t("sheet.enterInMinutes")}</div>
          )}
        </div>
        <div>
          <label style={labelStyle}>{t("sheet.goalAmount")}</label>
          <input style={inputStyle} type="number" min="0"
            value={form.targetAmount} onChange={set("targetAmount")} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>{t("sheet.targetDateOptional")}</label>
        <input style={inputStyle} type="date"
          value={form.targetDate ? form.targetDate.slice(0,10) : ""}
          onChange={e => setForm(f => ({ ...f, targetDate: e.target.value || null }))} />
        <div style={{ fontSize:11, color:"#9aa59e", marginTop:4 }}>
          {t("sheet.setDeadlineHint")}
        </div>
      </div>
      <div>
        <label style={labelStyle}>{t("sheet.notes")}</label>
        <textarea style={{ ...inputStyle, resize:"none", lineHeight:1.5 }}
          rows={2} value={form.notes} onChange={set("notes")}
          placeholder={t("sheet.notesPlaceholder")} />
      </div>
      <button onClick={() => form.name.trim() && onSubmit(form)}
        style={{ width:"100%", height:50, borderRadius:16,
          background: form.name.trim() ? "#78917f" : "rgba(72,94,80,0.2)",
          color: form.name.trim() ? "white" : "#9aa59e",
          fontSize:15, fontWeight:600, border:"none",
          cursor: form.name.trim() ? "pointer" : "default" }}>
        {t("sheet.saveItem")}
      </button>
    </div>
  );
}

// ─── Goal form ────────────────────────────────────────────────────────────────
function GoalForm({ initial, items, onSubmit }) {
  const { t, tItem } = useI18n();
  const [form, setForm] = useState({
    itemId:       initial?.itemId || "",
    targetAmount: initial?.targetAmount || 0,
    targetDate:   initial?.targetDate ? initial.targetDate.slice(0,10) : "",
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const selectedItem = items.find(i => i.id === (form.itemId || initial?.itemId));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {!initial?.itemId && (
        <div>
          <label style={labelStyle}>{t("sheet.itemRequired")}</label>
          <select style={{ ...inputStyle, appearance:"none", cursor:"pointer" }}
            value={form.itemId} onChange={set("itemId")}>
            <option value="">{t("sheet.chooseItem")}</option>
            {items.map(i => <option key={i.id} value={i.id}>{tItem(i.id, i.name)}</option>)}
          </select>
        </div>
      )}
      {selectedItem && (
        <div style={{ background:"#edf2ec", borderRadius:12, padding:"8px 12px",
          fontSize:13, color:"#5c7a6e", fontWeight:600 }}>
          {t("sheet.settingGoalFor", { name: tItem(selectedItem.id, selectedItem.name) })}
        </div>
      )}
      <div>
        <label style={labelStyle}>{t("sheet.iWantToReach")}</label>
        <input style={inputStyle} type="number" min="0"
          value={form.targetAmount} onChange={set("targetAmount")}
          placeholder={t("sheet.targetAmountPlaceholder")} />
      </div>
      <div>
        <label style={labelStyle}>{t("sheet.byWhenOptional")}</label>
        <input style={inputStyle} type="date"
          value={form.targetDate} onChange={set("targetDate")} />
        <div style={{ fontSize:11, color:"#9aa59e", marginTop:4 }}>
          {t("sheet.addDeadlineHint")}
        </div>
      </div>
      <button
        onClick={() => (form.itemId || initial?.itemId) && onSubmit({
          ...form,
          itemId: form.itemId || initial?.itemId,
          targetDate: form.targetDate || null,
        })}
        style={{ width:"100%", height:50, borderRadius:16,
          background:"#78917f", color:"white",
          fontSize:15, fontWeight:600, border:"none", cursor:"pointer" }}>
        {t("sheet.saveGoal")}
      </button>
    </div>
  );
}

// ─── BackpackSheet ────────────────────────────────────────────────────────────
export default function BackpackSheet({
  open, onClose, mode, initial, items,
  onSave, currentBalance, hasTransactions,
}) {
  const { t, tItem } = useI18n();
  if (!open) return null;

  const titles = {
    update: { kicker: t("sheet.yourStash"),    title: t("sheet.updateTotal") },
    item:   { kicker: t("sheet.yourBackpack"), title: initial?.id ? t("sheet.editItemTitle") : t("sheet.addItemTitle") },
    goal:   { kicker: t("sheet.goalsKicker"),  title: t("sheet.setGoal") },
  };

  const { kicker, title } = titles[mode] || titles.update;

  const selectedItem = mode === "update" && initial?.itemId
    ? items.find(i => i.id === initial.itemId)
    : null;

  return (
    <>
      <style>{`
        @keyframes bpSheetIn { from{opacity:0.6;bottom:-100px} to{opacity:1;bottom:0} }
        .bp-sheet { animation: bpSheetIn 0.28s ease both; }
      `}</style>

      <div onClick={e => e.target === e.currentTarget && onClose()}
        style={{ position:"fixed", inset:0, zIndex:500,
          background:"rgba(36,49,44,0.45)",
          backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }} />

      <div className="bp-sheet" style={{
        position:"fixed", bottom:0, left:0, right:0,
        margin:"0 auto", width:"100%", maxWidth:480,
        maxHeight:"min(92vh, 92dvh)", overflowY:"auto",
        background:"#f6f1e8",
        borderRadius:"28px 28px 0 0",
        zIndex:501, WebkitOverflowScrolling:"touch",
      }}>
        {/* Sticky header — stays visible & tappable no matter how large the
            title text grows at big iOS Dynamic Type sizes, since it never
            scrolls out of view along with the rest of the sheet's content. */}
        <div style={{
          position:"sticky", top:0, zIndex:2,
          background:"#f6f1e8",
          padding:"16px 20px 12px",
        }}>
          <div style={{ width:48, height:6, background:"#d6ddd6",
            borderRadius:99, margin:"0 auto 16px" }} />
          <div style={{ display:"flex", alignItems:"flex-start",
            justifyContent:"space-between", gap:12 }}>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.2em", color:"#819286", marginBottom:4 }}>{kicker}</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:24,
                fontWeight:600, color:"#24312c", overflowWrap:"anywhere" }}>
                {selectedItem ? tItem(selectedItem.id, selectedItem.name) : title}
              </div>
            </div>
            <button onClick={onClose} aria-label={t("common.close")} style={{
              width:40, height:40, minWidth:40, minHeight:40, borderRadius:14,
              background:"white", border:"1px solid rgba(74,92,80,0.10)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#6f7a73" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ padding:"0 20px 56px" }}>
        {mode === "update" && selectedItem && (
          <UpdateTotalForm
            item={selectedItem}
            currentBalance={currentBalance ?? 0}
            isFirstEntry={!hasTransactions}
            onSubmit={data => { onSave(data); onClose(); }}
          />
        )}
        {mode === "item" && (
          <ItemForm initial={initial}
            onSubmit={data => { onSave(data); onClose(); }} />
        )}
        {mode === "goal" && (
          <GoalForm initial={initial} items={items}
            onSubmit={data => { onSave(data); onClose(); }} />
        )}
        </div>
      </div>
    </>
  );
}
