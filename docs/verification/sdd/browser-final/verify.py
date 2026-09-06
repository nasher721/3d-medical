"""Isolated real-browser QA. Default only proves setup; --run-final executes matrix."""
import argparse
import hashlib
import json
import pathlib
import platform
import statistics
import time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--run-final', action='store_true')
parser.add_argument('--url', default='http://localhost:5188/')
parser.add_argument('--fps-seconds', type=float, default=5)
parser.add_argument('--fps-runs', type=int, default=3)
args = parser.parse_args()


def hashes():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / 'src').glob('*')) if p.is_file()}


def build_hashes():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / 'dist').rglob('*')) if p.is_file()}


def save(name, data):
    (HERE / name).write_text(json.dumps(data, indent=2))


def pause(page):
    if page.locator('#play-button').get_attribute('aria-label') == 'Pause simulation':
        page.locator('#play-button').click()


def resume(page):
    if page.locator('#play-button').get_attribute('aria-label') == 'Play simulation':
        page.locator('#play-button').click()


def close_dialog(page):
    if page.locator('#dialog').evaluate('(e) => e.open'):
        page.locator('[data-action="close-dialog"]').click()


def export_json(page, name):
    close_dialog(page)
    page.locator('[data-action="export"]').click()
    with page.expect_download() as event:
        page.locator('[data-action="download-json"]').click()
    download = event.value
    download.save_as(str(HERE / name))
    data = json.loads((HERE / name).read_text())
    close_dialog(page)
    return data


def set_value(page, key, value):
    field = page.locator(f'input[type="number"][data-intervention="{key}"]')
    field.fill(str(value))
    field.press('Tab')


def numeric_settings(page):
    return page.locator('#intervention-controls input[type="number"]').evaluate_all(
        '(es) => Object.fromEntries(es.map(e => [e.dataset.intervention, e.value]))')


report = {'phase': 'final' if args.run_final else 'setup-only',
          'startedUTC': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
          'host': {'platform': platform.platform(), 'machine': platform.machine(),
                   'processor': platform.processor(), 'python': platform.python_version()},
          'sourceBefore': hashes(), 'buildBefore': build_hashes(), 'url': args.url,
          'errors': [], 'consoleErrors': [], 'requestFailures': [],
          'cases': [], 'fpsTarget': None,
          'scope': 'Isolated headless Chromium with SwiftShader on this host; not native Chrome/GPU or clinical validation.'}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=[
        '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'])
    report['browserVersion'] = browser.version
    try:
        for width, height in ([(1440, 900), (390, 844)] if args.run_final else [(1440, 900)]):
            context = browser.new_context(viewport={'width': width, 'height': height},
                                          device_scale_factor=1, accept_downloads=True)
            page = context.new_page()
            page.add_init_script(path=str(HERE / 'probes.js'))
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('console', lambda e: report['consoleErrors'].append(e.text) if e.type == 'error' else None)
            page.on('requestfailed', lambda r: report['requestFailures'].append({'url': r.url, 'failure': r.failure}))
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_selector('#scene-loader[hidden]', state='attached')
            report.setdefault('devices', []).append(page.evaluate('window.__finalQA.device()'))
            if not args.run_final:
                report['setupReady'] = page.locator('[data-monitor="starling"]').count() == 1
                context.close()
                continue
            size = f'{width}x{height}'
            page.wait_for_function('window.__finalQA.coldStart !== null')
            report.setdefault('coldStart', {})[size] = page.evaluate('window.__finalQA.coldStart')
            print('COLD START', size, report['coldStart'][size]['fps'], flush=True)
            for organ in ['whole', 'brain', 'lungs', 'kidneys']:
                page.locator(f'.organ-nav [data-organ="{organ}"]').click()
                resume(page)
                page.wait_for_timeout(700)
                case = {'viewport': size, 'organ': organ, 'fpsRuns': []}
                for _ in range(args.fps_runs):
                    case['fpsRuns'].append(page.evaluate('(ms) => window.__finalQA.fps(ms)', args.fps_seconds * 1000))
                rates = [r['fps'] for r in case['fpsRuns']]
                case['fpsSummary'] = {'mean': statistics.mean(rates), 'min': min(rates),
                                      'max': max(rates), 'sampleStdDev': statistics.stdev(rates) if len(rates) > 1 else None}
                pause(page)
                page.wait_for_timeout(150)
                page.screenshot(path=str(HERE / f'{organ}-{size}-opaque.png'), full_page=True)
                case['labels'] = page.locator('#organ-labels').inner_text()
                case['labelNames'] = page.locator('#organ-labels [data-label]').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
                case['overflow'] = page.evaluate('({document:document.documentElement.scrollWidth,viewport:innerWidth})')
                if organ != 'whole':
                    page.locator('[data-action="display"]').click()
                    opacity = page.locator(f'input[type="number"][data-opacity="{organ}"]')
                    opacity.fill('0.35'); opacity.press('Tab')
                    case['opacityValues'] = page.locator('input[type="number"][data-opacity]').evaluate_all(
                        '(es) => Object.fromEntries(es.map(e => [e.dataset.opacity,e.value]))')
                    assert float(case['opacityValues'][organ]) == .35
                    assert all(float(v) == 1 for k, v in case['opacityValues'].items() if k != organ)
                    close_dialog(page)
                    page.screenshot(path=str(HERE / f'{organ}-{size}-transparent.png'), full_page=True)
                    if page.locator('.anatomy-key').count():
                        page.locator('.anatomy-key').evaluate('(e)=>e.open=true')
                        page.screenshot(path=str(HERE / f'{organ}-{size}-key-open.png'), full_page=True)
                        case['keyScroll'] = page.locator('.anatomy-key-list').evaluate('(e)=>({height:e.clientHeight,scrollHeight:e.scrollHeight})')
                        if width < 600:
                            page.locator('.anatomy-key').evaluate('(e)=>e.open=false')
                    page.locator('[data-action="display"]').click()
                    opacity = page.locator(f'input[type="number"][data-opacity="{organ}"]')
                    opacity.fill('1'); opacity.press('Tab'); close_dialog(page)
                case['device'] = page.evaluate('window.__finalQA.device()')
                assert case['device']['glError'] == 0
                report['cases'].append(case)
                print('CASE', size, organ, json.dumps(case['fpsSummary']), flush=True)
                save('final-report.json', report)
            for mode in ['waveforms', 'trends', 'pv', 'starling', 'ventilator', 'perfusion']:
                page.locator(f'[data-monitor="{mode}"]').click()
                resume(page)
                page.evaluate('window.__finalQA.draws = {}; window.__finalQA.mutations=[]')
                page.wait_for_timeout(2500)
                cadence = page.evaluate('window.__finalQA.cadence()')
                display = page.evaluate('window.__finalQA.mutations')
                display_gaps = [b-a for a,b in zip(display,display[1:])]
                pause(page); page.wait_for_timeout(150)
                before = page.evaluate('window.__finalQA.snapshot()')
                page.wait_for_timeout(700)
                after = page.evaluate('window.__finalQA.snapshot()')
                result = {'viewport': size, 'mode': mode, 'cadence': cadence,
                          'displayIntervalsMs': display_gaps,
                          'maxDisplayMs': max(display_gaps) if display_gaps else None,
                          'pausedStable': before == after,
                          'text': page.locator('#monitors').inner_text()}
                report.setdefault('monitors', []).append(result)
                violations = {k:v['maxMs'] for k,v in cadence.items() if v['maxMs'] and v['maxMs']>250}
                result['cadenceViolationsOver250ms'] = violations
                print('MONITOR', size, mode, 'cadence violations', violations, 'max display',result['maxDisplayMs'],flush=True)
                assert before == after, f'Paused output changed: {size} {mode}'
                page.locator('.bedside').screenshot(path=str(HERE / f'{mode}-{size}.png'))
            page.locator('[data-tab="vasoactive"]').click()
            for key, value in {'norepinephrine': .27, 'dobutamine': 7, 'epinephrine': .61,
                               'phenylephrine': .13, 'vasopressin': .89}.items():
                set_value(page, key, value)
            before = numeric_settings(page)
            set_value(page, 'epinephrine', '')
            assert numeric_settings(page) == before
            report.setdefault('inputFeedback', {})[size] = page.locator('#toast').inner_text()
            pause(page)
            saved = export_json(page, f'saved-{size}.json')
            page.locator('[data-action="export"]').click()
            page.locator('[data-action="save-local"]').click(); close_dialog(page)
            page.locator('[data-action="restart"]:visible,[data-action="reset"]:visible').first.click(); pause(page)
            reset = export_json(page, f'reset-{size}.json')
            page.locator('[data-action="export"]').click()
            page.locator('[data-action="load-local"]').click()
            restored = export_json(page, f'restored-{size}.json')
            assert saved['interventions'] == restored['interventions']
            assert saved['patient'] == restored['patient']
            report.setdefault('persistence', {})[size] = {'roundTrip': True,
                'resetInterventions': reset['interventions'], 'resetVisual': reset.get('visual')}
            context.close()
        assert not report['errors'], report['errors']
        assert not report['consoleErrors'], report['consoleErrors']
        assert not report['requestFailures'], report['requestFailures']
    except Exception as exc:
        report['failure'] = str(exc)
        raise
    finally:
        report['sourceAfter'] = hashes()
        report['sourceStable'] = report['sourceBefore'] == report['sourceAfter']
        report['buildAfter'] = build_hashes()
        report['buildStable'] = report['buildBefore'] == report['buildAfter']
        save('final-report.json' if args.run_final else 'setup-report.json', report)
        browser.close()
