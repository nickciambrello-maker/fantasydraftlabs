#!/usr/bin/env python3
"""Regression coverage for progressive/bounded Draft Room analysis in v1.5.0."""
from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "tests" / "draft-room-progressive-results.json"


def app_html(*, prelude: str = "", patch_before_init: str = "") -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="./styles.css?v=153" />', f"<style>{css}</style>")
    storage = f"""
<script>
(() => {{
  const data = new Map();
  const storage = {{
    getItem(key) {{ key = String(key); return data.has(key) ? data.get(key) : null; }},
    setItem(key, value) {{ data.set(String(key), String(value)); }},
    removeItem(key) {{ data.delete(String(key)); }},
    clear() {{ data.clear(); }},
    key(index) {{ return [...data.keys()][index] ?? null; }},
    get length() {{ return data.size; }}
  }};
  Object.defineProperty(window, "localStorage", {{ configurable: true, value: storage }});
  {prelude}
}})();
</script>
"""
    app_js = (ROOT / "app.js").read_text(encoding="utf-8")
    if patch_before_init:
        marker = "\n\ninitializeLeagueProfiles();\n"
        assert marker in app_js
        app_js = app_js.replace(marker, f"\n{patch_before_init}\n{marker}", 1)
    replacements = [
        ("./data/historical-adp-data.js?v=153", "data/historical-adp-data.js", storage),
        ("./sleeper-model.js?v=153", "sleeper-model.js", ""),
        ("./app.js?v=153", None, ""),
        ("./sleeper-lab.js?v=153", "sleeper-lab.js", ""),
    ]
    for src, file_name, prefix in replacements:
        js = app_js if file_name is None else (ROOT / file_name).read_text(encoding="utf-8")
        js = js.replace("</script>", "<\\/script>")
        html = html.replace(f'<script src="{src}"></script>', f"{prefix}<script>{js}</script>")
    return html


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def new_page(browser):
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    return page, errors


def run() -> dict[str, object]:
    checks: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            # 1. A tight live-decision budget must still produce a usable result rather than a blank spinner.
            page, errors = new_page(browser)
            page.set_content(app_html(prelude="window.__FDL_CANDIDATE_ANALYSIS_BUDGET_MS = 300; window.__FDL_CANDIDATE_SEASON_SAMPLES = 4;"), wait_until="load", timeout=120_000)
            page.wait_for_function("state.candidateOutcome.status === 'ready' || state.candidateOutcome.status === 'fallback'", timeout=120_000)
            bounded = page.evaluate("""() => ({
              status: state.candidateOutcome.status,
              partial: !!state.candidateOutcome.partial,
              progress: state.candidateOutcome.progress,
              total: state.candidateOutcome.total,
              results: state.candidateOutcome.results.length,
              header: document.getElementById('recommendationStatus').textContent,
              text: document.getElementById('decisionCenter').textContent
            })""")
            assert_true(bounded["status"] == "ready" and bounded["partial"] and bounded["results"] >= 2, f"Bounded result failed: {bounded}")
            assert_true(bounded["progress"] < bounded["total"] and "Bounded live comparison" in bounded["text"], f"Bounded explanation missing: {bounded}")
            assert_true("Calculating candidate outcomes" not in bounded["text"], f"Spinner remained after bounded completion: {bounded}")
            assert_true(not errors, f"Browser errors in bounded path: {errors}")
            checks.append("a bounded live-decision budget renders a usable recommendation instead of remaining on the spinner")
            page.close()

            # 2. A stress-path exception after all candidates have baseline evidence must retain the provisional result.
            patch = """
const __v150OriginalTrialForFailureTest = simulateCandidateTrial;
let __v150FailureTrialCount = 0;
simulateCandidateTrial = function(...args) {
  __v150FailureTrialCount += 1;
  if (__v150FailureTrialCount === 9) throw new Error('Injected stress-path failure at trial 9.');
  return __v150OriginalTrialForFailureTest(...args);
};
"""
            page, errors = new_page(browser)
            page.set_content(app_html(prelude="window.__FDL_CANDIDATE_ANALYSIS_BUDGET_MS = 60000; window.__FDL_CANDIDATE_SEASON_SAMPLES = 4;", patch_before_init=patch), wait_until="load", timeout=120_000)
            page.wait_for_function("state.candidateOutcome.status === 'ready' || state.candidateOutcome.status === 'fallback'", timeout=120_000)
            failed_path = page.evaluate("""() => ({
              status: state.candidateOutcome.status,
              partial: !!state.candidateOutcome.partial,
              progress: state.candidateOutcome.progress,
              results: state.candidateOutcome.results.length,
              error: state.candidateOutcome.error,
              text: document.getElementById('decisionCenter').textContent
            })""")
            assert_true(failed_path["status"] == "ready" and failed_path["partial"] and failed_path["results"] >= 2, f"Provisional failure recovery failed: {failed_path}")
            assert_true(failed_path["progress"] == 8 and "trial 9" in failed_path["error"], f"Failure was not reported accurately: {failed_path}")
            assert_true("Primary recommendation" in failed_path["text"] and "Calculating candidate outcomes" not in failed_path["text"], f"Failure left blank decision UI: {failed_path}")
            assert_true(not errors, f"Browser errors in stress failure path: {errors}")
            checks.append("a failed later stress path preserves the completed provisional recommendation")
            page.close()

            # 3. Input drift during refinement must restart cleanly rather than leave stale progress DOM.
            patch = """
const __v150OriginalTrialForDriftTest = simulateCandidateTrial;
window.__v150DriftTrialCount = 0;
window.__v150DriftInjected = false;
simulateCandidateTrial = function(...args) {
  const value = __v150OriginalTrialForDriftTest(...args);
  window.__v150DriftTrialCount += 1;
  if (!window.__v150DriftInjected && window.__v150DriftTrialCount === 9) {
    window.__v150DriftInjected = true;
    state.rankingSourceWeights.__drift_test__ = 1;
  }
  return value;
};
"""
            page, errors = new_page(browser)
            page.set_content(app_html(prelude="window.__FDL_CANDIDATE_ANALYSIS_BUDGET_MS = 60000; window.__FDL_CANDIDATE_SEASON_SAMPLES = 4;", patch_before_init=patch), wait_until="load", timeout=120_000)
            page.wait_for_function("window.__v150DriftInjected === true", timeout=120_000)
            page.wait_for_function("state.candidateOutcome.status === 'ready'", timeout=120_000)
            drift = page.evaluate("""() => ({
              status: state.candidateOutcome.status,
              progress: state.candidateOutcome.progress,
              total: state.candidateOutcome.total,
              results: state.candidateOutcome.results.length,
              text: document.getElementById('decisionCenter').textContent,
              injected: window.__v150DriftInjected,
              trialCount: window.__v150DriftTrialCount
            })""")
            assert_true(drift["injected"] and drift["status"] == "ready" and drift["results"] >= 2, f"Input-drift restart failed: {drift}")
            assert_true("Calculating candidate outcomes" not in drift["text"] and "Primary recommendation" in drift["text"], f"Input drift left stale spinner: {drift}")
            assert_true(drift["trialCount"] > 16, f"Analysis did not restart after drift: {drift}")
            assert_true(not errors, f"Browser errors in drift path: {errors}")
            checks.append("an input change during refinement restarts automatically and cannot leave a stale 18/40 screen")
            page.close()

            return {"status": "passed", "checkCount": len(checks), "checks": checks}
        finally:
            browser.close()


if __name__ == "__main__":
    try:
        result = run()
        RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"draft_room_progressive_harness.py: {result['checkCount']} checks passed")
        for check in result["checks"]:
            print(f"  PASS: {check}")
    except Exception as exc:
        RESULT_PATH.write_text(json.dumps({"status": "failed", "error": str(exc)}, indent=2) + "\n", encoding="utf-8")
        print(f"draft_room_progressive_harness.py: FAILED: {exc}")
        raise
