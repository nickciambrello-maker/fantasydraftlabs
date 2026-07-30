#!/usr/bin/env python3
"""Exact regression for the former 25/25 Bulk Simulator stall.

Forces the main-thread season fallback, runs 25 Balanced Value drafts, observes the
new finalization phases, and requires the Strategy comparison results to render.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

from browser_harness import inline_application, install_error_capture

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tests" / "simulator-fallback-results.json"


def run() -> dict[str, Any]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = browser.new_page(viewport={"width": 1536, "height": 1024})
            errors = install_error_capture(page)
            page.set_content(inline_application(), wait_until="load", timeout=120_000)
            page.wait_for_timeout(800)
            page.evaluate("() => { disposeSeasonSimulationWorker(); BULK_SEASON_WORKER_MODE = 'fallback'; seasonSimulationWorker = () => null; }")
            page.evaluate(
                """() => {
                  document.getElementById('bulkModeSelect').value = 'single';
                  document.getElementById('bulkDepthSelect').value = 'standard';
                  document.getElementById('bulkCountInput').value = '25';
                  document.getElementById('bulkStrategySelect').value = 'balanced';
                  startBulkSimulations();
                }"""
            )
            phases: list[str] = []
            status: dict[str, Any] = {}
            for _ in range(1200):
                status = page.evaluate(
                    """() => ({
                      running: state.bulk.running,
                      phase: state.bulk.phase,
                      progress: state.bulk.progress,
                      total: state.bulk.total,
                      resultCount: state.bulk.results?.summary?.totalRuns || 0,
                      error: state.bulk.error,
                      rendered: document.getElementById('bulkResults')?.textContent?.includes('Strategy comparison') || false,
                      progressText: document.getElementById('bulkProgressText')?.textContent || '',
                      workerMode: BULK_SEASON_WORKER_MODE
                    })"""
                )
                if status["phase"] not in phases:
                    phases.append(status["phase"])
                if not status["running"]:
                    break
                page.wait_for_timeout(100)
            assert not status.get("running"), status
            assert status.get("resultCount") == 25, status
            assert status.get("rendered"), status
            assert status.get("workerMode") == "fallback", status
            assert status.get("phase") == "idle", status
            assert "simulating" in phases and "analyzing" in phases and "idle" in phases, phases
            assert not errors, errors
            return {"status": "passed", "runs": status["resultCount"], "phases": phases, "workerMode": status["workerMode"]}
        finally:
            browser.close()


if __name__ == "__main__":
    result = run()
    RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
