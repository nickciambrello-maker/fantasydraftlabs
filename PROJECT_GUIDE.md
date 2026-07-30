# Fantasy Draft Labs v1.5.3 — Stable-first Draft Room

Date: 2026-07-29  
Package: Complete source replacement

## Core mission

> A league-specific decision laboratory that learns how your league values players, predicts how its managers will behave, and tests the consequences of every major draft and keeper decision.

The v1.5.3 interface, deterministic recommendation logic, Draft Assistant instructions, rankings, simulations, keeper analysis, and Draft Room portfolio guidance all reinforce this mission. Generic market information remains an input, but league-specific value, room behavior, and tested consequences determine the final recommendation whenever reliable evidence exists.



## What changed in v1.5.0

- Fixed the silent mid-analysis cancellation that could leave the visible Draft Room frozen at a stale count such as `18/40` even though the internal run had already stopped.
- Candidate analysis now uses a stable draft/input fingerprint rather than repeatedly comparing the full mutable model payload after every trial.
- If draft inputs genuinely change during refinement, the Decision Center repaints and restarts automatically instead of leaving an orphaned loading panel.
- The first complete stress pass publishes a usable provisional recommendation. The remaining environments continue refining it without blocking the user from drafting.
- Live candidate analysis uses a browser-safe time budget and 12 season samples per stress path. If the full 40 paths would exceed the live-decision budget, the app finalizes the completed paths and directs deeper analysis to the Bulk Simulator.
- A later stress-path exception no longer discards valid completed evidence. Once every candidate has at least one paired path, the Decision Center preserves and labels the bounded result.
- The recommendation header distinguishes **Refining** from **Ready**, and bounded results explain exactly how many stress paths completed.
- Added regression coverage for a tight browser budget, a failure at trial 19, and the exact input-drift pattern that previously produced a permanent `18/40` screen.

## What changed in v1.4.8

- The Draft Room now distinguishes an actively running Bulk Simulator from a stale `running` flag.
- A stale simulator flag is recovered automatically so candidate outcome analysis can start.
- When a real bulk batch is active, the Draft Room shows a queued state and resumes automatically when the batch finishes.
- Interrupted candidate rollouts reset to a restartable state instead of remaining silently blocked.
- Fallback recommendations now include a visible retry action and a specific failure reason.


### Full advanced Draft Plan analysis restored

- Restores the missing `scoutingTopPositionForPick()` helper used by snipe-risk and Draft Plan Priority analysis.
- The helper blends exact-round history, round-band tendencies, and average positional timing without looking ahead.
- Completed simulation batches no longer fall into reduced advanced analysis because of the undefined helper.

### Calibration Center clarity

- The Calibration Center now appears after the Draft Plan and Strategy Comparison instead of leading the results screen.
- With no resolved live predictions, the center is collapsed and clearly explains how Live Draft Entry creates independent calibration evidence.
- Bulk simulations are explicitly excluded from calibration because the model cannot grade itself against its own simulated room.
- Multiple imported Sleeper seasons populate separate no-lookahead historical position-timing and market-timing metrics.
- Live calibration and historical backtesting remain visibly separated so users can distinguish real-time forecast quality from held-out historical evidence.

## What changed in v1.4.6

### Guaranteed post-run completion

- The Bulk Simulator now separates **draft execution**, **result analysis**, and **result rendering** into visible phases. A completed 25/25 batch no longer remains labeled as if drafts are still running.
- Final analysis yields control back to the browser before and after aggregation, so the interface can paint the “Analyzing completed drafts” and “Loading results” states instead of appearing frozen.
- Completed results render before local-storage persistence. A slow, full, or malformed browser storage record can no longer prevent the results dashboard from appearing.
- If an advanced Draft Plan calculation throws on unusual imported data, the app now loads a reduced but usable completed-run summary rather than leaving the simulator permanently stuck.
- Draft Plan Priority is bounded to the most relevant draftable player pool plus required flagged, keeper, drafted, and repeated-target players. This prevents very large multi-source ranking imports from creating an unbounded all-player finalization pass.
- Survival evidence, replacement value, position depth, and tier counts are indexed once for finalization rather than repeatedly scanning the full player pool for every player.
- Snipe-threat analysis is reserved for the top priority candidates, where it can affect decisions, instead of being recalculated for every deep ranking entry.

### Local-file background worker

- Season simulations now run in a Blob-backed background worker generated by `app.js`. This works when the app is opened directly from a local extracted folder as well as when it is hosted.
- The old `file:` protocol restriction that forced all season analysis onto the main browser thread has been removed.
- A main-thread emergency fallback remains available when a browser blocks workers, and it is covered by an exact 25-run regression test through rendered results.
- The progress summary reports the actual execution mode: background season worker, background worker available, or main-thread emergency fallback.

### Deployment clarity

- The deployable package still contains one executable application bundle (`app.js`) and one stylesheet (`styles.css`). No `app-v143.js`, `app-v144.js`, or compatibility app bundles are included.
- `simulation-worker.js` remains only as a standalone reference/validation implementation; the runtime no longer depends on loading it by relative URL.

The change specifically addresses the state shown at **25/25 and 100%** where all draft runs were complete but synchronous final aggregation never painted the results dashboard.

## What changed in this package

### Custom Rankings

- Weighted source rankings remain the primary anchor. Imported projections are used only when a source has adequate cross-position coverage, then contribute no more than 20% of that source's evidence.
- Every player separates **Lab conviction**, **general market cost**, and **league-market acquisition cost**.
- Players receive explainable classifications: Market agrees, Lab target, Expensive preference, Market trap, or Uncertain.
- League Behavior evidence modifies expected acquisition timing without changing intrinsic player quality.

### Simulator and Decision Branch Lab

- Candidate decisions use shared seeds so every player is tested against the same room paths.
- Every candidate is evaluated across baseline, market-heavy, aggressive-room, conservative-projection, and injury-stress environments.
- Results expose median performance, downside, sensitivity, robustness, and a combined decision score.
- The Calibration Center tracks resolved prediction accuracy and survival-probability error.
- Season simulation now incorporates bench/replacement quality, injury exposure, bye concentration, and same-offense correlation. The worker and main-thread fallback use matching assumptions.

### Keeper Decision Laboratory

- A configurable rules engine supports maximum keepers, round-cost models, annual escalation, keeper-year limits, undrafted-player costs, fixed-round costs, salary caps, and salary escalation.
- Multiple keepers per team are validated against actual owned picks and salary constraints.
- A bounded beam-search optimizer selects the strongest legal keeper set rather than ranking each player independently.
- The draft market is rebuilt after selected and likely keepers are removed.
- Keeper projections intentionally stop at the upcoming season and next season.
- Shared-seed keeper scenarios test complete draft and season consequences for alternative keeper sets.

### League Behavior Lab

- The signature competitive-edge addition is the **Opponent Reaction Matrix**.
- It models how each manager responds to position runs, open starter needs, falling values, and opportunities to move ahead of market.
- Reaction probabilities feed acquisition windows, survival estimates, snipe pressure, and simulations while manual Persona selections remain authoritative.

### Draft Portfolio Planning

- The Draft Room tracks player, strategy, opening-build, NFL-team, upside, and injury-risk exposure across saved and current drafts.
- Portfolio concentration affects recommendations only as a small tie-breaker when the underlying player decisions are close.
- Strong league-specific value always overrides diversification for its own sake.

The v1.2 source organization remains intact: the assistant endpoint stays consolidated, performance-sensitive browser modules stay separate, and maintenance assets remain preserved in `maintenance-resources.zip`.

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
    simulator_memory_harness.py
    simulator_fallback_harness.py
```

The live application loads the canonical `styles.css` and `app.js` files with the `v=153` cache key. There are no duplicate or version-suffixed application bundles in the package.

Core deployment files:

1. `index.html`
2. `styles.css`
3. `app.js`
4. `sleeper-model.js`
5. `sleeper-lab.js`
6. `simulation-worker.js` reference/validation implementation
7. `package.json`
8. `api/draft-assistant.js`
9. `data/historical-adp-data.js`
10. `PROJECT_GUIDE.md` as project documentation

The test files and maintenance archive do not participate in normal browser execution.

## Runtime dependency order

`index.html` intentionally loads scripts in this order:

1. `data/historical-adp-data.js`
2. `sleeper-model.js`
3. `app.js`
4. `sleeper-lab.js`

Do not change this order. `sleeper-lab.js` wraps and extends functions established by the model and core application.

`app.js` creates a Blob-backed season worker at runtime so the same background execution path works from both hosted URLs and locally opened extracted folders. `simulation-worker.js` is retained as a readable reference implementation and validation target, but the browser does not depend on a relative worker-file request.

## Internal value-breakout signal

The standalone Sleeper Lab workspace has been removed. The legacy filenames and bounded storage key remain in place for backward compatibility, but the user-facing product now describes qualified players as **ADP / tier breakout targets**.

`buildSleeperProfile(player, context)` remains the deterministic evidence engine in `sleeper-model.js`. A player receives a visible breakout signal only when all of the following are true:

- The player is outside the first round for the current league size.
- The player has either at least two full rounds of positive Lab-rank versus ADP value or a full market-tier-to-Lab-tier promotion.
- The profile clears the evidence and confidence guardrails rather than qualifying from late ADP alone.
- Kickers and team defenses are excluded.

The engine still evaluates price edge, opportunity path, talent signals, ceiling catalysts, league fit, room timing, risk, volatility, freshness, and missing-data coverage. Those components support Rankings, Draft Plan Priority, Draft Room recommendations, player detail, simulations, exports, post-draft grading, and Draft Assistant context. Non-qualified players do not receive a breakout badge, even though their internal evidence profile remains available to deterministic logic.

Position modules continue to use position-appropriate evidence:

- **QB:** rushing volume, designed runs, scramble rate, job security, passing volume, offense, scoring and superflex demand.
- **RB:** snap/carry/route/target shares, weighted opportunity, goal-line work, standalone and contingent roles, and blockers.
- **WR:** routes, target earning, YPRR, air yards, first reads, red-zone work, age/experience, competition and passing environment.
- **TE:** routes, targets, YPRR, slot use, blocking burden, red-zone use, competition and TE-premium scoring.

User selections retain frozen draft-time evidence snapshots for later grading and calibration.

## Draft Assistant

`api/draft-assistant.js` now contains the endpoint, instructions, tool contracts, allowlist, response schema, validation, security limits, and error handling in one module. This removes import-path complexity without changing the endpoint route or browser contract.

For backward compatibility, the browser-owned `get_sleeper_targets` tool supports `positions`, `minimumScore`, `minimumAdp`, `maximumAdp`, `targetType`, and `limit`. Supported target types remain `all`, `standalone`, `contingent`, `breakout`, `deep_stash`, `market_faller`, and `league_specific`.

The assistant cannot calculate or change breakout scores, rankings, Draft Plan Priority, Personas, behavior profiles, opponent probabilities, or draft state. A `draft_player` action remains only a click-required suggestion. No arbitrary model-generated JavaScript is executed.

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

Existing ranking and draft storage keys remain compatible. Simulator-derived state now uses `fantasyDraftLabSimulatorV5` with schema version 5 and engine `league-decision-lab-v2`; stale derived results are invalidated and recalculated. The internal value-breakout evidence layer continues to use the legacy bounded `fantasyDraftLabSleeperLabV1` key so existing browser data remains compatible. Existing ranking files remain importable even when none of the advanced optional fields are present.

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

`npm run test:browser` uses headless Chromium to validate real DOM startup, the merged League/Persona setup, per-team keeper tables, exact keeper-slot placement, the Draft Room assistant action, breakout guardrails, ranking imports, local storage migration, escaping, and mobile overflow. It writes `tests/browser-results.json` when run.

## Deployment

Deploy the complete directory. Vercel detects `api/draft-assistant.js` as the serverless endpoint and serves the static frontend files from the project root. Keep real API keys out of frontend files, local storage, ZIP archives, and source control.

## Risk notes

- **Very low risk:** Documentation consolidation, normalized filenames, and moving raw maintenance assets into an archive. None are read during normal runtime.
- **Low risk:** Consolidating Draft Assistant modules. The exported constants and validation functions remain in the same module scope and the browser endpoint path is unchanged.
- **Avoided medium/high risk:** Combining `app.js`, `sleeper-model.js`, `sleeper-lab.js`, `styles.css`, or `historical-adp-data.js`. The season worker executes in an isolated Blob worker while its standalone reference implementation remains separately testable.

## Version history




### v1.5.0 — Progressive Draft Room decisions — 2026-07-29

- Published provisional recommendations after the first complete stress pass.
- Added automatic restart on mid-analysis input changes and bounded completion for slow or failed later paths.
- Removed the stale loading-screen failure mode that could remain at `18/40`.

### v1.4.8 — Calibration clarity and full advanced analysis — 2026-07-29

- Restores `scoutingTopPositionForPick()` and removes the reduced-analysis warning.
- Moves calibration below Draft Plan and Strategy Comparison.
- Collapses the live-calibration panel until at least one prediction resolves.
- Adds held-out historical position and market timing metrics when multiple Sleeper seasons are imported.
- Explains why bulk simulations do not count as calibration evidence.

### v1.4.6 — Guaranteed simulator finalization — 2026-07-29

- Adds explicit simulating, analyzing, rendering, and idle phases.
- Moves final result rendering ahead of asynchronous persistence.
- Uses a Blob-backed worker even when the app is opened from a local folder.
- Preserves a tested main-thread emergency fallback.
- Bounds Draft Plan Priority to the relevant draftable pool and indexes survival, tier, position, and replacement evidence.
- Adds a reduced-results fallback so an advanced analysis exception cannot strand completed drafts behind the loading state.
- Adds an exact regression for the former 25/25 stall plus background-worker, 50-run single-strategy, Compare All, 450-run aggregation, and 4,000-extra-player finalization tests.
- Ships only canonical `app.js` and `styles.css` application assets.

### v1.4.3 — Authoritative ranking source removal — 2026-07-29

- Ranking source deletion is persisted and rendered before the ranking board rebuild runs.
- A malformed remaining source can no longer silently cancel a removal action.
- Remove buttons use canonical encoded source keys through one stable container-level handler.
- The button shows an immediate Removing status and reports any rebuild fallback.
- `index.html` loads uniquely named `app.js` and `styles.css` assets to prevent stale browser or hosting caches from serving the previous handler.

### v1.4.2 — Ranking controls and consensus guardrails — 2026-07-29

- Source sliders now recalculate from canonical active-source state on both drag and release.
- A zero-weight source contributes no ranks, ADP, projections, context, or source-only players.
- Remove buttons bind directly to the rendered source controls and purge active, persisted, and player-level evidence.
- Asset cache keys were bumped so deployed replacements cannot continue serving the prior JavaScript bundle.
- Projection/VOR evidence is coverage-gated, position-aware, and capped at 20% of each source's ranking evidence.
- League scoring and Draft Guide signals now make bounded movements around the weighted source consensus.
- One-QB guardrails prevent raw quarterback points from producing implausible overall ranks.

### v1.4.1 — Ranking source removal reliability — 2026-07-29

- Ranking source identities are canonicalized across capitalization, spacing, Unicode, workbook sheets, and older saved data.
- Removing a source now deletes every matching imported row, weight, filter option, and persisted record before rebuilding the custom board.
- The ranking engine ignores any imported row whose source is no longer active, preventing stale rows from continuing to influence ranks.
- Existing saved ranking rows without source metadata are recovered once during migration, while intentionally removed sources are not recreated.

### v1.4 — Keeper clarity and league setup consolidation — 2026-07-29

- Replaced the blended keeper editor with distinct team cards and compact per-team tables.
- Treats a manually entered keeper round as the exact current upcoming draft cost; next-season escalation is applied only to next-season analysis.
- Opens and scrolls to the Draft Assistant when “Ask about this pick” is selected.
- Removed the standalone Sleeper Lab workspace while preserving its deterministic value-breakout logic in rankings, recommendations, exports, simulations, and assistant context.
- Value-breakout qualification now requires either at least two rounds of ADP value or a full market-tier-to-Lab-tier promotion, and first-round players are explicitly excluded.
- Merged Team Personas into League Settings.

### v1.3 — League Decision Laboratory — 2026-07-29

Added projection-normalized VOR rankings, market-versus-conviction classifications, league-market acquisition estimates, paired decision branches, five stress environments, robustness scoring, simulator calibration, richer season modeling, a full keeper rules/set/scenario system limited to current and next-season value, the Opponent Reaction Matrix, Draft Portfolio Planning, and mission-aligned Draft Assistant guidance.

### v1.2 — Sleeper Lab — 2026-07-28

Added the deterministic Sleeper model, position modules, full Sleeper Profile contract, Sleeper Lab workspace, advanced import provenance, ADP snapshots, pick-time snapshots, assistant sleeper tooling, cross-application integrations, tests, and mobile/responsive safeguards. Replaced name-based or broad-keyword sleeper qualification and removed late-ADP-only qualification.

### v1.1 — Historical ADP baselines and simulation performance

Added normalized 2018–2025 historical ADP baselines, worker-backed season simulation over HTTP, improved historical source labeling, and workload-aware simulation samples.

### v1.0 — Grounded Draft Assistant and true snake board

Added the strict server-backed Draft Assistant tool loop with deterministic browser calculations and a true visual snake board while preserving chronological draft state.
