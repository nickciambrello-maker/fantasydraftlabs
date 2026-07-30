#!/usr/bin/env python3
"""Regression coverage for Draft Room candidate-analysis recovery in v1.5.0."""
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tests" / "draft-room-recovery-results.json"


def inline_application() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="./styles.css?v=153" />', f"<style>{css}</style>")
    storage = """
<script>
(() => {
  const data = new Map();
  const storage = {
    getItem(key) { key = String(key); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    clear() { data.clear(); },
    key(index) { return [...data.keys()][index] ?? null; },
    get length() { return data.size; }
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
})();
</script>
"""
    replacements = [
        ("./data/historical-adp-data.js?v=153", "data/historical-adp-data.js", storage),
        ("./sleeper-model.js?v=153", "sleeper-model.js", ""),
        ("./app.js?v=153", "app.js", ""),
        ("./sleeper-lab.js?v=153", "sleeper-lab.js", ""),
    ]
    for src, file_name, prefix in replacements:
        js = (ROOT / file_name).read_text(encoding="utf-8").replace("</script>", "<\\/script>")
        html = html.replace(f'<script src="{src}"></script>', f"{prefix}<script>{js}</script>")
    return html


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run() -> dict[str, object]:
    checks: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        try:
            page.set_content(inline_application(), wait_until="load", timeout=120_000)
            page.wait_for_function(
                "state.candidateOutcome.status === 'ready' || state.candidateOutcome.status === 'fallback'",
                timeout=120_000,
            )
            assert_true(state := page.evaluate("state.candidateOutcome.status"), "Candidate state unavailable")
            assert_true(state == "ready", f"Initial Draft Room analysis did not become ready: {state}")

            queued = page.evaluate("""
              () => {
                CANDIDATE_OUTCOME_RUN_TOKEN += 1;
                state.candidateOutcome = {status:'idle', key:'', results:[], error:'', progress:0, total:0};
                state.bulk.running = true;
                state.bulk.phase = 'simulating';
                state.bulk.progress = 10;
                state.bulk.total = 25;
                renderRecommendations();
                return {
                  candidate: state.candidateOutcome.status,
                  bulkRunning: state.bulk.running,
                  header: document.getElementById('recommendationStatus').textContent,
                  text: document.getElementById('decisionCenter').textContent
                };
              }
            """)
            assert_true(queued["candidate"] == "queued", f"Active bulk analysis did not queue Draft Room analysis: {queued}")
            assert_true(queued["bulkRunning"] is True and queued["header"] == "Board ready", f"Queued state mislabeled: {queued}")
            assert_true("Advanced comparison queued" in queued["text"] and "Primary recommendation" in queued["text"], f"Queued explanation missing: {queued}")
            checks.append("active Bulk Simulator work queues only the advanced layer while the core recommendation stays usable")

            page.evaluate("""
              () => {
                state.bulk.running = false;
                state.bulk.phase = 'idle';
                state.bulk.progress = 25;
                renderRecommendations();
              }
            """)
            page.wait_for_function("state.candidateOutcome.status === 'ready'", timeout=120_000)
            resumed = page.evaluate("""
              () => ({
                candidate: state.candidateOutcome.status,
                results: state.candidateOutcome.results.length,
                header: document.getElementById('recommendationStatus').textContent,
                text: document.getElementById('decisionCenter').textContent
              })
            """)
            assert_true(resumed["results"] >= 2 and "Primary recommendation" in resumed["text"], f"Queued analysis did not resume: {resumed}")
            checks.append("queued candidate analysis automatically resumes and renders a full recommendation")

            page.evaluate("""
              () => {
                CANDIDATE_OUTCOME_RUN_TOKEN += 1;
                CANDIDATE_OUTCOME_CACHE.clear();
                state.candidateOutcome = {status:'idle', key:'', results:[], error:'', progress:0, total:0};
                state.bulk.running = true;
                state.bulk.phase = 'idle';
                state.bulk.phaseMessage = '';
                renderRecommendations();
              }
            """)
            page.wait_for_function("state.candidateOutcome.status === 'ready'", timeout=120_000)
            recovered = page.evaluate("""
              () => ({
                bulkRunning: state.bulk.running,
                phase: state.bulk.phase,
                candidate: state.candidateOutcome.status,
                results: state.candidateOutcome.results.length,
                text: document.getElementById('decisionCenter').textContent
              })
            """)
            assert_true(recovered["bulkRunning"] is False and recovered["phase"] == "idle", f"Stale bulk flag was not recovered: {recovered}")
            assert_true(recovered["results"] >= 2 and "Primary recommendation" in recovered["text"], f"Recovered Draft Room did not load: {recovered}")
            checks.append("stale simulator-running flags are cleared and Draft Room analysis restarts")

            page.evaluate("""
              () => {
                state.candidateOutcome = {status:'fallback', key:candidateOutcomeModelKey(), inputFingerprint:candidateAnalysisInputFingerprint(), results:[], error:'Injected candidate failure.', retryAfter:Date.now()+10000};
                renderRecommendations();
              }
            """)
            fallback = page.evaluate("""
              () => ({
                retry: document.querySelectorAll('[data-retry-candidate-analysis]').length,
                text: document.getElementById('decisionCenter').textContent
              })
            """)
            assert_true(fallback["retry"] == 1 and "Injected candidate failure" in fallback["text"], f"Fallback is not recoverable: {fallback}")
            checks.append("failed candidate analysis exposes its reason and a retry control")

            assert_true(not errors, f"Browser errors: {errors}")
            return {"status": "passed", "checkCount": len(checks), "checks": checks}
        finally:
            browser.close()


if __name__ == "__main__":
    try:
        result = run()
        RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"draft_room_recovery_harness.py: {result['checkCount']} checks passed")
        for check in result["checks"]:
            print(f"  PASS: {check}")
    except Exception as exc:
        RESULT_PATH.write_text(json.dumps({"status": "failed", "error": str(exc)}, indent=2) + "\n", encoding="utf-8")
        print(f"draft_room_recovery_harness.py: FAILED: {exc}")
        raise
