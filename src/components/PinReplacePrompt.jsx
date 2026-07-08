// ─── PinReplacePrompt.jsx ─────────────────────────────────────────────────────
// Shown when the user tries to pin a 4th resource while 3 are already pinned.
// Lets them pick which existing pin to swap out, or cancel.

import { useI18n } from "../i18n/I18nContext.jsx";

export default function PinReplacePrompt({ pendingItem, pinnedItemObjs, onReplace, onCancel }) {
  const { t, tItem } = useI18n();
  if (!pendingItem) return null;

  return (
    <>
      <div onClick={e => e.target === e.currentTarget && onCancel()}
        style={{ position:"fixed", inset:0, zIndex:600,
          background:"rgba(36,49,44,0.45)",
          backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:20 }}>
        <div style={{
          background:"#f6f1e8", borderRadius:22, padding:20,
          width:"100%", maxWidth:360, boxShadow:"0 12px 40px rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📌</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600,
            color:"#24312c", marginBottom:6 }}>
            {t("pinnedSection.maxReachedTitle")}
          </div>
          <div style={{ fontSize:13, color:"#6f7a73", lineHeight:1.5, marginBottom:16 }}>
            {t("pinnedSection.maxReachedBody", { name: tItem(pendingItem.id, pendingItem.name) })}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {pinnedItemObjs.map(item => (
              <button key={item.id} onClick={() => onReplace(item.id)} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                width:"100%", padding:"10px 14px", borderRadius:14,
                background:"white", border:"1px solid rgba(74,92,80,0.12)",
                cursor:"pointer", textAlign:"left", font:"inherit",
              }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#24312c" }}>
                  {tItem(item.id, item.name)}
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:"#a06358" }}>
                  {t("pinnedSection.replace")}
                </span>
              </button>
            ))}
          </div>

          <button onClick={onCancel} style={{
            width:"100%", height:42, borderRadius:14, border:"none",
            background:"rgba(72,94,80,0.08)", color:"#6f7a73",
            fontSize:13, fontWeight:600, cursor:"pointer",
          }}>
            {t("pinnedSection.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
