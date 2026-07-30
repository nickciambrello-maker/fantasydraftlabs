#!/usr/bin/env python3
"""End-to-end Chromium memory regression for Fantasy Draft Labs v1.5.3.

Exercises real candidate trials, a 50-run single strategy, and a 45-run Compare All
batch with the inline background season worker. Every workflow must reach rendered
results without unbounded heap growth.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

from browser_harness import inline_application, install_error_capture

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tests" / "simulator-memory-results.json"


def heap_mb(session: Any) -> float:
    metrics = {row["name"]: row["value"] for row in session.send("Performance.getMetrics")["metrics"]}
    return metrics.get("JSHeapUsedSize", 0) / 1024 / 1024


def wait_for_candidate(page: Any, session: Any) -> tuple[dict[str, Any], float]:
    peak = 0.0
    for _ in range(360):
        status = page.evaluate("() => ({status: state.candidateOutcome.status, progress: state.candidateOutcome.progress, total: state.candidateOutcome.total, depth: INTERNAL_SIMULATION_DEPTH})")
        peak = max(peak, heap_mb(session))
        if status["status"] in {"ready", "fallback", "failed"}:
            return status, peak
        page.wait_for_timeout(250)
    raise AssertionError("Candidate outcome simulations did not finish")


def run_bulk(page: Any, session: Any, mode: str, count: int) -> tuple[dict[str, Any], float]:
    page.evaluate(
        """({mode, count}) => {
          document.getElementById('bulkModeSelect').value = mode;
          document.getElementById('bulkDepthSelect').value = 'standard';
          document.getElementById('bulkCountInput').value = String(count);
          document.getElementById('bulkStrategySelect').value = 'balanced';
          startBulkSimulations();
        }""",
        {"mode": mode, "count": count},
    )
    peak = 0.0
    for _ in range(2400):
        status = page.evaluate("() => ({running: state.bulk.running, phase: state.bulk.phase, progress: state.bulk.progress, total: state.bulk.total, error: state.bulk.error, resultCount: state.bulk.results?.summary?.totalRuns || 0, rendered: document.getElementById('bulkResults')?.textContent?.includes('Simulator Calibration Center') || false, workerMode: BULK_SEASON_WORKER_MODE})")
        peak = max(peak, heap_mb(session))
        if not status["running"]:
            return status, peak
        page.wait_for_timeout(250)
    raise AssertionError(f"Bulk simulator did not finish: {mode} x {count}")


def run() -> dict[str, Any]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            # Automatic candidate decision trials must not populate simulation caches.
            candidate_page = browser.new_page(viewport={"width": 1440, "height": 1000})
            candidate_errors = install_error_capture(candidate_page)
            candidate_session = candidate_page.context.new_cdp_session(candidate_page)
            candidate_session.send("Performance.enable")
            candidate_html = inline_application().replace(
                "window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS = true;",
                "window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS = false;",
            )
            candidate_page.set_content(candidate_html, wait_until="load", timeout=120_000)
            candidate, candidate_peak = wait_for_candidate(candidate_page, candidate_session)
            candidate_cache = candidate_page.evaluate("() => ({survival: SURVIVAL_ANALYSIS_CACHE.size, depth: INTERNAL_SIMULATION_DEPTH, identifierLength: currentDraftStateIdentifier().length})")
            assert candidate["status"] == "ready", candidate
            assert not candidate_errors, candidate_errors
            assert candidate_peak < 150, candidate_peak
            assert candidate_cache["depth"] == 0, candidate_cache
            assert candidate_cache["identifierLength"] < 90, candidate_cache
            candidate_page.close()

            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            errors = install_error_capture(page)
            session = page.context.new_cdp_session(page)
            session.send("Performance.enable")
            page.set_content(inline_application(), wait_until="load", timeout=120_000)
            page.wait_for_timeout(1000)

            single, single_peak = run_bulk(page, session, "single", 50)
            assert single["resultCount"] == 50 and single["rendered"] and not single["error"], single
            assert single_peak < 180, single_peak

            compare, compare_peak = run_bulk(page, session, "compare", 5)
            assert compare["resultCount"] == 45 and compare["rendered"] and not compare["error"], compare
            assert compare_peak < 190, compare_peak
            assert compare["workerMode"] == "background", compare
            assert not errors, errors

            return {
                "status": "passed",
                "candidateTrials": candidate["total"],
                "candidatePeakHeapMb": round(candidate_peak, 1),
                "singleRuns": single["resultCount"],
                "singlePeakHeapMb": round(single_peak, 1),
                "compareAllRuns": compare["resultCount"],
                "compareAllPeakHeapMb": round(compare_peak, 1),
                "canonicalAppAssets": ["app.js", "styles.css"],
            }
        finally:
            browser.close()


if __name__ == "__main__":
    result = run()
    RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
