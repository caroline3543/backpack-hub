# Backpack Hub

A stripped-down, single-tab spin-off of Alliance Notice Hub: just the **Backpack**
feature (inventory tracking, goals, history, insights), with a language setting
for **Korean, Arabic, English, and Spanish**.

## What's different from the original app

- Only the Backpack tab exists — no Calendar, Library, or other screens/tabs.
- No Supabase / login — everything is stored locally in the browser
  (`localStorage`), scoped to a single local user. This keeps the repo
  dependency-free and easy to run standalone.
- A language switcher in the header lets you pick English, 한국어 (Korean),
  Español (Spanish), or العربية (Arabic). Arabic automatically switches the
  page to right-to-left layout.
- All Backpack UI text — section headers, buttons, empty states, item and
  category names, forms, toasts — is fully translated, not just a UI label.

## Getting started

```bash
npm install
npm start
```

Then open http://localhost:3000.

To build a production bundle:

```bash
npm run build
```

## Project structure

```
public/
  index.html
src/
  index.js                    # React entry point
  App.jsx                     # Root shell — header, language switcher, single Backpack tab
  i18n/
    I18nContext.jsx            # Language provider, t()/tItem()/tCategory()/tPriority() helpers
    locales/
      en.js                    # English
      ko.js                    # Korean (한국어)
      es.js                    # Spanish (Español)
      ar.js                    # Arabic (العربية) — includes RTL metadata
  components/
    LanguageSwitcher.jsx        # Header language dropdown
    Celebration.jsx             # Toast / celebration UI + useCelebration() hook
  utils/
    haptics.js                  # Thin wrapper over the Vibration API (no-op if unsupported)
  features/backpack/
    BackpackScreen.jsx          # Sections: Items · Goals · History · Insights
    BackpackSummary.jsx         # Hero stats + recent activity
    BackpackItems.jsx           # Category accordion, per-item stats & mini charts
    BackpackGoals.jsx           # Target tracking, pace, forecasts
    BackpackHistory.jsx         # Transaction log + snapshot comparison
    BackpackSheet.jsx           # Update total / add item / set goal forms
    useBackpackData.js          # Local-storage-backed data hook (items, transactions, etc.)
    backpackConstants.js        # Categories, predefined items, formatters
    backpackForecast.js         # Pure forecasting/pace math (no React)
```

## Adding a language

1. Copy `src/i18n/locales/en.js` to a new file, e.g. `fr.js`, and translate
   every string (keep the `{placeholder}` tokens as-is).
2. Set `meta.dir` to `"rtl"` if the language reads right-to-left, otherwise `"ltr"`.
3. Register it in `src/i18n/I18nContext.jsx`: import the file, add it to the
   `LOCALES` object, and add an entry to `LANGUAGE_OPTIONS`.

## Notes on data

Because storage is local-only, data doesn't sync across devices or browsers —
this is meant as a lightweight, standalone starting point. If you want to wire
this back up to Supabase (or another backend), the `useBackpackData.js` hook
is the only file that would need to change — its public API (`items`,
`transactions`, `balances`, `summary`, and all the CRUD methods) is designed
to be a drop-in match for the original Supabase-backed version.
