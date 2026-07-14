# Squad Calculator — Handoff

**Phase 1** (calc engine + manual entry + results), **Phase 2** (OCR import),
and **Phase 3** (column-aware troop screenshot parser rewrite) are complete
for Crazy Joe and Bear Trap.

## Phase 3: troop screenshot parser rewrite (root cause + fix)

A real screenshot run through the deployed app produced scrambled results —
Infantry showed Apex Lancer's + Supreme Marksman's values, Lancer showed a
corrupted number, Marksman showed only one of its two tiers. **Root cause:**
the old parser grouped OCR words into visual "lines" using vertical overlap
across the *entire image width*, mixing both columns' text into shared line
arrays. Real Tesseract output isn't pixel-synchronized between columns —
baselines drift a few pixels, stray tokens shift indices — so "look N lines
below the label" silently grabbed numbers from the *other column's* card
once that drift accumulated. This is exactly the flaw the improved spec
called out: line-index proximity isn't real spatial association.

**Fix:** the entire pipeline was rewritten as a proper module
(`src/features/squad/troopScreenshot/`) that splits OCR words into columns
*first*, then does line-grouping and label→number association independently
within each column — cross-column pairing is now structurally impossible,
not just unlikely. Two more real bugs were caught by testing against the
actual screenshot geometry during this rewrite (not just by inspection):

1. The initial column-split heuristic ("biggest gap between any two word
   centers") falsely triggered on ordinary single-column rows with wide
   multi-word labels (e.g. "Apex Infantry" creates a bigger gap to the
   number below it than within itself). Fixed by requiring the same split
   point to recur across ≥2 lines with ≥3 words each — a lone 2-word label
   has exactly one gap and nothing to compare it against, so it's never
   used as column evidence on its own.
2. The header stats (Total Troops / March Queue / Injured) sit side-by-side
   on one shared visual line, so the naive "take the first fraction found"
   approach had the identical bug at the header level — fixed the same way,
   by matching the nearest horizontally-aligned fraction to each label
   instead of just the first one encountered.

### Files created
- `troopScreenshot/types.js` — JSDoc typedefs (this app is plain JS, not TS — see below) + `TROOP_CLASSES`/`KNOWN_TIER_NAMES` config, kept separate from parsing logic.
- `troopScreenshot/parseGameNumber.js` — number parsing with confidence + `wasAbbreviated` tracking; also folds space-separated digit groups back to commas when safe.
- `troopScreenshot/parseTroopLabel.js` — fuzzy troop-class matching via edit distance (tolerates "rn"/"m", "l"/"I"/"1", "0"/"O" OCR substitutions) instead of a combinatorial regex-alternative list; refuses to guess when two classes are equally plausible.
- `troopScreenshot/associateTroopRows.js` — **the core fix**: `splitIntoColumns` (line-recurrence-based) + per-column line grouping + nearest-center label→number matching.
- `troopScreenshot/parseHeaderStats.js` — Total Troops / March Queue / Injured fractions (nearest-x matching) + selected-tab detection via pixel-color sampling.
- `troopScreenshot/validateTroopResult.js` — dedup (class + bounding-box overlap), missing-class detection (never assumes zero), abbreviation-aware total-match tolerance.
- `troopScreenshot/preprocessImage.js` — resize large images, minimum-size check, exposes a same-coordinate-space pixel sampler for tab detection.
- `troopScreenshot/providers/tesseractProvider.js` — the only file that knows Tesseract.js exists; lazy CDN load + `recognize()`.
- `troopScreenshot/index.js` — orchestrator; `buildResultFromWords` (pure, tested) + `TesseractTroopScreenshotParser.parse()` (real I/O wrapper).
- `troopScreenshot/__tests__/troopScreenshot.test.js` — 29 tests, including the exact regression fixture from the spec.

### Files modified
- `steps/TroopsStep.jsx` — rewritten review screen: every tier shown individually and editable per troop class, combined total computed automatically, "Add another tier"/remove-tier, simple-view toggle, screenshot summary card (extracted sum / displayed total / match / march queues / tab), "Discard screenshot and enter manually" (replacing the vague "Continue without it").
- `steps/MarchesStep.jsx` — accepts detected march-queue info; shows "X of Y" with an explicit "Use Y" button rather than silently overriding the user's march count.
- `SquadCalculatorScreen.jsx` — threads march-queue detection from Troops through to Marches.
- Deleted the old flat `ocrParser.js`/`ocrParser.test.js` (superseded by the `troopScreenshot/` module).

### Deviations from the spec (flagged, not silent)
- **Plain JavaScript, not TypeScript.** This app is Create React App with no TS toolchain; a full TS migration is a separate, much bigger project. JSDoc typedefs in `types.js` give equivalent editor support without one.
- **Region/debug-mode not implemented.** No visual debug overlay (bounding boxes, association lines, etc.) — `debug.detectedRegions` is always `[]`, and `debug.rawOcrBlocks` just holds the raw word list. Real region segmentation (header/tabs/panel/nav as distinct detected boxes) wasn't built; the pipeline works directly off word positions instead of first segmenting named regions.
- **No blur detection.** Only a minimum-dimension check in `preprocessImage.js` — true sharpness measurement (e.g. Laplacian variance) wasn't implemented.
- **Not every one of the 25 listed test scenarios has a dedicated test** — 29 tests cover the regression fixture plus the highest-value scenarios (tier count variations, missing data, column swapping, OCR substitutions, duplicates, march queue variants, tab detection, number formats). Narrower/wider phone sizes, scaled resolution, low-contrast images, and another game language aren't separately tested (the geometry-relative approach should generalize, but isn't explicitly verified for those).

### Regression fixture results
All exact spec values verified: Infantry 243,441 · Lancer 240,915 · Marksman 424,752 · sum 909,108 · displayedTroops current≈870,700/max≈909,100 · marchQueue 5/6 · injured 0/210,400 · `displayedTotalMatchesExtractedSum: true`. See "never cross-pairs a label with the other column's number" test, which explicitly asserts the old bug's exact wrong values (192541+43133, 146964+43133) never recur.

### Test results
70/70 passing (29 new `troopScreenshot` tests + 41 existing `squadCalculations` tests, unaffected by this change).

### Build results
`CI=true npm run build` compiles cleanly (one invalid `eslint-disable` rule reference was caught and fixed during this pass).

### Known limitations
- Still genuinely untested against **real** Tesseract output in a real browser — all tests replay hand-estimated word geometry from the screenshot. Real OCR noise (word mis-segmentation, extra punctuation) could still surface new issues.
- Region detection, blur rejection, and the dev debug view are not implemented (see deviations above).
- Tab-selection detection depends on pixel-color sampling at a guessed offset above each tab label; not verified against the real image's actual tab-pill styling.
- `minPerMarch` and other Phase-1 limitations are unchanged and still apply.

### Recommended next improvement
Run the actual upload flow in a real browser against this screenshot (and a
few others, ideally with different tier counts and the City/Wilderness
tabs) to see genuine Tesseract output — that's the one thing that can't be
verified from this sandbox, and it's now the single highest-value next step
given how much of the rest is calibrated and tested.

## Phase 4: real-world failure on a second screenshot, and the limits of guessing blind

A second real screenshot (different device, different troop numbers) produced
different scrambled results: Infantry showed "192" (a truncated fragment,
not the real 250,035), and the same value (53,633) appeared under *both*
Lancer and Marksman. Unlike Phase 3, I could not reproduce this with a
hand-modeled synthetic fixture, because I have no way to know the real
Tesseract word geometry for this specific image — Phase 3's fix was
verifiable because the bug was structural (column bleed); this one may be
partly genuine OCR misread (a truncated number Tesseract itself read wrong)
and partly association logic, and I can't tell which without real data.

**What I could fix with confidence:** the duplicate-value symptom (53,633
under two classes) has one clear, unconditional cause regardless of the
specific geometry — nothing stopped two different labels from independently
picking the *same* number as their closest match. Fixed by tracking claimed
value-words per column; once a number is used by one entry, it's excluded
from every other label's search in that column, forcing a fallback to the
next-nearest candidate instead of duplicating. Covered by a new test
(`troopScreenshot.test.js` → "two different labels never claim the same
number").

**What I could not fix blind:** the "192" instead of "192,541"-or-similar
symptom could be a genuine Tesseract misread (in which case the system
correctly flagged it low-confidence for manual correction — working as
designed) or a real association bug I can't see without the actual OCR
word list for that image.

**Added instead: a way to get real data next time.** The review screen now
has a "Copy diagnostic info" button (shown whenever there are warnings) that
copies the exact extracted entries — raw label, tier, class, count, raw OCR
text, per-field confidence, bounding box, column — as JSON to the clipboard.
If another mismatch shows up, paste that JSON directly rather than a
screenshot of the UI; it's the actual ground-truth data the parser saw, and
turns "guess from symptoms" into "look at the real numbers," which is what
made the Phase 3 fixes possible to verify at all.

## Phase 5: real ground-truth debugging — 5 of 6 rows now exactly correct

The "Copy diagnostic info" button did exactly what it was built for: pasted
real Tesseract word-level output (not hand-modeled geometry) made it
possible to pinpoint and fix the actual bugs, not just plausible-sounding
ones. Three real, confirmed root causes found by running this data through
the real pipeline (see `__tests__/real-screenshot-2.fixture.json` and
`.test.js`):

1. **Header/title/tab chrome text was corrupting column-split detection.**
   "Troops Preview" (the page title) and the "All / City / Wilderness" tab
   row each produced their own plausible-looking horizontal gap, and their
   false-positive votes outvoted the one genuine troop-panel candidate in
   the median calculation — landing the split point between "Apex" and
   "Infantry" (i.e., inside a single tier+class label). **Fix:** filter out
   every OCR word below confidence 70 before *any* processing. In every
   real screenshot examined so far, genuine content (labels, tiers, values,
   header stats) reads at 83-97 confidence; misread icon/badge glyphs read
   at 5-68, with zero overlap — so this one filter removes all the noise
   while never touching real content.
2. **A tier-badge digit ("4") was picked over the real 6-digit value**
   ("196,402") because it happened to sit slightly closer by horizontal
   center. Troop counts are never 1-2 digits in practice — the value
   matcher now prefers 3+-digit candidates whenever any exist, only
   falling back to short ones if that's genuinely all there is.
3. **A value with a stray leading `)`** (glued on from a misread icon
   outline: `")382,485"`) was rejected outright because number parsing
   required the string to *start* with a digit. Now strips stray
   leading/trailing punctuation before parsing.

Also fixed: two labels could independently claim the *same* number as their
nearest match (the exact 53,633-under-both-Lancer-and-Marksman bug) — now
tracked and excluded once claimed. And a cosmetic-but-real bug where
`normalise()`'s OCR-substitution logic (meant to catch "l" misread for "I")
was blindly mangling the legitimate lowercase "l" in "Lancer" itself,
knocking its own confidence down for no reason — fixed by comparing both
the raw and substituted forms and taking whichever gives the better match.

**Result on the real fixture:** Infantry and Marksman combined totals are
now *exactly* correct (250,035 and 432,277). The one remaining discrepancy
(Apex Lancer reads 92,541 instead of 192,541) is a genuine Tesseract
duplicate-detection artifact — it read the same glyphs twice with two
different, both-incomplete segmentations ("192," and "92,541", overlapping
bounding boxes) — and there's no way to reconstruct the true value from two
incomplete reads without re-examining the source image. The system now
does the honest thing: picks the more complete-looking read, flags it
`requiresReview: true` with association confidence well under 0.6, and
surfaces a specific warning — rather than either guessing silently or
crashing.

### Adopted from a follow-up spec proposing a full region-cropping rewrite

That proposal (crop the screenshot into 6 separate row images, OCR each
independently, use row position as a type signal) was **not** implemented —
given the single-pass pipeline now hits 5/6 exact on real data, a 6x-OCR-
call architecture with a new crop-boundary-detection problem to solve
wasn't justified. Adopted instead, layered onto the existing pipeline:
- `tier: null` (not a fake `"Unknown"` string) when no tier word was found,
  so the UI can honestly show "unconfirmed" rather than pretending
  detection happened. Each entry now also carries `tierConfidence` and a
  computed `requiresReview` boolean.
- Explicit `status: "verified" | "partial" | "failed"` on the top-level
  result.
- Tighter, spec-matched total-match tolerance: match if absolute difference
  ≤500 troops **or** percentage difference ≤0.1% (previously a looser
  combined formula).
- Explicit `result.header` object (`availableTroops`, `totalTroops`,
  `occupiedMarches`, `totalMarches`, `availableMarches`) alongside the
  existing `displayedTroops`/`marchQueue` shape, for callers that want
  unambiguous names rather than generic current/maximum pairs.

### Screenshot preview thumbnail enlarged

The review screen's preview was a 64×64 cropped square — essentially
unreadable, defeating the point of letting someone manually cross-check a
value against their own screenshot. It's now shown at full container width
(up to 340px tall, `objectFit: contain` so nothing is cropped), tappable to
open a full-screen view.

---


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
