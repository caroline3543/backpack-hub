# Squad Calculator — Handoff

**Phase 1** (calc engine + manual entry + results) and **Phase 2** (OCR
screenshot import) are both complete for Crazy Joe and Bear Trap.

## Files created

- `src/features/squad/squadCalculations.js` — pure calculation engine (no React/DOM/storage). Every function is unit-tested.
- `src/features/squad/squadCalculations.test.js` — 41 Jest tests, all passing. Run with `npx react-scripts test squadCalculations`.
- `src/features/squad/cyrilleConfig.js` — Cyrille skill values, with source + verification date.
- `src/features/squad/squadStyles.js` — shared style tokens reused across all step components.
- `src/features/squad/useSquadPresets.js` — localStorage-backed presets (event, march setup, ratios/strategy, buffs, Cyrille levels — never troop inventory).
- `src/features/squad/SquadCalculatorScreen.jsx` — step orchestrator + calculation assembly (`runCalculation`, `buildOrdinaryCapacities`).
- `src/features/squad/ocrParser.js` — `TesseractTroopParser` (the `TroopScreenshotParser` implementation): lazily loads Tesseract.js from a CDN, runs full-image OCR, then matches "Infantry"/"Lancer"/"Marksman" label words to the nearest number word on the same line using Tesseract's word-level bounding boxes and per-word confidence.
- `src/features/squad/steps/TroopsStep.jsx` — now a 4-state flow (`choose` → `uploading` → `review` → back to `manual`/edit), with image preview, per-field low-confidence flags, "Replace screenshot," and "Continue without it."
- `src/features/squad/steps/EventStep.jsx` — Crazy Joe / Bear Trap selection cards.
- `src/features/squad/steps/MarchesStep.jsx` — march count, capacity (same/per-march), capacity buffs (flat/%), Cyrille toggle + levels (Bear Trap only).
- `src/features/squad/steps/StrategyStep.jsx` — Crazy Joe method/ratio/priority + Include Marksmen; Bear Trap presets/ratio/exact amounts, allocation strategy, rally-leader march, bonus march.
- `src/features/squad/steps/ResultsStep.jsx` — summary card, per-formation cards, remaining inventory, copy-all/copy-one, save preset.

## Files modified

- `src/App.jsx` — added a simple two-tab switcher (Backpack / Squad Calculator) at the top level. This was the "you decide" placement call — a tab was the least invasive option given the existing single-screen shell.

## Calculation rules implemented

- **Parsing**: plain/comma/K/M/B → integer (`parseTroopNumber`).
- **Ratio math**: arbitrary parts (e.g. 1/9/20) → normalised shares (`normaliseRatio`); shares → whole-number allocation via largest-remainder (`allocateByLargestRemainder`) — verified to always conserve the total exactly.
- **Fair march distribution**: `waterFillCapacities` — binary-search water-filling, O(n log n) regardless of troop count magnitude, guarantees no march differs from another by more than 1 unit unless a capacity ceiling forces it, and never exceeds any march's own capacity.
- **Inventory-aware clamping**: `clampFormationToInventory` — shared by both Crazy Joe and Bear Trap; caps each troop type at what's actually owned and spills shortfall to other types in a given priority order.
- **Crazy Joe**: Case A (not enough space) and Case B (unused space) both implemented with the specified warning copy. "Even" mode depletes Infantry/Lancer in the same proportion they're owned (so a full deploy exactly matches inventory). Marksmen excluded by default; when included, they're folded in proportionally to how much of the total army they represent (see note below — this exact mechanic wasn't fully specified).
- **Bear Trap**: ratio and exact-amount methods; `equalSquads` (proportional scale-down across all slots) and `fillInOrder` (deplete sequentially) strategies; `prioritiseMarksmen` reorders the clamp priority. Rally-leader and bonus marches are separate slots with independent capacity/ratio. Rally-leader UI shows personal march size and total rally capacity as two clearly separate numbers, per the spec's strongest warning ("never use total rally capacity as personal march capacity").
- **Cyrille**: Ursa's Bane (personal capacity, +3,000/level, max 10) applies per march to every ordinary/rally/bonus march in Bear Trap only — never to Crazy Joe. Entrapment (+30,000/level, max 10) only affects the rally-leader slot's *total rally capacity* display, never added to ordinary marches.

## OCR approach implemented — now calibrated against a real screenshot

A real "Troops Preview" screenshot was supplied and used to calibrate the
matching logic directly (see `ocrParser.test.js`, which replays that
screenshot's exact word geometry as a synthetic test). Two things the real
screenshot revealed that the first pass got wrong, both now fixed and
tested:

1. **Troops are shown pre-split by tier** (e.g. "Apex Infantry" 196,477 +
   "Supreme Infantry" 46,964). The parser now sums across every tier card
   found for a troop type, and preserves each tier's own value in
   `inventory[type].tiers` (shown to the user under the field, calculations
   use the combined total).
2. **The count sits on the line below its label**, not beside it. The
   matcher now searches the next 1-2 lines down for the nearest
   horizontal-center match to the tier+label word group, before falling
   back to same-line-to-the-right for other possible layouts. The original
   "generous horizontal overlap" version of this had a real bug: with two
   columns of cards on the same row, a loose margin would match the *wrong
   column's* number. Fixed by matching on nearest center distance of the
   full label group instead — caught by the calibration test, not by
   inspection.

**Tesseract.js loaded lazily from a CDN**, browser-side, no server, only
fetched the first time someone clicks "Upload troop screenshot." The image
is never uploaded anywhere — it's a local `URL.createObjectURL` preview,
revoked on replace/unmount.

The core matching logic (`extractTroopsFromWords`) is a pure function
separated from the actual `Tesseract.recognize()` call, so it's fully
unit-tested (8 tests) without needing to mock an OCR engine or a browser.

**Still not verified — genuinely untested, not just "should work":**
- The synthetic test uses hand-estimated bounding boxes from the screenshot,
  not Tesseract's *actual* output on that image — I have no browser here to
  run Tesseract itself. Real OCR noise (mis-segmented words, extra/missing
  characters, icon glyphs misread as text) could still surface issues the
  synthetic test can't catch. Test with the real upload flow next.
- Layouts with 3+ tier cards, or a single-tier account, aren't in the
  calibration test yet — the logic should handle them (nothing assumes
  exactly 2 tiers), but isn't explicitly verified for those cases.
- Tier *names* other than "Apex"/"Supreme" (e.g. lower/earlier tiers) aren't
  tested, though the matching doesn't hardcode tier names — it just takes
  whatever word precedes the type word.

## Cyrille values and sources

See `cyrilleConfig.js` header comment. Verified 2026-07-11 against
`whiteoutsurvival.wiki/experts/cyrille/` (updated Apr 2026) plus corroborating
guides: both skills are flat additions (not %), both run 10 levels, and the
quoted ranges (3,000→30,000 and 30,000→300,000) match the per-level step
sizes used in code exactly. **Not verified**: whether the bonus applies
automatically without further action, and whether a *saved preset* correctly
reflects the bonus before Bear Hunt actually starts (this app doesn't talk to
the game, so that's inherently unverifiable from here — flag if it ever
looks wrong in-game).

## Assumptions made (flagged explicitly, not silently)

1. **Marksmen-included Crazy Joe ratio**: the spec doesn't define how Marksmen factor into the Infantry:Lancer ratio once "Include Marksmen" is on. Implemented as: Marksmen take a share proportional to their fraction of the total (I+L+M) army; the remaining share splits between Infantry/Lancer per the chosen method. Revisit if this doesn't match player expectations.
2. **`minPerMarch` (Crazy Joe optional minimum)**: implemented as a best-effort post-hoc adjustment (borrow from the other type within the same march), not a full constraint solver. It isn't in the spec's required test list, so it wasn't hardened further. Simultaneous, conflicting minimums across many marches aren't guaranteed optimal.
3. **Percentage capacity buffs**: computed against each march's own base capacity independently, never compounded with other bonuses or with each other. This was flagged in the spec as unconfirmed either way — documented here so it's easy to flip if real game data says otherwise.
4. **Rally-leader/bonus march Cyrille bonus**: Ursa's Bane is added to the rally-leader and bonus march capacities too (in addition to ordinary marches), since it's described as a general personal-deployment-capacity bonus, not ordinary-march-specific.

## Test coverage

41 tests in `squadCalculations.test.js`, covering every numbered scenario in
the spec's testing section except property-based/fuzz testing (not set up —
would need `fast-check` or similar, which isn't installed and couldn't be
added without network access). All pass. Run: `npx react-scripts test squadCalculations --watchAll=false`.

## Commands run

- `npx react-scripts test --watchAll=false` — 41/41 pass.
- `CI=true npm run build` — compiles cleanly (CI mode surfaces ESLint issues as hard errors; two were caught and fixed during this session — an invalid `eslint-disable` rule reference, and the percentage-bonus-against-dummy-base bug described above).

## Remaining limitations

- **OCR is calibrated but not run through real Tesseract output yet** — the test replays hand-estimated geometry from the screenshot, not an actual OCR pass (see above).
- **No dark mode** — the host app doesn't have one, so this doesn't either.
- **English only** — see i18n note above; infrastructure exists, just not wired up for this feature yet.
- **`minPerMarch` and multi-constraint edge cases** aren't a full solver (see Assumption 2).
- **No accessibility pass yet** beyond the base app's existing conventions.
- Rally-leader/bonus-march Cyrille interaction (Assumption 4) hasn't been cross-checked against a real in-game screenshot.

## Recommended next improvement

Actually run the upload flow with a real screenshot in a real browser and see
what Tesseract's genuine output looks like — the geometry-matching logic is
now well-calibrated against the *layout*, but real OCR text noise (misreads,
extra punctuation, split/merged words) is the remaining unknown.
