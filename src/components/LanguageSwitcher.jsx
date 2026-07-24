// ─── LanguageSwitcher.jsx ─────────────────────────────────────────────────────
// Small pill-style dropdown for the supported languages. Each option shows
// a flag next to its name, and every name is written in its own language
// (not translated into whichever language is currently active) — so anyone
// can find their language by sight regardless of what's currently selected.

import { useI18n } from "../i18n/I18nContext.jsx";

export default function LanguageSwitcher() {
  const { language, setLanguage, options, t } = useI18n();

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.14em", color: "#819286",
      }}>
        {t("settings.language")}
      </span>
      <select
        value={language}
        onChange={e => setLanguage(e.target.value)}
        aria-label={t("settings.language")}
        style={{
          background: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(74,92,80,0.16)",
          borderRadius: 99,
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 600,
          color: "#24312c",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        {options.map(opt => (
          <option key={opt.code} value={opt.code}>{opt.flag} {opt.name}</option>
        ))}
      </select>
    </label>
  );
}
