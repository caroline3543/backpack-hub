import { useState } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nContext.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import BackpackScreen from "./features/backpack/BackpackScreen.jsx";
import SquadCalculatorScreen from "./features/squad/SquadCalculatorScreen.jsx";

// This is a stripped-down, single-tab build — there's no login flow, so
// everything is stored locally under one fixed local user id.
const LOCAL_USER_ID = "local-user";

function AppShell() {
  const { t, dir } = useI18n();
  const [tab, setTab] = useState("backpack"); // "backpack" | "squad"

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: "#f6f1e8",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid rgba(72,94,80,0.08)",
        flexWrap: "wrap", gap: 10,
      }}>
        <span style={{
          fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#24312c",
        }}>
          {tab === "backpack" ? `🎒 ${t("app.title")}` : "⚔️ Squad Calculator"}
        </span>
        <LanguageSwitcher />
      </header>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, padding: "12px 20px 0", maxWidth: 480, margin: "0 auto" }}>
        <button onClick={() => setTab("backpack")} style={{
          flex: 1, minHeight: 44, borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "backpack" ? "#78917f" : "rgba(255,255,255,0.7)",
          color: tab === "backpack" ? "white" : "#6f7a73",
          border: tab === "backpack" ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
          cursor: "pointer",
        }}>
          🎒 Backpack
        </button>
        <button onClick={() => setTab("squad")} style={{
          flex: 1, minHeight: 44, borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "squad" ? "#78917f" : "rgba(255,255,255,0.7)",
          color: tab === "squad" ? "white" : "#6f7a73",
          border: tab === "squad" ? "1px solid #78917f" : "1px solid rgba(72,94,80,0.14)",
          cursor: "pointer",
        }}>
          ⚔️ Squad Calculator
        </button>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 40px" }}>
        {tab === "backpack"
          ? <BackpackScreen userId={LOCAL_USER_ID} />
          : <SquadCalculatorScreen />}
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
