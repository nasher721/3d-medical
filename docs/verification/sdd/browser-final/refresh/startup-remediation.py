"""Independent fresh-process readiness and post-ready timing; original evidence retained."""
import hashlib
import json
import pathlib
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]

def hashes():
    paths = sorted((ROOT / 'src').glob('*.js')) + sorted(p for p in (ROOT / 'dist').rglob('*') if p.is_file())
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}

report = {'sourceBuildBefore': hashes(), 'cases': []}
with sync_playwright() as p:
    for w, h in [(1440, 900), (390, 844)]:
        browser = p.chromium.launch(headless=True, args=['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'])
        try:
            page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.add_init_script(path=str(HERE / 'probes.js'))
            page.add_init_script("""(() => {
                const s = window.__startup = {frames: [], readyAt: null, start: performance.now(), done: false};
                const watch = t => {
                    const main = document.querySelector('main');
                    const ready = !!document.querySelector('#scene-loader[hidden]');
                    if (ready && s.readyAt === null) s.readyAt = performance.now();
                    s.frames.push({t, ready, elapsed: document.querySelector('#elapsed')?.textContent,
                        status: document.querySelector('#live-status')?.textContent,
                        mainInert: main?.inert, busy: main?.getAttribute('aria-busy'),
                        headerInert: document.querySelector('.app-header')?.inert,
                        playDisabled: document.querySelector('#play-button')?.disabled,
                        errorVisible: document.querySelector('#startup-error')?.hidden === false});
                    if ((s.readyAt !== null && t - s.readyAt >= 8000) || t - s.start >= 30000) s.done = true;
                    else requestAnimationFrame(watch);
                };
                requestAnimationFrame(watch);
            })();""")
            page.goto('http://127.0.0.1:5199/', wait_until='domcontentloaded')
            readiness_error = None
            try:
                page.wait_for_selector('#scene-loader[hidden]', state='attached', timeout=30000)
                page.wait_for_function('window.__startup.done', timeout=15000)
            except Exception as exc:
                readiness_error = str(exc)
            data = page.evaluate('({startup:window.__startup,draws:window.__finalQA.draws,display:window.__finalQA.mutations,device:window.__finalQA.device()})')
            data.update(viewport={'width': w, 'height': h}, errors=errors, readinessError=readiness_error)
            ready = data['startup']['readyAt']
            def gaps(times):
                return [b-a for a,b in zip(times,times[1:])]
            if ready is not None:
                data['postReadyDrawIntervals'] = {k: gaps([t for t in ts if t >= ready]) for k,ts in data['draws'].items()}
                data['postReadyDisplayIntervals'] = gaps([t for t in data['display'] if t >= ready])
                data['maxDisplayMs'] = max(data['postReadyDisplayIntervals'], default=0)
                data['maxCanvasMs'] = max([n for ns in data['postReadyDrawIntervals'].values() for n in ns], default=0)
                loading = [f for f in data['startup']['frames'] if not f['ready'] and f.get('elapsed') is not None]
                data['loadingSemanticsPass'] = bool(loading) and all(f['elapsed'] == '00:00' and f['status'] == 'Loading' and f['mainInert'] and f['headerInert'] and f['busy'] == 'true' and f['playDisabled'] for f in loading)
                data['observedPostReadyMs'] = data['startup']['frames'][-1]['t'] - ready
                data['cadencePass'] = data['maxDisplayMs'] <= 250 and data['maxCanvasMs'] <= 250
            report['cases'].append(data)
            print(json.dumps({k: data.get(k) for k in ['viewport','maxDisplayMs','maxCanvasMs','loadingSemanticsPass','observedPostReadyMs','cadencePass','readinessError']}), 'readyAt', ready, flush=True)
            (HERE / 'startup-remediation-report.json').write_text(json.dumps(report, indent=2) + '\n')
        finally:
            browser.close()
report['sourceBuildAfter'] = hashes()
report['sourceBuildStable'] = report['sourceBuildBefore'] == report['sourceBuildAfter']
report['pass'] = report['sourceBuildStable'] and all(c.get('cadencePass') and c.get('loadingSemanticsPass') and not c['errors'] and not c['readinessError'] for c in report['cases'])
(HERE / 'startup-remediation-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS', report['pass'], 'sourceBuildStable', report['sourceBuildStable'], flush=True)
