# Fantasy Draft Labs v1.7.1 — Clean Working Source

This is the canonical, condensed working copy of Fantasy Draft Labs. Use this folder as the root of the GitHub repository and the Vercel project. Do not add downloaded duplicates such as `app(13).js` or old release ZIPs.

## Start and validate

```bash
npm install
npm run dev
npm run check
npm test
```

The Draft Assistant requires `OPENAI_API_KEY` as a server-side Vercel environment variable. The rest of the app runs in the browser.

## File map

| File | Purpose | Update when |
| --- | --- | --- |
| `index.html` | App shell and asset loading | Every numbered release or when page structure changes |
| `styles.css` | All visual styling | Layout or design changes |
| `app.js` | Main application state, tools, and rendering | Most feature or behavior changes |
| `league-intelligence.js` | Sleeper history and League Behavior Lab | League imports, evidence, or manager analysis changes |
| `sleeper-model.js` | Sleeper player/value model | Model logic changes |
| `sleeper-lab.js` | Sleeper Lab integration and UI | Sleeper Lab behavior changes |
| `data/historical-adp-data.js` | Bundled historical ADP | Historical data changes |
| `api/draft-assistant.js` | Server-side Draft Assistant endpoint | Assistant behavior or API changes |
| `package.json` | Version, commands, and dependencies | Every numbered release or dependency change |
| `package-lock.json` | Exact dependency versions | Generated automatically by `npm install` |
| `tests/draft-room-recommendation.test.mjs` | Draft Room recommendation regression checks | Recommendation layout or fallback behavior changes |
| `tests/simulation-performance-lineup.test.mjs` | Simulation-equivalence and lineup-placement regression checks | Simulation engine or lineup evaluation changes |

## v1.7.1 performance and lineup fix

Bulk and Draft Room simulations now reuse immutable draft-order, roster, scouting, scoring, and pick-window calculations inside each run. Standard batches also enrich independent season outcomes concurrently without reducing trials or samples. Live rosters, bulk grades, and saved-draft analysis now share one projection-aware lineup optimizer, and completed drafts retain the projection snapshot used when each pick was made.

## v1.7.0 recommendation update

The Draft Room now presents one direct decision, three short reasons, a next-pick outlook, the main risk, and a concrete pivot condition. Detailed rankings, room evidence, simulation metrics, and alternative cards remain available under **View full evidence**. The same layout stays usable while advanced comparisons run or fail.

## Release rule

For every numbered release, update the version in `package.json`, `APP_VERSION` in `app.js`, and the `?v=` cache keys in `index.html`. Only update the other files when their subsystem actually changes.

This clean package intentionally excludes old ZIPs, maintenance CSVs, extensive documentation, Python/browser harnesses, generated validation reports, and the unused standalone worker reference. Keep any needed archival or maintenance material outside the live project.
