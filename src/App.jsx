import { useState } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nContext.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import BackpackScreen from "./features/backpack/BackpackScreen.jsx";
import BackpackSwitcher, {
  loadProfiles, loadActiveId, saveProfiles, saveActiveId,
} from "./features/backpack/BackpackSwitcher.jsx";

const DARK_MODE_KEY = "backpack-hub-dark-mode-v1";

function loadDarkMode() {
  try { return localStorage.getItem(DARK_MODE_KEY) === "1"; } catch { return false; }
}
function saveDarkMode(on) {
  try { localStorage.setItem(DARK_MODE_KEY, on ? "1" : "0"); } catch {}
}

// Light/dark values for every shared color token used across the app.
// Components reference these via var(--bp-x, <light-value>) so they still
// render correctly even before this loads, and fall back gracefully.
const THEME = {
  light: {
    "--bp-bg":         "#f6f1e8",
    "--bp-text":       "#24312c",
    "--bp-muted":      "#9aa59e",
    "--bp-muted2":     "#6f7a73",
    "--bp-card":       "rgba(255,255,255,0.82)",
    "--bp-card-soft":  "rgba(255,255,255,0.7)",
    "--bp-border":     "rgba(74,92,80,0.09)",
    "--bp-border2":    "rgba(72,94,80,0.14)",
    "--bp-border3":    "rgba(72,94,80,0.10)",
  },
  dark: {
    "--bp-bg":         "#1a1f1c",
    "--bp-text":       "#eef1ee",
    "--bp-muted":      "#8a9690",
    "--bp-muted2":     "#a3ada7",
    "--bp-card":       "rgba(255,255,255,0.06)",
    "--bp-card-soft":  "rgba(255,255,255,0.045)",
    "--bp-border":     "rgba(255,255,255,0.08)",
    "--bp-border2":    "rgba(255,255,255,0.12)",
    "--bp-border3":    "rgba(255,255,255,0.10)",
  },
};

function DarkModeToggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="Toggle night mode" style={{
      width:38, height:38, borderRadius:12, flexShrink:0,
      background:"var(--bp-card, rgba(255,255,255,0.7))",
      border:"1px solid var(--bp-border2, rgba(72,94,80,0.14))",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer", marginRight:8,
    }}>
      {on ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--bp-text, #24312c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
          <line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/>
          <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
          <line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--bp-text, #24312c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function AppShell() {
  const { t, dir } = useI18n();

  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeId, setActiveId] = useState(() => loadActiveId(loadProfiles()));
  const [darkMode, setDarkMode] = useState(loadDarkMode);

  const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];
  const accent = activeProfile.color;
  const themeVars = darkMode ? THEME.dark : THEME.light;

  const handleSwitch = (id) => {
    setActiveId(id);
    saveActiveId(id);
  };

  const handleCreate = ({ name, color }) => {
    const id = `backpack-${Date.now()}`;
    const next = [...profiles, { id, name, color }];
    setProfiles(next);
    saveProfiles(next);
    handleSwitch(id);
  };

  const handleUpdate = (id, { name, color }) => {
    const next = profiles.map(p => p.id === id ? { ...p, name, color } : p);
    setProfiles(next);
    saveProfiles(next);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      saveDarkMode(!prev);
      return !prev;
    });
  };

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: "var(--bp-bg, #f6f1e8)",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        "--bp-accent": accent,
        ...themeVars,
      }}
    >
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid var(--bp-border3, rgba(72,94,80,0.10))",
      }}>
        <span style={{
          fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "var(--bp-text, #24312c)",
        }}>
          🎒 {t("app.title")}
        </span>
        <div style={{ display:"flex", alignItems:"center" }}>
          <DarkModeToggle on={darkMode} onToggle={toggleDarkMode} />
          <LanguageSwitcher />
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "12px 20px 40px" }}>
        <BackpackSwitcher
          profiles={profiles}
          activeId={activeId}
          onSwitch={handleSwitch}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
        <BackpackScreen key={activeId} userId={activeId} accent={accent} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
