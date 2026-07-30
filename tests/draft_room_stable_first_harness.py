#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULT = ROOT / 'tests' / 'draft-room-stable-first-results.json'


def inline_application(disable_auto: bool = True) -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="./styles.css?v=153" />', f'<style>{css}</style>')
    shim = f'''<script>(() => {{
      const data = new Map();
      Object.defineProperty(window, 'localStorage', {{ configurable: true, value: {{
        getItem(k) {{ return data.has(String(k)) ? data.get(String(k)) : null; }},
        setItem(k,v) {{ data.set(String(k), String(v)); }}, removeItem(k) {{ data.delete(String(k)); }},
        clear() {{ data.clear(); }}, key(i) {{ return [...data.keys()][i] ?? null; }}, get length() {{ return data.size; }}
      }} }});
      window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS = {str(disable_auto).lower()};
    }})();</script>'''
    scripts = [
        ('./data/historical-adp-data.js?v=153', 'data/historical-adp-data.js', shim),
        ('./sleeper-model.js?v=153', 'sleeper-model.js', ''),
        ('./app.js?v=153', 'app.js', ''),
        ('./sleeper-lab.js?v=153', 'sleeper-lab.js', ''),
    ]
    for src, file_name, prefix in scripts:
        js = (ROOT / file_name).read_text(encoding='utf-8').replace('</script>', '<\\/script>')
        html = html.replace(f'<script src="{src}"></script>', f'{prefix}<script>{js}</script>')
    return html


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)


def run():
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1500, 'height': 1000})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(inline_application(True), wait_until='load')
        page.wait_for_timeout(300)
        state = page.evaluate('''() => ({
          header: document.getElementById('recommendationStatus')?.textContent,
          hero: !!document.querySelector('#decisionCenter .decision-hero'),
          empty: !!document.querySelector('#decisionCenter .decision-empty'),
          title: document.querySelector('#decisionCenter .decision-title-row h2')?.textContent,
          retry: !!document.querySelector('#decisionCenter [data-retry-candidate-analysis]'),
          centerText: document.getElementById('decisionCenter')?.innerText,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        })''')
        check(state['hero'], f"Core hero missing when advanced analysis is disabled: {state}")
        check(not state['empty'], f"Broken decision-empty fallback rendered: {state}")
        check(state['header'] == 'Board ready', f"Unexpected core status: {state}")
        check(state['title'], f"Recommendation title missing: {state}")
        check(state['overflow'] <= 1, f"Document overflow introduced: {state}")
        checks.append('core recommendation preserves the full Decision Center design when advanced analysis does not start')

        page.evaluate('''() => {
          window.__FDL_BROWSER_TEST_DISABLE_AUTO_SIMULATIONS = false;
          const original = simulateCandidateTrial;
          window.__FDL_ORIGINAL_SIMULATE_CANDIDATE_TRIAL = original;
          simulateCandidateTrial = function () { throw new Error('Injected advanced-path failure'); };
        }''')
        page.click('[data-retry-candidate-analysis]') if page.locator('[data-retry-candidate-analysis]').count() else page.evaluate('resetCandidateOutcomeForRetry()')
        page.wait_for_timeout(500)
        failed = page.evaluate('''() => ({
          status: state.candidateOutcome.status,
          header: document.getElementById('recommendationStatus')?.textContent,
          hero: !!document.querySelector('#decisionCenter .decision-hero'),
          empty: !!document.querySelector('#decisionCenter .decision-empty'),
          retry: !!document.querySelector('#decisionCenter [data-retry-candidate-analysis]'),
          text: document.getElementById('decisionCenter')?.innerText
        })''')
        check(failed['status'] == 'fallback', f"Failure was not captured: {failed}")
        check(failed['hero'] and not failed['empty'], f"Advanced failure replaced the core design: {failed}")
        check(failed['header'] == 'Board ready', f"Advanced failure changed primary status: {failed}")
        check(failed['retry'], f"Retry control missing after advanced failure: {failed}")
        checks.append('an advanced-path failure leaves the complete board-based recommendation and retry as a secondary control')

        page.evaluate('''() => {
          simulateCandidateTrial = window.__FDL_ORIGINAL_SIMULATE_CANDIDATE_TRIAL;
          window.__FDL_CANDIDATE_ANALYSIS_BUDGET_MS = 500;
          window.__FDL_CANDIDATE_SEASON_SAMPLES = 4;
          resetCandidateOutcomeForRetry();
        }''')
        page.wait_for_function("['ready','refining'].includes(state.candidateOutcome.status)", timeout=30000)
        ready = page.evaluate('''() => ({
          status: state.candidateOutcome.status,
          results: state.candidateOutcome.results?.length || 0,
          hero: !!document.querySelector('#decisionCenter .decision-hero'),
          primary: document.querySelector('#decisionCenter .decision-title-row h2')?.textContent,
          empty: !!document.querySelector('#decisionCenter .decision-empty')
        })''')
        check(ready['results'] >= 2 and ready['hero'] and not ready['empty'], f"Advanced upgrade failed: {ready}")
        checks.append('successful advanced analysis upgrades the same stable Decision Center instead of swapping to a separate layout')

        check(not errors, f"Browser errors: {errors}")
        page.screenshot(path=str(ROOT / 'tests' / 'draft-room-stable-first.png'), full_page=False)
        browser.close()
    RESULT.write_text(json.dumps({'checks': checks}, indent=2), encoding='utf-8')
    return checks

if __name__ == '__main__':
    checks = run()
    print(f'draft_room_stable_first_harness.py: {len(checks)} checks passed')
    for c in checks:
        print('  PASS:', c)
