#!/usr/bin/env python3
"""Headless browser harness for Fantasy Draft Labs Sleeper Lab.

The execution environment blocks network and file navigations in Chromium, so the
harness embeds the deployable files unchanged into an about:blank document and
provides a browser-local storage shim. This still exercises the real DOM, event
handlers, parser, model, assistant dispatcher and responsive layout.
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
        '<img src=x onerror="window.__sleeperLabXss=1"> Structured breakout profile',
        "Starting three-wide receiver", 2, "One established starter", "Above-average passing environment",
        "Full-time route growth", "Must retain target efficiency", "target_earning|route_growth",
        23, 1, 2, 44, 78, 0.76, 0.23, 0.26, 2.10, 0.28, 0.27, 0.72, 0.18, 0.68, 70, 74, 72, 70,
        "Sleeper", "12-team Half-PPR", "2026-07-25", 1250, 4, 8, "2026-07-25", "uploaded", "High", 1, 35,
    ],
)


def inline_application(initial_storage: dict[str, str] | None = None) -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="./styles.css?v=120" />', f"<style>{css}</style>")
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
}})();
</script>
"""
    replacements = [
        ("./data/historical-adp-data.js?v=111", "data/historical-adp-data.js", storage_shim),
        ("./sleeper-model.js?v=120", "sleeper-model.js", ""),
        ("./app.js?v=123", "app.js", ""),
        ("./sleeper-lab.js?v=120", "sleeper-lab.js", ""),
    ]
    for src, file_name, prefix in replacements:
        js = (ROOT / file_name).read_text(encoding="utf-8").replace("</script>", "<\\/script>")
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
            assert_true(page.title() == "Fantasy Draft Labs v1.2.3 - Sleeper Lab", "Versioned application title missing")
            checks.append("full application loads without console or page errors")

            page.locator('[data-panel-tab="sleeper-lab"]').click()
            assert_true(page.locator('[data-panel="sleeper-lab"]').is_visible(), "Sleeper Lab panel did not open")
            cards = page.locator(".sleeper-card")
            assert_true(cards.count() > 0, "Sleeper Board did not render player cards")
            card_text = cards.first.inner_text()
            card_text_lower = card_text.lower()
            for label in [
                "ADP", "Price edge", "League fit", "Archetype", "Current role", "Ceiling role", "Catalyst",
                "Main blocker", "Target round", "Next-pick survival", "Why sleeper", "Why not",
                "What must happen", "Roster/league fit",
            ]:
                assert_true(label.lower() in card_text_lower, f"Sleeper card is missing {label}")
            detail_text = page.locator("#sleeperLabDetail").inner_text()
            detail_text_lower = detail_text.lower()
            for label in ["Price edge", "Opportunity", "Talent", "Catalyst", "League fit", "Room timing", "Role and provenance", "Acquisition window"]:
                assert_true(label.lower() in detail_text_lower, f"Sleeper detail is missing {label}")
            assert_true(page.locator('#cheatSheetPlanFilter option[value="SLEEPER"]').count() == 1, "Rankings sleeper filter is missing")
            assert_true(page.locator('#cheatSheetSort option[value="sleeper"]').count() == 1, "Rankings Sleeper Score sort is missing")
            page.locator('[data-panel-tab="rankings"]').click()
            page.locator('#cheatSheetPlanFilter').select_option('SLEEPER')
            page.locator('#cheatSheetSort').select_option('sleeper')
            page.wait_for_timeout(150)
            filtered_ok = page.evaluate("cheatSheetPlayers().every(player => player.sleeperProfile?.isSleeper)")
            assert_true(filtered_ok, "Rankings Sleeper filter returned a non-qualified player")
            page.locator('[data-panel-tab="sleeper-lab"]').click()
            checks.append("Sleeper Board, profile detail and Rankings filter/sort expose required fields")

            profile_validation = page.evaluate("""
              () => {
                const required = [
                  'sleeperScore','priceEdgeScore','opportunityPathScore','talentSignalScore','ceilingCatalystScore',
                  'leagueFitScore','roomTimingScore','confidenceScore','confidenceLabel','currentRole','ceilingRole',
                  'standaloneValueScore','contingentValueScore','catalystType','catalystDescription','primaryBlocker',
                  'failureReasons','archetype','targetRound','earliestReasonablePick','latestSafePick','survivalToNextPick',
                  'roomThreats','evidence','missingData','dataFreshness'
                ];
                return PLAYERS.every(player => player.sleeperProfile && required.every(key => key in player.sleeperProfile)
                  && Number.isFinite(player.sleeperProfile.sleeperScore));
              }
            """)
            assert_true(profile_validation, "One or more player profiles are incomplete or non-finite")
            checks.append("all loaded players receive complete finite profiles even without advanced metrics")

            tool_result = page.evaluate("""
              () => {
                const before = state.picks.length;
                const args = {positions:['RB','WR'], minimumScore:45, minimumAdp:60, maximumAdp:240, targetType:'all', limit:7};
                const first = getSleeperTargetsTool(args);
                const second = getSleeperTargetsTool(args);
                let rejectedExtra = false;
                let rejectedType = false;
                try { getSleeperTargetsTool({...args, executeCode: true}); } catch { rejectedExtra = true; }
                try { getSleeperTargetsTool({...args, targetType: 'anything'}); } catch { rejectedType = true; }
                return { before, after: state.picks.length, first, second, same: JSON.stringify(first) === JSON.stringify(second), rejectedExtra, rejectedType };
              }
            """)
            assert_true(tool_result["before"] == tool_result["after"], "Assistant sleeper tool modified draft picks")
            assert_true(tool_result["same"], "Assistant sleeper tool is not deterministic")
            assert_true(tool_result["rejectedExtra"] and tool_result["rejectedType"], "Assistant sleeper tool did not fail closed on invalid arguments")
            assert_true(tool_result["first"]["deterministic"] is True, "Assistant sleeper tool lacks deterministic marker")
            assert_true(len(tool_result["first"]["targets"]) <= 7, "Assistant sleeper tool exceeded limit")
            if tool_result["first"]["targets"]:
                target = tool_result["first"]["targets"][0]
                for key in ["sleeperScore", "priceEdgeScore", "opportunityPathScore", "talentSignalScore", "confidenceLabel", "evidence", "catalyst", "blocker", "targetWindow", "survivalToNextPick", "roomPressure"]:
                    assert_true(key in target, f"Assistant sleeper target missing {key}")
            delegated = page.evaluate("""
              async () => {
                const before = state.picks.length;
                const context = await runDraftAssistantTool('get_draft_context', {});
                const local = localAssistantResponse('Who are my best sleeper targets?');
                return {before, after: state.picks.length, context, local};
              }
            """)
            assert_true(delegated["before"] == delegated["after"], "Delegated assistant tools changed draft state")
            assert_true("currentPick" in delegated["context"], "Existing assistant dispatcher no longer delegates tools")
            assert_true("Deterministic Sleeper Lab targets" in delegated["local"] or "does not find" in delegated["local"], "Local sleeper fallback did not run")
            checks.append("get_sleeper_targets is strict, deterministic and read-only while existing tools and local fallback continue working")

            late_only = page.evaluate("""
              () => buildSleeperProfile({name:'Late Only Browser Test', position:'WR', rank:100, adp:190}, {analysisDate:'2026-07-28', teams:12, currentPick:80})
            """)
            assert_true(late_only["isSleeper"] is False, "Late ADP alone qualified as a sleeper")
            assert_true(late_only["confidenceLabel"] == "Low", "Missing inputs did not lower confidence")
            checks.append("late ADP alone does not qualify and missing data lowers confidence")

            page.locator("#rankingsUpload").set_input_files({"name": "legacy-rankings.csv", "mimeType": "text/csv", "buffer": LEGACY_CSV})
            page.wait_for_timeout(800)
            legacy_import = page.evaluate("""
              () => ({
                status: document.getElementById('importStatus').textContent,
                row: state.importedRankingRows.find(row => row.name === 'Legacy Browser Receiver'),
                player: PLAYERS.find(player => player.name === 'Legacy Browser Receiver')
              })
            """)
            assert_true("Imported" in legacy_import["status"], f"Legacy CSV failed: {legacy_import['status']}")
            assert_true(bool(legacy_import["row"]), "Legacy CSV row was not retained")
            assert_true(bool(legacy_import["player"] and legacy_import["player"].get("sleeperProfile")), "Legacy CSV player lacks Sleeper Profile")
            checks.append("existing minimal CSV format still imports and receives a non-crashing profile")

            page.evaluate("window.__sleeperLabXss = 0")
            page.locator("#rankingsUpload").set_input_files({"name": "advanced-rankings.csv", "mimeType": "text/csv", "buffer": ADVANCED_CSV})
            page.wait_for_timeout(1000)
            advanced = page.evaluate("""
              () => {
                const row = state.importedRankingRows.find(row => row.name === 'Browser Harness Receiver');
                const player = PLAYERS.find(player => player.name === 'Browser Harness Receiver');
                const snapshot = state.sleeperLab.adpSnapshots.find(item => item.player === 'Browser Harness Receiver');
                return {
                  row,
                  profile: player?.sleeperProfile,
                  snapshot,
                  xss: window.__sleeperLabXss,
                  injectedImageCount: document.querySelectorAll('#sleeperLabBoard img').length,
                  stored: JSON.parse(localStorage.getItem('fantasyDraftLabSleeperLabV1') || '{}')
                };
              }
            """)
            assert_true(advanced["row"]["targetsPerRoute"] == 0.26, "Advanced optional metric was not parsed")
            assert_true(advanced["profile"]["roleSource"] == "uploaded", "Uploaded role provenance was lost")
            assert_true(advanced["profile"]["roleConfidence"] == "High", "Uploaded role confidence was lost")
            assert_true(advanced["snapshot"]["platform"] == "Sleeper", "ADP platform snapshot was not stored")
            assert_true(advanced["snapshot"]["date"] == "2026-07-25", "Dated ADP snapshot was not stored")
            assert_true(advanced["xss"] == 0 and advanced["injectedImageCount"] == 0, "Imported text was not escaped")
            assert_true(advanced["stored"].get("version") == 1, "Sleeper Lab localStorage state was not persisted")
            qualified_tool = page.evaluate("""
              () => {
                const result = getSleeperTargetsTool({positions:['WR'], minimumScore:0, minimumAdp:null, maximumAdp:null, targetType:'all', limit:30});
                return {
                  included: result.targets.some(target => target.name === 'Browser Harness Receiver'),
                  allQualified: result.targets.every(target => target.qualified === true)
                };
              }
            """)
            assert_true(qualified_tool["included"], "Structured advanced sleeper did not reach the browser-owned tool")
            assert_true(qualified_tool["allQualified"], "Assistant sleeper tool returned a non-qualified profile")
            checks.append("advanced optional columns, provenance and dated ADP snapshots import safely with escaped text")

            old_row = {
                "id": "legacy-storage-player",
                "name": "Legacy Storage Player",
                "position": "WR",
                "team": "PHI",
                "source": "Stored Legacy Source",
                "rank": 111,
                "adp": 144.0,
                "tier": 9,
                "projection": None,
                "keeperValue": 0,
                "summary": "Old schema row without advanced metrics",
                "tags": [],
            }
            storage = {
                "fantasyDraftLabRankingRows": json.dumps([old_row]),
                "fantasyDraftLabRankingSources": json.dumps([{"name": "Stored Legacy Source", "type": "uploaded", "rows": 1, "status": "active"}]),
                "fantasyDraftLabSeedRankingsEnabled": "true",
            }
            old_page, old_errors = load_page(browser, storage=storage)
            migrated = old_page.evaluate("""
              () => {
                const row = state.importedRankingRows.find(item => item.id === 'legacy-storage-player');
                const player = PLAYERS.find(item => item.id === 'legacy-storage-player');
                return {row, profile: player?.sleeperProfile, savedRows: JSON.parse(localStorage.getItem('fantasyDraftLabRankingRows') || '[]')};
              }
            """)
            assert_true(not old_errors, f"Legacy storage caused browser errors: {old_errors}")
            assert_true(bool(migrated["row"]), "Existing ranking storage did not load")
            assert_true(bool(migrated["profile"]), "Existing stored player was removed by Sleeper Lab")
            assert_true(migrated["profile"]["confidenceLabel"] == "Low", "Legacy missing data should lower confidence")
            assert_true(any(row.get("id") == "legacy-storage-player" for row in migrated["savedRows"]), "Existing ranking storage was overwritten")
            old_page.close()
            checks.append("existing ranking localStorage loads safely and is preserved")

            pick_page, pick_errors = load_page(browser)
            pick_snapshot = pick_page.evaluate("""
              () => {
                const player = availablePlayers()[0];
                const pickNumber = state.currentPick;
                const expected = player.sleeperProfile;
                makePick(player);
                const pick = state.picks.find(row => row.pick === pickNumber && row.player.id === player.id);
                const compact = compactPick(pick);
                return { expected, snapshot: pick?.sleeperAtPick, frozen: Object.isFrozen(pick?.sleeperAtPick), compactSnapshot: compact?.sleeperAtPick };
              }
            """)
            assert_true(not pick_errors, f"Draft-time snapshot page errors: {pick_errors}")
            assert_true(bool(pick_snapshot["snapshot"]), "User pick did not retain a draft-time sleeper snapshot")
            assert_true(pick_snapshot["frozen"] is True, "Draft-time sleeper snapshot is mutable")
            assert_true(pick_snapshot["snapshot"]["sleeperScore"] == pick_snapshot["expected"]["sleeperScore"], "Draft-time Sleeper Score changed while capturing the pick")
            assert_true(pick_snapshot["compactSnapshot"]["pickNumber"] == pick_snapshot["snapshot"]["pickNumber"], "Compact/archive pick lost the draft-time snapshot")
            pick_page.close()
            checks.append("user picks retain immutable draft-time Sleeper Score snapshots for grading and calibration")

            bulk_page, bulk_errors = load_page(browser)
            bulk_result = bulk_page.evaluate("""
              async () => {
                const before = {
                  picks: state.picks.length,
                  currentPick: state.currentPick,
                  strategy: state.strategy,
                  personaCount: state.teamPersonas.length,
                };
                state.bulk.mode = 'single';
                state.bulk.depth = 'quick';
                state.bulk.count = 1;
                state.bulk.strategy = 'balanced';
                const run = await enrichBulkRunWithSeasonSimulation(simulateBulkDraft('balanced', 0, bulkSimulationModelKey()));
                const replay = bulkRunPicks(run);
                const finalizationStages = [];
                const asyncSummary = await summarizeBulkResultsAsync([run], stage => finalizationStages.push(stage));
                return {
                  before,
                  after: {
                    picks: state.picks.length,
                    currentPick: state.currentPick,
                    strategy: state.strategy,
                    personaCount: state.teamPersonas.length,
                  },
                  traceLength: run.pickTrace?.length || 0,
                  expandedStored: Array.isArray(run.allPicks) && run.allPicks.length > 0,
                  replayLength: replay.length,
                  exportPickCount: bulkRunForExport(run).allPicks.length,
                  allPicksCsvRows: bulkAllPicksCsv([run]).split('\\n').length,
                  userPickCount: run.userPicks.length,
                  maxAvailability: Math.max(...run.availability.map(item => item.available.length)),
                  compactRoster: run.userRoster.every(player => Object.keys(player).length <= 10 && 'projectionType' in player),
                  workerTimeout: BULK_WORKER_TIMEOUT_MS,
                  safeCompareLimit: bulkSafeCountLimit('compare'),
                  migratedStandardCount: normalizeBulkState({ schemaVersion: 4, mode: 'compare', depth: 'standard', count: 6 }).count,
                  preservedCustomCount: normalizeBulkState({ schemaVersion: 4, mode: 'compare', depth: 'standard', count: 7 }).count,
                  finalizationStages,
                  asyncPlanReady: Boolean(asyncSummary.draftPlan),
                  asyncPriorityCount: asyncSummary.priority.length,
                  asyncWarnings: asyncSummary.finalizationWarnings,
                  error: state.bulk.error,
                };
              }
            """)
            assert_true(not bulk_errors, f"Bulk simulator page errors: {bulk_errors}")
            assert_true(bulk_result["before"] == bulk_result["after"], "Bulk simulation did not restore the active draft state")
            assert_true(bulk_result["traceLength"] == 192 and bulk_result["replayLength"] == 192, "Compact pick trace did not preserve a complete 12-team draft")
            assert_true(bulk_result["exportPickCount"] == 192 and bulk_result["allPicksCsvRows"] == 193, "Replay/export reconstruction lost pick records")
            assert_true(bulk_result["expandedStored"] is False, "Bulk run retained expanded all-pick objects")
            assert_true(bulk_result["userPickCount"] == 16, "Bulk run lost user roster picks")
            assert_true(bulk_result["maxAvailability"] <= 12, "Quick mode retained an oversized availability sample")
            assert_true(bulk_result["compactRoster"] is True, "Bulk run retained oversized player objects")
            assert_true(bulk_result["workerTimeout"] == 4000, "Worker fallback timeout is not bounded")
            assert_true(bulk_result["safeCompareLimit"] >= 25, "Compare mode safety cap blocks the Standard high-confidence preset")
            assert_true(bulk_result["migratedStandardCount"] == 25, "Legacy Standard preset did not migrate to 25 runs per strategy")
            assert_true(bulk_result["preservedCustomCount"] == 7, "Legacy custom simulation count was overwritten during migration")
            assert_true(bulk_result["asyncPlanReady"] is True and bulk_result["asyncPriorityCount"] > 0, "Non-blocking finalization did not produce a Draft Plan")
            assert_true(len(bulk_result["finalizationStages"]) == 4, "Draft Plan finalization did not expose all staged progress updates")
            bulk_page.close()
            checks.append("bulk simulator preserves complete drafts and finalizes the Draft Plan in browser-yielding stages")

            mobile, mobile_errors = load_page(browser, width=390, height=844)
            mobile.locator('[data-panel-tab="sleeper-lab"]').click()
            mobile.wait_for_timeout(250)
            overflow = mobile.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            assert_true(not mobile_errors, f"Mobile layout errors: {mobile_errors}")
            assert_true(overflow <= 1, f"Mobile layout creates document overflow: {overflow}px")
            assert_true(mobile.locator('[data-panel="sleeper-lab"]').is_visible(), "Sleeper Lab is not visible on mobile")
            mobile.close()
            checks.append("390px mobile layout has no document-level horizontal overflow")

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
