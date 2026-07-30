#!/usr/bin/env python3
"""Headless browser validation for Fantasy Draft Labs v1.5.3.

Chromium cannot navigate local files in this environment, so the harness embeds
all deployable assets into an about:blank document and supplies a browser-local
storage shim. The real DOM, event handlers, model code, imports and responsive
layout are still exercised.
"""
from __future__ import annotations

import csv
import io
import json
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tests" / "browser-results.json"


def csv_bytes(headers: list[str], row: list[object]) -> bytes:
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(headers)
    writer.writerow(row)
    return stream.getvalue().encode("utf-8")


LEGACY_CSV = csv_bytes(
    ["source", "rank", "name", "position", "team", "adp", "tier", "projection", "summary"],
    ["Legacy Test Source", 151, "Legacy Browser Receiver", "WR", "PHI", 172.0, 11, 118.4, "Minimal legacy-format import"],
)

ADVANCED_HEADERS = [
    "source", "rank", "name", "position", "team", "adp", "tier", "projection", "projection_period", "summary",
    "depth_chart_role", "depth_chart_rank", "competition", "team_context", "upside_note", "risk_note", "tags",
    "age", "years_experience", "nfl_draft_round", "nfl_draft_pick", "prospect_score", "route_participation",
    "target_share", "targets_per_route", "yards_per_route", "air_yards_share", "first_read_share", "snap_share",
    "red_zone_target_share", "projected_opportunity_share", "standalone_role_score", "contingent_role_score",
    "role_certainty", "offense_environment_score", "adp_source", "adp_format", "adp_date", "adp_sample_size",
    "adp_7_day_change", "adp_30_day_change", "data_updated_at", "role_source", "role_confidence",
    "depth_chart_blockers", "depth_chart_blocker_strength",
]
ADVANCED_CSV = csv_bytes(
    ADVANCED_HEADERS,
    [
        "Advanced Test Source", 94, "Browser Harness Receiver", "WR", "PHI", 300.0, 10, 170.0, "season",
        '<img src=x onerror="window.__valueBreakoutXss=1"> Structured breakout profile',
        "Starting three-wide receiver", 2, "One established starter", "Above-average passing environment",
        "Full-time route growth", "Must retain target efficiency", "target_earning|route_growth",
        23, 1, 2, 44, 78, 0.76, 0.23, 0.26, 2.10, 0.28, 0.27, 0.72, 0.18, 0.68, 70, 74, 72, 70,
        "Sleeper", "12-team Half-PPR", "2026-07-25", 1250, 4, 8, "2026-07-25", "uploaded", "High", 1, 35,
    ],
)
REMOVAL_CSV = csv_bytes(
    ["source", "rank", "name", "position", "team", "adp", "tier", "projection"],
    ["Removal Test Source", 200, "Bijan Robinson", "RB", "ATL", 1.5, 1, 300.0],
) + csv_bytes(
    ["source", "rank", "name", "position", "team", "adp", "tier", "projection"],
    ["Removal Test Source", 1, "Removal Only Player", "WR", "PHI", 250.0, 12, 90.0],
).split(b"\n", 1)[1]


WEIGHT_A_CSV = csv_bytes(
    ["source", "rank", "name", "position", "team", "adp"],
    ["Weight Source A", 1, "Weight Control Player", "WR", "PHI", 90.0],
)
WEIGHT_B_CSV = csv_bytes(
    ["source", "rank", "name", "position", "team", "adp"],
    ["Weight Source B", 180, "Weight Control Player", "WR", "PHI", 90.0],
)
HERBERT_SANITY_CSV = csv_bytes(
    ["source", "rank", "name", "position", "team", "adp", "projection", "projection_period"],
    ["Herbert Sanity Source", 89, "Justin Herbert", "QB", "LAC", 89.0, 425.0, "season"],
)



def inline_application(initial_storage: dict[str, str] | None = None) -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="./styles.css?v=153" />', f"<style>{css}</style>")
    seed = json.dumps(initial_storage or {}).replace("</", "<\\/")
    storage_shim = f"""
<script>
(() => {{
  const data = new Map(Object.entries({seed}));
  const storage = {{
    getItem(key) {{ key = String(key); return data.has(key) ? data.get(key) : null; }},
    setItem(key, value) {{ data.set(String(key), String(value)); }},
    removeItem(key) {{ data.delete(String(key)); }},
    clear() {{ data.clear(); }},
    key(index) {{ return [...data.keys()][index] ?? null; }},
    get length() {{ return data.size; }},
    _dump() {{ return Object.fromEntries(data); }}
  }};
  Object.defineProperty(window, "localStorage", {{ configurable: true, value: storage }});
  window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS = true;
}})();
</script>
"""
    replacements = [
        ("./data/historical-adp-data.js?v=153", "data/historical-adp-data.js", storage_shim),
        ("./sleeper-model.js?v=153", "sleeper-model.js", ""),
        ("./app.js?v=153", "app.js", ""),
        ("./sleeper-lab.js?v=153", "sleeper-lab.js", ""),
    ]
    for src, file_name, prefix in replacements:
        js = (ROOT / file_name).read_text(encoding="utf-8")
        if file_name == "app.js":
            js = js.replace(
                "startCandidateOutcomeRecommendations = function startCandidateOutcomeRecommendationsV13() {",
                "startCandidateOutcomeRecommendations = function startCandidateOutcomeRecommendationsV13() { if (window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS) return;",
            )
        js = js.replace("</script>", "<\\/script>")
        html = html.replace(f'<script src="{src}"></script>', f"{prefix}<script>{js}</script>")
    return html


def install_error_capture(page: Page) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []

    def console(message: Any) -> None:
        if message.type == "error":
            errors.append({"type": "console", "message": message.text})

    page.on("console", console)
    page.on("pageerror", lambda error: errors.append({"type": "pageerror", "message": str(error)}))
    return errors


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_page(browser: Any, *, width: int = 1440, height: int = 1000, storage: dict[str, str] | None = None):
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = install_error_capture(page)
    page.set_content(inline_application(storage), wait_until="load", timeout=120_000)
    page.wait_for_timeout(1200)
    return page, errors


def run() -> dict[str, Any]:
    checks: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page, errors = load_page(browser)
            assert_true(not errors, f"Initial application errors: {errors}")
            assert_true(page.title() == "Fantasy Draft Labs v1.5.3 - League Decision Laboratory", "Versioned application title missing")
            assert_true("League-specific decisions" in page.locator(".mission-banner").inner_text(), "Mission banner did not render")
            assert_true(page.locator("#draftPortfolioPlanning").count() == 1, "Draft Portfolio Planning shell missing")
            checks.append("v1.5.3 application, mission and portfolio planning render without runtime errors")

            # Personas are now part of League setup; the two old standalone tools are not navigation destinations.
            assert_true(page.locator('[data-panel-tab="personas"]').count() == 0, "Standalone Personas tab still exists")
            assert_true(page.locator('[data-panel-tab="sleeper-lab"]').count() == 0, "Standalone Sleeper Lab tab still exists")
            page.locator('[data-panel-tab="league"]').click()
            assert_true(page.locator('[data-panel="league"]').is_visible(), "League panel did not open")
            assert_true(page.locator(".league-persona-section #personaManager").count() == 1, "Personas were not embedded in League setup")
            assert_true(page.locator("#personaManager").inner_text().strip() != "", "Embedded Persona controls did not render")
            checks.append("Personas are merged into League setup and Sleeper Lab is removed as a standalone tool")

            ranking_contract = page.evaluate("""
              () => PLAYERS.length > 0 && PLAYERS.every(player =>
                Number.isFinite(player.marketRank) && Number.isFinite(player.leagueMarketRank)
                && player.convictionClass && typeof player.convictionClass.label === 'string'
                && player.sleeperProfile && Number.isFinite(player.sleeperProfile.sleeperScore))
            """)
            assert_true(ranking_contract, "Ranking or value-breakout profiles were not initialized")
            breakout_contract = page.evaluate("""
              () => {
                const premium = PLAYERS.filter(player => Number.isFinite(Number(player.adp)) && Number(player.adp) <= LEAGUE.teams);
                const qualified = PLAYERS.filter(player => player.sleeperProfile?.isSleeper);
                return {
                  premiumCount: premium.length,
                  premiumQualified: premium.filter(player => player.sleeperProfile?.isSleeper).length,
                  allQualifiedMeetGate: qualified.every(player =>
                    Number(player.adp) > LEAGUE.teams
                    && (player.sleeperProfile.twoRoundAdpEdge || player.sleeperProfile.tierPromotion)),
                  qualifiedCount: qualified.length
                };
              }
            """)
            assert_true(breakout_contract["premiumCount"] > 0, "No first-round players were available to test the guardrail")
            assert_true(breakout_contract["premiumQualified"] == 0, "A first-round player received the breakout signal")
            assert_true(breakout_contract["allQualifiedMeetGate"], "A breakout signal appeared without a two-round edge or full-tier promotion")
            page.locator('[data-panel-tab="rankings"]').click()
            assert_true(page.locator('#cheatSheetPlanFilter option[value="SLEEPER"]').inner_text() == "ADP / tier breakout targets", "Breakout filter was not relabeled")
            assert_true(page.locator('#cheatSheetSort option[value="sleeper"]').inner_text() == "Breakout signal", "Breakout sort was not relabeled")
            page.locator('#cheatSheetPlanFilter').select_option('SLEEPER')
            page.locator('#cheatSheetSort').select_option('sleeper')
            page.wait_for_timeout(150)
            assert_true(page.evaluate("cheatSheetPlayers().every(player => player.sleeperProfile?.isSleeper)"), "Breakout filter returned a non-qualified player")
            checks.append("breakout logic excludes Round 1 and requires a two-round ADP edge or full-tier promotion")

            # Keeper editing is split into distinct team-level mini tables.
            page.locator('[data-panel-tab="keepers"]').click()
            team_cards = page.locator("#keeperEditor .keeper-team-editor")
            expected_teams = page.evaluate("LEAGUE.teams")
            assert_true(team_cards.count() == expected_teams, "Keeper editor does not render one card per team")
            assert_true(page.locator("#keeperEditor .keeper-mini-table").count() == expected_teams, "Each team does not have its own keeper table")
            ids = page.evaluate("[...document.querySelectorAll('#keeperEditor .keeper-team-editor')].map(node => node.id)")
            assert_true(len(ids) == len(set(ids)), "Keeper team cards are not uniquely differentiated")
            checks.append("Keeper setup renders one clearly separated compact table for every team")

            # A manually entered current keeper cost is placed in that exact team's owned pick for the round.
            slot_test = page.evaluate("""
              () => {
                const savedLeague = LEAGUE;
                const savedOrders = state.roundOrders;
                const savedSelections = state.keeperSelections;
                const savedPicks = state.picks;
                try {
                  LEAGUE = {...LEAGUE, teams:12, rounds:16, keeperRules:{...normalizeKeeperRules(LEAGUE.keeperRules), costType:'prior_round', roundEscalation:1}};
                  state.roundOrders = defaultSnakeOrders();
                  state.keeperSelections = normalizeKeeperSelections([]);
                  state.picks = [];
                  const team = 3;
                  const round = 2;
                  const player = PLAYERS.find(candidate => !['K','DEF'].includes(candidate.position));
                  setKeeperEntriesForTeam(team, [{playerId:player.id, round, roundIsKeeperCost:true, acquisitionType:'drafted', yearsKept:0}]);
                  const entry = keeperEntriesForTeam(team)[0];
                  const currentCost = keeperCostForSeason(entry, 0);
                  const nextCost = keeperCostForSeason(entry, 1);
                  const expectedPick = ownedKeeperPicksInRound(team, round)[0];
                  const keeper = buildKeeperPicks().find(row => row.player.id === player.id);
                  return {
                    currentRound: currentCost.round,
                    nextRound: nextCost.round,
                    expectedPick,
                    actualPick: keeper?.pick,
                    actualRound: keeper?.round,
                    actualTeam: keeper?.team,
                    label: keeper?.label
                  };
                } finally {
                  LEAGUE = savedLeague;
                  state.roundOrders = savedOrders;
                  state.keeperSelections = savedSelections;
                  state.picks = savedPicks;
                }
              }
            """)
            assert_true(slot_test["currentRound"] == 2, f"Current keeper cost was escalated twice: {slot_test}")
            assert_true(slot_test["nextRound"] == 1, f"Next-season escalation was not applied separately: {slot_test}")
            assert_true(slot_test["actualPick"] == slot_test["expectedPick"], f"Keeper was not assigned to the team's exact Round 2 slot: {slot_test}")
            assert_true(slot_test["actualRound"] == 2 and slot_test["actualTeam"] == 3, f"Keeper landed on the wrong team/round: {slot_test}")
            checks.append("keeper costs lock into the exact owning team and round, with escalation reserved for next season")

            # Force a deterministic ready comparison so the real Decision Center button can be tested without waiting for rollouts.
            page.locator('[data-panel-tab="draft"]').click()
            page.evaluate("""
              () => {
                const candidates = availablePlayers().slice(0, 3);
                const resultFor = (player, index) => ({
                  playerId: player.id,
                  player,
                  estimatedPlayoffRate: 0.64 - index * 0.025,
                  championshipRate: 0.16 - index * 0.01,
                  downsideRate: 0.08 + index * 0.01,
                  starterImpact: 2.4 - index * 0.35,
                  stability: 0.04,
                  confidence: 'High',
                  survival: {confidence:'High', label:index === 0 ? 'Unlikely to survive' : 'Possible to survive', survivalProbability:0.25 + index * 0.2, explanation:'League-specific room model.'}
                });
                state.candidateOutcome = {status:'ready', key:candidateOutcomeModelKey(), results:candidates.map(resultFor), error:''};
                state.assistantSession.offlineMode = true;
                renderRecommendations();
              }
            """)
            ask_button = page.locator('[data-open-draft-assistant="true"]')
            assert_true(ask_button.count() == 1, "Ask about this pick button did not render")
            expected_prompt = ask_button.get_attribute("data-assistant-prompt") or ""
            ask_button.click()
            page.wait_for_timeout(250)
            assert_true(page.locator("details.draft-assistant").get_attribute("open") is not None, "Ask about this pick did not open the Draft Assistant")
            assistant_text = page.locator("#assistantMessages").inner_text()
            assert_true(expected_prompt.split(". Challenge")[0] in assistant_text, "Ask about this pick did not submit its player-specific question")
            checks.append("Ask about this pick opens the assistant and submits grounded current-pick context")

            # Existing imports still work and advanced evidence is escaped.
            page.locator('[data-panel-tab="rankings"]').click()
            page.locator("#rankingsUpload").set_input_files({"name": "legacy-rankings.csv", "mimeType": "text/csv", "buffer": LEGACY_CSV})
            page.wait_for_timeout(800)
            legacy = page.evaluate("""
              () => ({
                status: document.getElementById('importStatus').textContent,
                row: state.importedRankingRows.find(row => row.name === 'Legacy Browser Receiver'),
                player: PLAYERS.find(player => player.name === 'Legacy Browser Receiver')
              })
            """)
            assert_true("Imported" in legacy["status"] and bool(legacy["row"]), "Legacy CSV import failed")
            assert_true(bool(legacy["player"] and legacy["player"].get("sleeperProfile")), "Legacy import did not receive internal breakout evidence")

            page.evaluate("window.__valueBreakoutXss = 0")
            page.locator("#rankingsUpload").set_input_files({"name": "advanced-rankings.csv", "mimeType": "text/csv", "buffer": ADVANCED_CSV})
            page.wait_for_timeout(1000)
            advanced = page.evaluate("""
              () => {
                const row = state.importedRankingRows.find(row => row.name === 'Browser Harness Receiver');
                const player = PLAYERS.find(player => player.name === 'Browser Harness Receiver');
                return {
                  row,
                  profile: player?.sleeperProfile,
                  sourceParts: player?.sourceParts,
                  xss: window.__valueBreakoutXss,
                  standaloneBoard: document.querySelectorAll('[data-panel="sleeper-lab"], #sleeperLabBoard').length
                };
              }
            """)
            assert_true(advanced["row"]["targetsPerRoute"] == 0.26, "Advanced optional metric was not parsed")
            assert_true(advanced["profile"]["roleSource"] == "uploaded" and advanced["profile"]["roleConfidence"] == "High", "Advanced provenance was lost")
            assert_true(advanced["profile"]["isSleeper"] is True and advanced["profile"]["twoRoundAdpEdge"] is True, "Two-round breakout value was not recognized")
            advanced_part = next((part for part in advanced["sourceParts"] if part.get("source") == "Advanced Test Source"), None)
            assert_true(bool(advanced_part) and advanced_part.get("projectionCoverageEligible") is False and advanced_part.get("vor") is None, "Sparse projection data should be retained but blocked from cross-position VOR ranking influence")
            assert_true(advanced["xss"] == 0 and advanced["standaloneBoard"] == 0, "Imported text escaped the UI or standalone Sleeper Lab remains")
            checks.append("legacy and advanced ranking imports remain compatible while sparse projections cannot distort the overall board")

            # A high raw QB projection must remain anchored to source rank and ADP in a normal one-QB league.
            page.locator("#rankingsUpload").set_input_files({"name": "herbert-sanity.csv", "mimeType": "text/csv", "buffer": HERBERT_SANITY_CSV})
            page.wait_for_timeout(650)
            herbert = page.evaluate("""
              () => {
                const player = PLAYERS.find(row => row.name === 'Justin Herbert');
                return {
                  rank: player?.consensusRank,
                  base: player?.baseConsensusRank,
                  raw: player?.rawLabRank,
                  guardrail: player?.guardrailRank,
                  valueSources: player?.valueNormalizedSourceCount,
                  adp: player?.adp
                };
              }
            """)
            assert_true(herbert["rank"] > 24, f"One-QB projection inflation placed Justin Herbert implausibly high: {herbert}")
            assert_true(abs(herbert["rank"] - herbert["base"]) <= 12, f"Custom rank escaped its weighted consensus guardrail: {herbert}")
            assert_true(herbert["valueSources"] == 0, "A one-row projection source should not qualify for cross-position VOR")
            page.locator('[data-remove-ranking-source="Herbert Sanity Source"]').click()
            page.wait_for_timeout(350)
            checks.append("one-QB projection and scoring adjustments remain bounded around uploaded rank consensus")

            # Sliders must change canonical state, persisted weights and the actual ranking order.
            page.locator("#rankingsUpload").set_input_files([
                {"name": "weight-a.csv", "mimeType": "text/csv", "buffer": WEIGHT_A_CSV},
                {"name": "weight-b.csv", "mimeType": "text/csv", "buffer": WEIGHT_B_CSV},
            ])
            page.wait_for_timeout(700)
            page.locator('[data-ranking-source-weight="Weight Source A"]').evaluate("el => { el.value='5'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
            page.locator('[data-ranking-source-weight="Weight Source B"]').evaluate("el => { el.value='0'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
            page.wait_for_timeout(350)
            a_heavy = page.evaluate("""
              () => ({
                rank: PLAYERS.find(player => player.name === 'Weight Control Player')?.consensusRank,
                weights: {...state.rankingSourceWeights},
                stored: JSON.parse(localStorage.getItem('fantasyDraftLabRankingSourceWeights') || '{}')
              })
            """)
            page.locator('[data-ranking-source-weight="Weight Source A"]').evaluate("el => { el.value='0'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
            page.locator('[data-ranking-source-weight="Weight Source B"]').evaluate("el => { el.value='5'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }")
            page.wait_for_timeout(350)
            b_heavy = page.evaluate("""
              () => ({
                rank: PLAYERS.find(player => player.name === 'Weight Control Player')?.consensusRank,
                weights: {...state.rankingSourceWeights},
                stored: JSON.parse(localStorage.getItem('fantasyDraftLabRankingSourceWeights') || '{}')
              })
            """)
            assert_true(a_heavy["rank"] < 15 and b_heavy["rank"] > 140 and b_heavy["rank"] - a_heavy["rank"] > 100, f"Slider weights did not materially change the board: {a_heavy} -> {b_heavy}")
            assert_true(a_heavy["weights"]["Weight Source A"] == 5 and a_heavy["stored"]["Weight Source B"] == 0, "A-heavy slider state was not persisted")
            assert_true(b_heavy["weights"]["Weight Source A"] == 0 and b_heavy["stored"]["Weight Source B"] == 5, "B-heavy slider state was not persisted")
            page.locator('[data-remove-ranking-source="Weight Source B"]').click()
            page.wait_for_timeout(350)
            zero_weight_after_remove = page.evaluate("""
              () => ({
                sourceB: state.rankingSources.some(source => source.name === 'Weight Source B'),
                playerExists: Boolean(PLAYERS.find(player => player.name === 'Weight Control Player')),
                sourceAWeight: state.rankingSourceWeights['Weight Source A']
              })
            """)
            assert_true(not zero_weight_after_remove["sourceB"] and not zero_weight_after_remove["playerExists"] and zero_weight_after_remove["sourceAWeight"] == 0, f"Removed or zero-weight sources still influenced the board: {zero_weight_after_remove}")
            page.locator('[data-remove-ranking-source="Weight Source A"]').click()
            page.wait_for_timeout(250)
            checks.append("source sliders and Remove buttons mutate live, persisted and player-level ranking state")

            # Removing a source must purge its rows, weights, filter option, persisted state and player influence.
            page.locator("#rankingsUpload").set_input_files({"name": "removal-rankings.csv", "mimeType": "text/csv", "buffer": REMOVAL_CSV})
            page.wait_for_timeout(700)
            removal_before = page.evaluate("""
              () => ({
                sourceActive: state.rankingSources.some(source => rankingSourceKey(source.name) === rankingSourceKey('Removal Test Source')),
                bijanHasSource: PLAYERS.find(player => player.name === 'Bijan Robinson')?.sourceNames?.some(name => rankingSourceKey(name) === rankingSourceKey('Removal Test Source')),
                uniqueExists: Boolean(PLAYERS.find(player => player.name === 'Removal Only Player'))
              })
            """)
            assert_true(removal_before["sourceActive"] and removal_before["bijanHasSource"] and removal_before["uniqueExists"], "Removal test source did not influence the board before deletion")
            # Reproduce older saved-data formatting: same source with inconsistent case and whitespace.
            page.evaluate("""
              () => {
                state.importedRankingRows = state.importedRankingRows.map(row =>
                  rankingSourceKey(row.source) === rankingSourceKey('Removal Test Source')
                    ? {...row, source:'  REMOVAL   TEST SOURCE  '}
                    : row
                );
                rebuildConsensusPlayers(state.importedRankingRows);
                renderSourceStatus();
                renderCheatSheet();
              }
            """)
            assert_true(not errors, f"Unexpected runtime errors before removal recovery test: {errors}")
            page.evaluate("""
              () => {
                const original = rebuildConsensusPlayers;
                let failOnce = true;
                rebuildConsensusPlayers = function(...args) {
                  if (failOnce) {
                    failOnce = false;
                    throw new Error('Injected one-time rebuild failure');
                  }
                  return original(...args);
                };
              }
            """)
            page.locator('[data-remove-ranking-source="Removal Test Source"]').click()
            page.wait_for_timeout(500)
            expected_recovery_errors = [error for error in errors if "Ranking rebuild failed after source change" in error.get("message", "")]
            assert_true(bool(expected_recovery_errors), "The one-time rebuild failure was not exercised")
            errors[:] = [error for error in errors if "Ranking rebuild failed after source change" not in error.get("message", "")]
            removal_after = page.evaluate("""
              () => {
                const storedRows = JSON.parse(localStorage.getItem('fantasyDraftLabRankingRows') || '[]');
                const storedSources = JSON.parse(localStorage.getItem('fantasyDraftLabRankingSources') || '[]');
                const bijan = PLAYERS.find(player => player.name === 'Bijan Robinson');
                return {
                  active: state.rankingSources.some(source => rankingSourceKey(source.name) === rankingSourceKey('Removal Test Source')),
                  rows: state.importedRankingRows.some(row => rankingSourceKey(row.source) === rankingSourceKey('Removal Test Source')),
                  weight: Object.keys(state.rankingSourceWeights).some(name => rankingSourceKey(name) === rankingSourceKey('Removal Test Source')),
                  bijanHasSource: bijan?.sourceNames?.some(name => rankingSourceKey(name) === rankingSourceKey('Removal Test Source')),
                  uniqueExists: Boolean(PLAYERS.find(player => player.name === 'Removal Only Player')),
                  optionExists: [...document.querySelectorAll('#cheatSheetSource option')].some(option => rankingSourceKey(option.value) === rankingSourceKey('Removal Test Source')),
                  storedRows: storedRows.some(row => rankingSourceKey(row.source) === rankingSourceKey('Removal Test Source')),
                  storedSources: storedSources.some(source => rankingSourceKey(source.name) === rankingSourceKey('Removal Test Source')),
                  status: document.getElementById('importStatus').textContent
                };
              }
            """)
            assert_true(not any([removal_after["active"], removal_after["rows"], removal_after["weight"], removal_after["bijanHasSource"], removal_after["uniqueExists"], removal_after["optionExists"], removal_after["storedRows"], removal_after["storedSources"]]), f"Removed source still influenced rankings: {removal_after}")
            assert_true("rebuilt the rankings" in removal_after["status"], "Source removal did not confirm a rankings rebuild")
            checks.append("ranking source removal stays authoritative through stale data and a failed first rebuild")

            # Existing localStorage schema remains loadable.
            old_row = {
                "id": "legacy-storage-player", "name": "Legacy Storage Player", "position": "WR", "team": "PHI",
                "source": "Stored Legacy Source", "rank": 111, "adp": 144.0, "tier": 9, "projection": None,
                "keeperValue": 0, "summary": "Old schema row without advanced metrics", "tags": [],
            }
            storage = {
                "fantasyDraftLabRankingRows": json.dumps([old_row]),
                "fantasyDraftLabRankingSources": json.dumps([{"name": "Stored Legacy Source", "type": "uploaded", "rows": 1, "status": "active"}]),
                "fantasyDraftLabSeedRankingsEnabled": "true",
            }
            old_page, old_errors = load_page(browser, storage=storage)
            migrated = old_page.evaluate("""
              () => ({
                row: state.importedRankingRows.find(item => item.id === 'legacy-storage-player'),
                profile: PLAYERS.find(item => item.id === 'legacy-storage-player')?.sleeperProfile,
                savedRows: JSON.parse(localStorage.getItem('fantasyDraftLabRankingRows') || '[]')
              })
            """)
            assert_true(not old_errors, f"Legacy storage caused browser errors: {old_errors}")
            assert_true(bool(migrated["row"] and migrated["profile"]), "Existing ranking storage did not load")
            assert_true(any(row.get("id") == "legacy-storage-player" for row in migrated["savedRows"]), "Existing ranking storage was overwritten")
            old_page.close()
            checks.append("existing ranking localStorage remains compatible and preserved")

            # A Deep Compare result set must remain compact enough to aggregate and render
            # without terminating Chromium near the end of the batch.
            stress_page, stress_errors = load_page(browser)
            stress = stress_page.evaluate("""
              async () => {
                state.bulk.depth = 'deep';
                state.bulk.mode = 'compare';
                state.bulk.count = 50;
                const modelKey = bulkSimulationModelKey();
                const base = simulateBulkDraft('balanced', 0, modelKey);
                compactBulkRunRuntime(base);
                delete base._seasonSimulationInput;
                const strategies = BULK_STRATEGIES.map(row => row.id);
                const runs = Array.from({length: 450}, (_, index) => {
                  const run = structuredClone(base);
                  run.id = `stress-${index}`;
                  run.runIndex = index + 1;
                  run.strategy = strategies[index % strategies.length];
                  run.strategyLabel = BULK_STRATEGIES.find(row => row.id === run.strategy)?.label || run.strategy;
                  run.rank = (index % LEAGUE.teams) + 1;
                  run.averageRoomFinish = run.rank;
                  run.playoffRate = 0.35 + (index % 30) / 100;
                  run.playoffOdds = Math.round(run.playoffRate * 100);
                  run.seasonSimulationCount = 24;
                  return run;
                });
                const sizes = runs.map(run => JSON.stringify(run).length);
                const originalPlayerCount = PLAYERS.length;
                const templatePlayers = PLAYERS.slice(0, Math.min(120, PLAYERS.length));
                for (let index = 0; index < 4000; index += 1) {
                  const template = templatePlayers[index % templatePlayers.length];
                  PLAYERS.push({ ...template, id: `stress-player-${index}`, name: `Stress Player ${index}`, consensusRank: 1000 + index, adp: 1000 + index, sourceRanks: {} });
                }
                state.bulk.running = true;
                state.bulk.progress = 450;
                state.bulk.total = 450;
                await finishBulkSimulationBatch(runs, modelKey);
                const result = {
                  runCount: state.bulk.results?.runs?.length || 0,
                  maxRunBytes: Math.max(...sizes),
                  totalRunBytes: sizes.reduce((sum, size) => sum + size, 0),
                  summaryRuns: state.bulk.results?.summary?.totalRuns || 0,
                  rendered: document.getElementById('bulkResults')?.textContent?.includes('Strategy comparison') || false,
                  rosterKeys: Object.keys(state.bulk.results?.runs?.[0]?.userRoster?.[0] || {}),
                  breakdownKeys: Object.keys(state.bulk.results?.runs?.[0]?.pickBreakdown?.[0]?.player || {}),
                  priorityCount: state.bulk.results?.summary?.priority?.length || 0,
                  phase: state.bulk.phase,
                  running: state.bulk.running,
                  error: state.bulk.error || '',
                  reducedAdvanced: document.getElementById('bulkProgressText')?.textContent?.includes('reduced advanced analysis') || false,
                  draftPlanIndex: [...document.getElementById('bulkResults').children].findIndex(node => node.classList.contains('draft-plan-primary')),
                  strategyIndex: [...document.getElementById('bulkResults').children].findIndex(node => node.classList.contains('strategy-comparison-section')),
                  calibrationIndex: [...document.getElementById('bulkResults').children].findIndex(node => node.classList.contains('calibration-center')),
                  calibrationTag: document.querySelector('#bulkResults .calibration-center')?.tagName || '',
                  calibrationOpen: document.querySelector('#bulkResults .calibration-center')?.open || false,
                  calibrationText: document.querySelector('#bulkResults .calibration-center')?.textContent || ''
                };
                PLAYERS.splice(originalPlayerCount);
                return result;
              }
            """)
            assert_true(not stress_errors, f"Deep Compare stress test caused browser errors: {stress_errors}")
            assert_true(stress["runCount"] == 450 and stress["summaryRuns"] == 450 and stress["rendered"], f"Deep Compare did not finish and render: {stress}")
            assert_true(not stress["running"] and stress["phase"] == "idle", f"Bulk finalization did not leave the running state: {stress}")
            assert_true(stress["priorityCount"] <= 430, f"Draft Plan Priority did not enforce its bounded player pool: {stress}")
            assert_true(stress["maxRunBytes"] < 140_000 and stress["totalRunBytes"] < 60_000_000, f"Bulk runs remain too large for browser-safe aggregation: {stress}")
            assert_true("sourceRanks" not in stress["rosterKeys"] and "sleeperProfile" not in stress["breakdownKeys"], f"Full player models leaked into retained runs: {stress}")
            assert_true(not stress["error"] and not stress["reducedAdvanced"], f"Advanced Draft Plan analysis unexpectedly fell back: {stress}")
            assert_true(stress["draftPlanIndex"] >= 0 and stress["strategyIndex"] > stress["draftPlanIndex"] and stress["calibrationIndex"] > stress["strategyIndex"], f"Calibration Center is not placed after Draft Plan and strategy results: {stress}")
            assert_true(stress["calibrationTag"] == "DETAILS" and not stress["calibrationOpen"], f"Zero-sample calibration center must be collapsed: {stress}")
            assert_true("Calibration begins during live drafts" in stress["calibrationText"] and "Bulk simulations test draft decisions" in stress["calibrationText"], f"Calibration empty-state explanation missing: {stress}")

            historical_calibration = stress_page.evaluate("""
              () => {
                const teams = Array.from({length: LEAGUE.teams}, (_, index) => ({
                  team: index + 1,
                  picksAnalyzed: 12,
                  draftsAnalyzed: 2,
                  seasonStats: [
                    { season: '2024', roundPositionBias: { early: { WR: 3, RB: 1 }, middle: {}, late: {} }, roundPositionCounts: {} },
                    { season: '2025', roundPositionBias: { early: { WR: 4, RB: 1 }, middle: {}, late: {} }, roundPositionCounts: {} }
                  ],
                  pickRecords: []
                }));
                state.sleeper.importData = state.sleeper.importData || {};
                state.sleeper.importData.scoutingReport = normalizeScoutingReport({
                  schemaVersion: 3,
                  league: { draftsAnalyzed: 2, picksAnalyzed: 144 },
                  seasons: [{season:'2024'}, {season:'2025'}],
                  teams
                }, LEAGUE.teams);
                renderBulkSimulator();
                const center = document.querySelector('#bulkResults .calibration-center');
                center.open = true;
                return {
                  text: center.textContent || '',
                  positionTests: historicalBacktestSummary(scoutingReport()).evaluated,
                  calibrationIndex: [...document.getElementById('bulkResults').children].findIndex(node => node.classList.contains('calibration-center')),
                  strategyIndex: [...document.getElementById('bulkResults').children].findIndex(node => node.classList.contains('strategy-comparison-section'))
                };
              }
            """)
            assert_true(historical_calibration["positionTests"] > 0, f"Synthetic multi-season history did not create held-out tests: {historical_calibration}")
            assert_true("Historical no-lookahead evidence" in historical_calibration["text"] and "Position-timing accuracy" in historical_calibration["text"], f"Historical evidence did not populate Calibration Center: {historical_calibration}")
            assert_true(historical_calibration["calibrationIndex"] > historical_calibration["strategyIndex"], f"Historical calibration moved ahead of strategy results: {historical_calibration}")
            stress_page.close()
            checks.append("450-run Deep Compare aggregation stays compact, full analysis loads, and calibration is correctly placed and explained")

            mobile, mobile_errors = load_page(browser, width=390, height=844)
            mobile.locator('[data-panel-tab="keepers"]').click()
            mobile.wait_for_timeout(250)
            overflow = mobile.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            assert_true(not mobile_errors, f"Mobile layout errors: {mobile_errors}")
            assert_true(overflow <= 1, f"Mobile keeper layout creates document overflow: {overflow}px")
            assert_true(mobile.locator("#keeperEditor .keeper-team-editor").count() == mobile.evaluate("LEAGUE.teams"), "Keeper team cards disappeared on mobile")
            mobile.close()
            checks.append("390px keeper layout has no document-level horizontal overflow")

            assert_true(not errors, f"Runtime errors after interactions: {errors}")
            return {"status": "passed", "checks": checks, "checkCount": len(checks)}
        finally:
            browser.close()


if __name__ == "__main__":
    try:
        result = run()
        RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"browser_harness.py: {result['checkCount']} checks passed")
        for item in result["checks"]:
            print(f"  PASS: {item}")
    except Exception as exc:
        result = {"status": "failed", "error": str(exc)}
        RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"browser_harness.py: FAILED: {exc}", file=sys.stderr)
        raise
