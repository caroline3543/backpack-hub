import { I18nProvider, useI18n } from "./i18n/I18nContext.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import BackpackScreen from "./features/backpack/BackpackScreen.jsx";

// This is a stripped-down, single-tab build — there's no login flow, so
// everything is stored locally under one fixed local user id.
const LOCAL_USER_ID = "local-user";

function AppShell() {
  const { t, dir } = useI18n();

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
      }}>
        <span style={{
          fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#24312c",
        }}>
          🎒 {t("app.title")}
        </span>
        <LanguageSwitcher />
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 40px" }}>
        <BackpackScreen userId={LOCAL_USER_ID} />
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
