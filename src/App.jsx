import { useState } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nContext.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import BackpackScreen from "./features/backpack/BackpackScreen.jsx";
import BackpackSwitcher, {
  loadProfiles, loadActiveId, saveProfiles, saveActiveId,
} from "./features/backpack/BackpackSwitcher.jsx";

function AppShell() {
  const { t, dir } = useI18n();

  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeId, setActiveId] = useState(() => loadActiveId(loadProfiles()));

  const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];
  const accent = activeProfile.color;

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

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: "#f6f1e8",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        "--bp-accent": accent,
      }}
    >
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid rgba(72,94,80,0.08)",
      }}>
        <span style={{
          fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#24312c",
        }}>
          🎒 {t("app.title")}
        </span>
        <LanguageSwitcher />
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
