# Fantasy Draft Lab

Personal fantasy football mock draft simulator with configurable league settings.

## Run locally

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173
```

## Current MVP

- Configurable team count, scoring, roster slots, rounds, keeper note, and team names
- Multiple saved league profiles with a selector for switching between leagues
- Per-league "My team" selection so your controlled team is saved instead of defaulting to Team 6
- Live draft entry mode for manually recording every real pick while keeping recommendations, rosters, analysis, archive, and assistant tools active
- League settings panel that updates recommendations, projections, draft board size, and analysis
- Optional league setting to ensure every required starter slot is drafted, including K and DEF
- Keeper pick editor for every team, with player plus round selection
- Custom round-by-round pick ownership
- Per-round pick owner editor for traded picks, saved as the default order for future mocks
- Draft pick trade calculator with league-aware pick values, team-specific draft-capital impact, and optional keeper-player surplus
- Sleeper league import in the League tab for league settings, roster-aligned team names, user-team matching, traded pick order, and keeper-option context
- Bulk draft simulator capped at 100 runs with strategy comparison, controlled variation, and first-five-round build optimization
- Multiple picks for one team in a round and zero-pick rounds for another team
- Half-PPR roster defaults from the league profile
- Persona-based auto-drafting for the other 11 teams
- Roster-realistic simulated teams with controlled draft-to-draft variation
- Auto-pick recommendations use roster-fit penalties to avoid unnecessary extra QB, TE, K, and DEF picks
- Configurable draft personas for each team, with a balanced default room mix
- Strategy selector for Balanced, Hero RB, Zero RB, Robust RB, and Elite QB/TE builds
- Source-aware ranking database with CSV/JSON import
- Ranking source controls to remove uploaded sources or disable/restore the built-in seed
- Derived player summaries and depth-chart role notes on player cards
- Consensus ranking rebuild after importing paid-source exports
- Current-pick tier recommendations using consensus rank, strategy, team needs, picks left, next-pick gap, positional dropoff, and keeper value
- Next-pick forecast showing the top projected options likely to be available at your following pick
- Draft-room assistant chat for live pick questions, roster needs, and next-three-pick position planning
- Pause at your pick with best pick, fallback picks, and updated tiers
- Draft-room roster view with every starter slot and bench slot shown on its own line
- Draft-room room roster view for checking every team's starters, bench, and remaining starter needs
- Wider draft-room player big board with rank, ADP, projected points, source count, role context, and fit labels
- Completed draft archive with notes, read-only board review, and a save-and-new-draft flow
- Post-draft team grading with projected starter averages, strengths, weaknesses, playoff odds, and room comparison
- Full roster view in draft analysis showing starters, bench, positions, and projected average points per game
- Draft board, available player pool, filters, search, and roster summary
- Tabbed workspace navigation so Draft Room stays front-and-center during simulations

## Ranking imports

Use `ranking-import-template.csv` as the easiest format.

Accepted columns include:

- `source`
- `rank`
- `name` or `player`
- `position` or `pos`
- `team`
- `adp`
- `tier`
- `keeper_value`
- `projection` or `points`
- `summary`
- `depth_chart_role`
- `depth_chart_rank`
- `competition`
- `injury_note`
- `team_context`
- `upside_note`
- `risk_note`

The app blends active sources into a consensus board. Uploaded rankings are saved in the browser that imported them. Use the Ranking Sources controls to remove an uploaded source or disable the built-in public seed if it is distorting the board. When the seed is disabled, the app uses only uploaded ranking rows; the Rankings tab shows active player count and uploaded row count so you can confirm the board is not still using the seed.

Player cards show both `AI Analysis` and `Source Summary`. The `Source Summary` comes directly from uploaded rankings/context files when you include a `summary`, `player_summary`, or `notes` column. If those columns are not present, the source summary box will say that no uploaded summary exists yet. The `AI Analysis` remains the app's derived role/context note based on rank, team, position, and depth-chart fields.

## League settings, keepers, and traded picks

Use the League tab to edit format settings, team names, and keeper picks. A keeper needs both a player and a round. Once selected, that player appears as a locked keeper pick in the first draft slot that team owns in that round and is removed from the available player pool.

League settings can be saved as separate profiles, so different leagues can keep their own format, team names, keepers, personas, and traded-pick order. Type a league name, use `Save settings` to update the selected league, or `Save as new` to create another saved league. The League tab also shows saved league cards with `Use` buttons so you can toggle back to a previous league. When league settings are saved or selected, the app asks whether to restart the current mock with those settings or keep drafting with the board already in progress.

Use the Pick Order tab to assign every draft slot by round. Changes save automatically, and the `Save order` button can be used as a manual confirmation. The saved traded-pick board carries into new mocks until you change it or reset to snake.

Use the Sleeper connector in the League tab to find a Sleeper league by username or user ID and season. Importing updates league settings, assigns team names from the imported Sleeper rosters, matches the user's Sleeper account to `My team`, applies Sleeper traded-pick records to the Pick Order tab, and saves last season's rostered players plus draft rounds as keeper-option context.

If the selected league season is a new/pre-draft league with empty rosters, the import keeps that selected season for league settings, team names, and traded picks, then follows Sleeper's `previous_league_id` to pull the completed prior-season rosters and draft picks for keeper candidates.

Those imported rosters are not treated as the teams' upcoming-season rosters. In the Trade Idea Finder, the `Look for keeper options` checkbox controls whether imported keeper candidates can appear as trade assets. A team can trade for a keeper player without sending a player back; the keeper asset is priced from the player's current ADP/market value, while the prior draft round is treated as the keeper cost the receiving team must still be able to pay. The finder only suggests a keeper-player trade if the receiving team still has a pick in that keeper-cost round after the proposed trade.

## Pick trade calculator

Use the Trade Calculator tab to compare two-team draft pick trades. Select Team A and Team B, check the picks each side sends, and optionally add a keeper/player asset with a keeper cost round.

The calculator uses a curved draft-capital model where early picks carry disproportionate value. It adjusts values for league settings, starter-window demand, bench depth, scoring format, and each team's current pick situation. Keeper-player assets are priced from current market-pick value; the keeper round remains the future pick cost and eligibility requirement.

## Bulk simulator

Use the Bulk Simulator tab to run up to 100 mock drafts at once. You can compare all strategies or focus on one strategy. The simulator uses small batched runs so the browser stays responsive.

Bulk results include strategy comparison, top first-five-round position builds, common player targets, best/median/worst example drafts, projected starter points, top-3 rate, playoff odds, and early pick analysis with alternatives that were available.

## Draft personas

Each team can be assigned one persona before a mock draft. Personas include strategy style, experience level, ADP discipline, upside preference, team need weight, rookie value, reach frequency, positional aggression, and behavior notes.

Simulated teams balance persona preferences with realistic roster construction. The engine strongly discourages unnecessary extra QB, TE, K, and DEF picks, applies soft caps to RB/WR depth, respects ADP value so top market players are unlikely to fall too far, and adds a small per-draft variation seed so repeated mocks do not play out identically.

Default personas include ADP Grinder, Zero RB Sharp, Hero RB Builder, Robust RB Drafter, WR Volume Drafter, Elite QB Hunter, Elite TE Hunter, Upside Gambler, Safe Floor Drafter, Rookie Chaser, Homer Reacher, and Need-Based Beginner.

## Completed draft archive

When a mock reaches its final pick, use `Save completed & new draft` to archive that finished board and immediately start a fresh mock. Each button press creates a new archive entry, even if the board matches a prior run. Saved drafts can be loaded into a read-only review mode, annotated with notes, and deleted when no longer needed.

## Live draft mode

Use the Draft mode selector in the setup sidebar to switch from `Mock simulation` to `Live draft entry`. In live mode, the app does not auto-simulate the room. Click the actual player selected in the Available Players list, Best Pick panel, or tiers, and the app records that player for whichever team is currently on the clock.

Live mode keeps traded pick order, keepers, team names, rankings, recommendations, the draft assistant, roster tracking, post-draft analysis, and archive saving connected to the live board. Use `Undo last pick` if you need to correct an entry.

## Team draft analysis

After a full draft is complete, the Team Draft Analysis panel grades each team. Grades combine pick value, projected best starting lineup, roster balance, position-by-position room comparison, strengths, weaknesses, playoff odds, best values, costly reaches, and pick-by-pick alternatives that were still available. Projection estimates are heuristic until paid/public projection imports are added.

## Deploy

This is a static app, so it can go live on any static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

No build command is required. The publish directory is the project root.
