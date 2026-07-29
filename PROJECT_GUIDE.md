# Fantasy Draft Labs v1.2.3 — Project Guide

Date: 2026-07-28  
Package: Browser-safe bulk simulator update

## What changed in this package

This package keeps the organized v1.2 deployment structure and adds targeted Bulk Simulator performance safeguards. Rankings, opponent pick scoring, roster grading, Draft Plan formulas, storage keys, ranking imports, Sleeper Lab scoring, League Behavior Lab authority, and the Draft Assistant safety model remain unchanged.

The existing consolidation remains intentionally limited to low-risk areas:

- The three Draft Assistant support modules are now contained inside `api/draft-assistant.js`.
- Six overlapping Markdown documents are replaced by this single guide.
- The two Node test files are combined into `tests/validate.mjs`.
- Browser-test CSV fixtures are embedded inside `tests/browser_harness.py`.
- Raw data-maintenance files and import templates are preserved in `maintenance-resources.zip`.
- Upload-generated filename suffixes such as `(7)` and `(8)` have been removed.

The performance-sensitive browser files remain separate so caching, worker execution, script order, and maintainability are preserved.

## Deployment structure

```text
/
  index.html
  styles.css
  app.js
  sleeper-model.js
  sleeper-lab.js
  simulation-worker.js
  package.json
  PROJECT_GUIDE.md
  maintenance-resources.zip
  api/
    draft-assistant.js
  data/
    historical-adp-data.js
  tests/
    validate.mjs
    browser_harness.py
```

Only the following ten files are part of the live application or deployment configuration:

1. `index.html`
2. `styles.css`
3. `app.js`
4. `sleeper-model.js`
5. `sleeper-lab.js`
6. `simulation-worker.js`
7. `package.json`
8. `api/draft-assistant.js`
9. `data/historical-adp-data.js`
10. `PROJECT_GUIDE.md` as project documentation

The test files and maintenance archive do not participate in normal browser execution.


## Bulk simulator confidence and performance update

Version 1.2.3 increases simulation confidence while retaining the compact storage and non-blocking finalization architecture introduced in versions 1.2.1 and 1.2.2. Rankings, opponent pick scoring, roster grading, and Draft Plan formulas are unchanged.

- Compare presets are now Quick 10, Standard 25, and Deep 50 runs per strategy, scheduling 90, 225, or 450 completed drafts across all nine strategies.
- Device-aware limits allow 25 runs per strategy on constrained environments, 50 on standard devices, and up to 80 on high-capacity devices. Single-strategy batches support up to 500 runs where the device profile permits it.
- The simulator processes one completed draft per browser batch and yields to rendering between drafts so progress and cancellation remain responsive.
- Each run stores a compact pick trace instead of 192 expanded pick/player objects. Replay and exports reconstruct the same pick records only when needed.
- User-roster, availability, and pick-alternative records retain only fields required by the simulator analysis and UI.
- Secondary season-outcome sampling remains bounded at 4 samples per Quick draft, 6–8 per Standard draft, and 10–12 per Deep draft. Confidence is increased primarily through more independent complete drafts, avoiding a multiplicative slowdown in the no-worker fallback. A worker that fails or exceeds four seconds is disabled for the session so later runs use immediate deterministic fallback instead of waiting repeatedly.
- Opening the app with `file://` still cannot use the worker because of browser security rules. Compact storage and staged rendering still apply, but running through `npm run dev`, Vercel, or another HTTP server remains recommended for high-confidence batches.

## Runtime dependency order

`index.html` intentionally loads scripts in this order:

1. `data/historical-adp-data.js`
2. `sleeper-model.js`
3. `app.js`
4. `sleeper-lab.js`

Do not change this order. `sleeper-lab.js` wraps and extends functions established by the model and core application.

`app.js` creates `simulation-worker.js` when worker-backed season simulation is available. Keep the worker as a separate file; inlining it would add browser-security and main-thread performance risk.

## Core Sleeper Score

`buildSleeperProfile(player, context)` lives in `sleeper-model.js` and uses these weights:

- 25% Price Edge
- 25% Opportunity Path
- 20% Talent Signal
- 15% Ceiling Catalyst
- 10% League and Roster Fit
- 5% Room Timing

Risk, volatility, confidence, data freshness, and missing-data coverage remain separate from Sleeper Score. A late ADP alone does not qualify a player. Sparse inputs retain neutral priors rather than being reweighted to an artificial 100.

Position modules use position-appropriate evidence:

- **QB:** rushing volume, designed runs, scramble rate, job security, passing volume, offense, scoring and superflex demand.
- **RB:** snap/carry/route/target shares, weighted opportunity, goal-line work, standalone and contingent roles, and blockers.
- **WR:** routes, target earning, YPRR, air yards, first reads, red-zone work, age/experience, competition and passing environment.
- **TE:** routes, targets, YPRR, slot use, blocking burden, red-zone use, competition and TE-premium scoring.

Every Sleeper Profile includes component scores, confidence, current and ceiling roles, standalone and contingent value, catalyst, blocker, failure reasons, evidence, archetype, acquisition window, survival outlook, room threats, missing data, freshness, and role provenance.

## Sleeper Lab workspace and integrations

Sleeper Lab includes the board, player detail, archetype and position filters, ADP and score filters, confidence and freshness filters, watch list, portfolio builder, draft-window planner, market movers, model explanation, and a future-facing calibration panel.

Sleeper data remains integrated with Rankings, Draft Plan Priority, Draft Room, Player Details, Decision Center, candidate simulation, bulk exports, post-draft grading, flags, watch lists, compact assistant context, and local deterministic fallback.

The Draft Plan sleeper boost remains capped at six points and is disabled under severe roster redundancy. User selections retain frozen draft-time Sleeper Score snapshots for later grading and calibration.

## Draft Assistant

`api/draft-assistant.js` now contains the endpoint, instructions, tool contracts, allowlist, response schema, validation, security limits, and error handling in one module. This removes import-path complexity without changing the endpoint route or browser contract.

The browser-owned `get_sleeper_targets` tool supports `positions`, `minimumScore`, `minimumAdp`, `maximumAdp`, `targetType`, and `limit`. Supported target types remain `all`, `standalone`, `contingent`, `breakout`, `deep_stash`, `market_faller`, and `league_specific`.

The assistant cannot calculate or change Sleeper Scores, rankings, Draft Plan Priority, Personas, behavior profiles, opponent probabilities, or draft state. A `draft_player` action remains only a click-required suggestion. No arbitrary model-generated JavaScript is executed.

Set `OPENAI_API_KEY` as a server-side environment variable when LLM mode is desired. The deterministic application and local assistant fallback continue to work without it.

## League Behavior Lab authority

Manager forecasting retains this authority order:

```text
Manual Persona selection
>
League Behavior Lab inference
>
Default room mix
```

The assistant may explain approved room-pressure and survival evidence, but cannot override manual Personas or recalibrate manager behavior. Current application context overrides older conversation assumptions after the board changes.

## Historical ADP coverage

Bundled historical coverage is 2018–2025. Historical references are labeled as one of:

1. **Pick-time** — imported historical pick metadata contained ADP.
2. **Season baseline** — a player matched the bundled baseline for that season.
3. **Current directional** — current ADP is used only as directional evidence when no historical match exists.
4. **Unavailable** — no reliable market reference matched.

The bundled 2018–2024 data uses an uploaded 12-team Half-PPR mock-draft baseline. The 2025 data uses a FantasyPros consensus ADP source whose exact scoring and league-size format is unspecified. Historical tiers are derived from same-season ADP gaps and do not use current projections.

## Storage and compatibility

Existing ranking and draft storage keys remain unchanged. Sleeper Lab uses the separate bounded `fantasyDraftLabSleeperLabV1` key. Existing ranking files remain importable even when none of the advanced optional fields are present.

ADP snapshots are bounded to 5,000 records and season outcome imports to 2,000 rows. Dynamic profiles refresh when the pick, roster, league, or imported data changes. Existing stored ranking rows without new fields load with appropriately lower confidence rather than being removed.

## Maintenance resources

`maintenance-resources.zip` preserves files that are useful for updating or auditing the project but are not used by the live app:

```text
maintenance-resources/
  README-MAINTENANCE.md
  templates/
    ranking-import-template.csv
    sleeper-adp-update-template.csv
  data-sources/
    bundled-sleeper-adp-baseline.csv
    historical-adp-master.csv
```

Extract that archive only when updating ranking templates or rebuilding/auditing historical ADP data. Do not replace `data/historical-adp-data.js` with a raw CSV; the JavaScript file is the browser-ready runtime dataset.

## Local development and validation

Install Node.js 20 or newer, then run:

```bash
npm install
npm run check
npm run test:browser
npm run dev
```

`npm run check` performs syntax validation plus deterministic model, source-contract, assistant-safety, UI-contract, and integration assertions.

`npm run test:browser` uses headless Chromium to validate real DOM startup, Sleeper Lab rendering, ranking imports, local storage migration, escaping, deterministic assistant tools, immutable pick-time snapshots, compact Bulk Simulator runs and export reconstruction, and mobile overflow. It writes `tests/browser-results.json` when run.

## Deployment

Deploy the complete directory. Vercel detects `api/draft-assistant.js` as the serverless endpoint and serves the static frontend files from the project root. Keep real API keys out of frontend files, local storage, ZIP archives, and source control.

## Risk notes

- **Very low risk:** Documentation consolidation, normalized filenames, and moving raw maintenance assets into an archive. None are read during normal runtime.
- **Low risk:** Consolidating Draft Assistant modules. The exported constants and validation functions remain in the same module scope and the browser endpoint path is unchanged.
- **Low-to-moderate risk:** Bulk Simulator scheduling and retention changed, but deterministic draft scoring and Draft Plan calculations were not rewritten. Browser tests verify state restoration, complete 192-pick reconstruction, compact storage, export compatibility, and bounded worker failover.
- **Avoided medium/high risk:** Combining `app.js`, `sleeper-model.js`, `sleeper-lab.js`, `styles.css`, `historical-adp-data.js`, or `simulation-worker.js`. Those files remain separate to preserve loading order, caching, worker isolation, and safer future maintenance.

## Version history

### v1.2.3 — High-confidence simulator presets — 2026-07-28

Raised Compare presets to 90/225/450 completed drafts, expanded device-aware custom limits, and migrated untouched v1.2.2 preset selections automatically while preserving bounded per-draft season sampling, compact run storage, and staged Draft Plan rendering.

### v1.2.2 — Non-blocking Draft Plan finalization — 2026-07-28

- Draft Plan finalization now runs in visible, browser-yielding stages after simulations complete.
- Survival aggregation and full-player Draft Plan Priority calculations yield between small batches.
- Priority lookups use indexed survival evidence and a pre-sorted replacement pool instead of repeated full-array scans.
- A malformed player record or unavailable deep-analysis component falls back locally instead of leaving the simulator stuck at 100%.
- The completed plan is rendered before persistence and the full workspace refresh.
- Progress text distinguishes simulation work from strategy comparison, survival, priority, and round-plan generation.

### v1.2.1 — Browser-safe bulk simulator — 2026-07-28

Reduced Compare workloads to 27/54/90 drafts, added device-aware caps, yielded between individual drafts, compacted pick and player retention, reconstructed replay/export picks on demand, reduced season samples, and replaced repeated 20-second worker waits with a one-time four-second failover.

### v1.2 — Sleeper Lab — 2026-07-28

Added the deterministic Sleeper model, position modules, full Sleeper Profile contract, Sleeper Lab workspace, advanced import provenance, ADP snapshots, pick-time snapshots, assistant sleeper tooling, cross-application integrations, tests, and mobile/responsive safeguards. Replaced name-based or broad-keyword sleeper qualification and removed late-ADP-only qualification.

### v1.1 — Historical ADP baselines and simulation performance

Added normalized 2018–2025 historical ADP baselines, worker-backed season simulation over HTTP, improved historical source labeling, and workload-aware simulation samples.

### v1.0 — Grounded Draft Assistant and true snake board

Added the strict server-backed Draft Assistant tool loop with deterministic browser calculations and a true visual snake board while preserving chronological draft state.
