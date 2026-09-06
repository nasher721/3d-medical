import json, pathlib
from playwright.sync_api import sync_playwright
out=pathlib.Path(__file__).resolve().parent
results={}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
 errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto('http://localhost:5188/');page.wait_for_selector('[data-monitor="starling"]');page.wait_for_timeout(500)
 for mode in ['waveforms','trends','pv','starling','ventilator','perfusion']:
  page.locator('[data-monitor="'+mode+'"]').click();page.wait_for_timeout(200)
  assert page.locator('#monitors').get_attribute('aria-labelledby')=='monitor-'+mode
  page.locator('#play-button').click();page.wait_for_timeout(500)
  paused=page.locator('#monitors canvas').evaluate_all('(cs)=>cs.map(c=>c.toDataURL())')
  labels=page.locator('#monitors').inner_text();page.wait_for_timeout(350)
  assert page.locator('#monitors canvas').evaluate_all('(cs)=>cs.map(c=>c.toDataURL())')==paused,mode+' paused canvas changed'
  assert page.locator('#monitors').inner_text()==labels
  page.locator('.bedside').screenshot(path=str(out/(mode+'-desktop.png')))
  results[mode]={'pausePixelsStable':True,'text':labels}
  page.locator('#play-button').click()
 page.locator('[data-monitor="ventilator"]').click();page.locator('[data-tab="ventilation"]').click()
 results['inputs']=page.locator('#intervention-controls input').evaluate_all('(els)=>els.map(e=>({type:e.type,dataset:{...e.dataset}}))')
 # Change actual controls, then validate live plots and export downloads.
 for key,value in {'tidalVolume':8,'respiratoryRate':24,'peep':10,'fio2':60}.items():
  field=page.locator('input[type="number"][data-intervention="'+key+'"]');field.fill(str(value));field.press('Tab')
 page.wait_for_timeout(1500)
 assert 'VT 8 mL/kg PBW (560 mL)' in page.locator('[data-model-summary]').inner_text()
 assert 'RR 24/min' in page.locator('[data-model-summary]').inner_text()
 page.locator('[data-tab="vasoactive"]').click()
 agents={'norepinephrine':.2,'dobutamine':5,'epinephrine':.3,'phenylephrine':.4,'vasopressin':.5}
 for key,value in agents.items():
  field=page.locator('input[type="number"][data-intervention="'+key+'"]');field.fill(str(value));field.press('Tab')
 page.locator('#speed-select').select_option('5');page.wait_for_timeout(1600)
 page.locator('[data-action="baseline"]').click()
 page.locator('[data-action="export"]').click()
 for extension in ['json','csv']:
  with page.expect_download() as event: page.locator('[data-action="download-'+extension+'"]').click()
  event.value.save_as(str(out/('session.'+extension)))
 exported=json.loads((out/'session.json').read_text())
 assert exported['interventions']['vasoactive']==agents
 assert exported['interventions']['ventilator']['tidalVolume']==8
 assert len(exported['history'])>1 and exported['baseline'] is not None
 assert 'cerebralTerritories' in exported['metrics'] and 'calibration' in exported
 for name in ['renalPerfusion_mL_min','urineOutput_mL_h','airwayFlow_mL_s']: assert name in (out/'session.csv').read_text().splitlines()[0]
 results['export']={'fiveAgents':True,'completeDerivedValues':True,'historyRows':len(exported['history']),'calibration':exported['calibration']}
 page.locator('[data-action="close-dialog"]').click()
 page.locator('[data-action="restart"]').click();page.locator('#play-button').click();page.wait_for_timeout(500)
 assert 'Capture baseline' in page.locator('#baseline-button').inner_text()
 assert page.locator('#elapsed').inner_text()=='00:00'
 assert page.locator('#event-count').inner_text()=='0'
 page.locator('#import-file').set_input_files(str(out/'session.json'));page.wait_for_timeout(100)
 # Restoration is deliberately fresh; the plot model and control settings update.
 assert 'Capture baseline' in page.locator('#baseline-button').inner_text()
 assert page.locator('#elapsed').inner_text()=='00:00'
 for key,value in agents.items(): assert float(page.locator('input[type="number"][data-intervention="'+key+'"]') .input_value())==value
 results['restore']={'fiveAgents':True,'freshClock':True,'baselineCleared':True}
 if page.locator('#play-button').get_attribute('aria-label')=='Pause simulation':page.locator('#play-button').click()
 for mode in ['starling','ventilator','perfusion']:
  page.locator('[data-monitor="'+mode+'"]').click();page.wait_for_timeout(120)
  page.locator('.bedside').screenshot(path=str(out/(mode+'-desktop.png')))
 page.set_viewport_size({'width':390,'height':844})
 for mode in ['starling','ventilator','perfusion']:
  page.locator('[data-monitor="'+mode+'"]').click();page.wait_for_timeout(120)
  page.locator('.bedside').screenshot(path=str(out/(mode+'-narrow.png')))
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'horizontal overflow'
  results[mode]['narrowNoOverflow']=True
 results['errors']=errors;assert not errors,errors
 (out/'results.json').write_text(json.dumps(results,indent=2))
 browser.close()
