"""Supplemental actual-build lifecycle/export and isolated zero-flow renderer checks."""
import copy, csv, hashlib, io, json, pathlib
from playwright.sync_api import sync_playwright
HERE=pathlib.Path(__file__).resolve().parent
URL='http://127.0.0.1:5199/'
report={'url':URL,'errors':[],'consoleErrors':[],'requestFailures':[],'viewports':{}}

def dialog_close(page):
    if page.locator('#dialog').evaluate('(e)=>e.open'):page.locator('[data-action="close-dialog"]').click()

def pause(page):
    if page.locator('#play-button').get_attribute('aria-label')=='Pause simulation':page.locator('#play-button').click()

def export(page,kind,name):
    dialog_close(page);page.locator('[data-action="export"]').click()
    with page.expect_download() as e:page.locator('[data-action="download-'+kind+'"]').click()
    path=HERE/name;e.value.save_as(str(path));dialog_close(page)
    return json.loads(path.read_text()) if kind=='json' else path.read_text()

def commit(page,key,value,kind='intervention'):
    el=page.locator('input[type="number"][data-'+kind+'="'+key+'"]');el.fill(str(value));el.press('Tab')

def semantic(data):
    d=copy.deepcopy(data);d.pop('exportedAt',None);return d

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
    report['browser']=browser.version
    try:
        for w,h in [(1440,900),(390,844)]:
            size=f'{w}x{h}';context=browser.new_context(viewport={'width':w,'height':h},accept_downloads=True)
            page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.on('console',lambda e:report['consoleErrors'].append(e.text) if e.type=='error' else None)
            page.on('requestfailed',lambda r:report['requestFailures'].append(r.url))
            page.goto(URL,wait_until='networkidle');page.wait_for_selector('#scene-loader[hidden]',state='attached',timeout=30000);pause(page)
            values={'norepinephrine':.27,'dobutamine':7,'epinephrine':.61,'phenylephrine':.13,'vasopressin':.89}
            for k,v in values.items():commit(page,k,v)
            page.locator('[data-tab="ventilation"]').click()
            for k,v in {'respiratoryRate':31,'tidalVolume':9,'fio2':88,'peep':17}.items():commit(page,k,v)
            page.locator('#speed-select').select_option('5');page.locator('#play-button').click();page.wait_for_timeout(5000);pause(page)
            page.locator('#baseline-button').click()
            before=export(page,'json','lifecycle-before-'+size+'.json')
            text=export(page,'csv','lifecycle-'+size+'.csv');rows=list(csv.DictReader(io.StringIO(text)))
            assert len(rows)==len(before['history'])
            for row,history in zip(rows,before['history']):
                for column,field in [('time_s','time'),('ACA_mL_100g_min','cerebralTerritories.aca'),('MCA_mL_100g_min','cerebralTerritories.mca'),('PCA_mL_100g_min','cerebralTerritories.pca'),('urineOutput_mL_h','urineOutput'),('renalPerfusion_mL_min','renalFlow'),('airwayFlow_mL_s','airwayFlowMlS'),('airwayPressure_cmH2O','airwayPressureCmH2O'),('strokeVolume_mL','strokeVolume')]:
                    val=history
                    for key in field.split('.'):val=val[key]
                    assert float(row[column])==val,(column,row[column],val)
            result={'csvRows':len(rows),'csvColumns':len(rows[0]),'historicalValuesExact':True,'invalidImports':[]}
            for name,mutate in [('unknown-root',lambda d:d.update({'unknown':1})),('unknown-visual',lambda d:d['visual'].update({'unknown':1})),('invalid-mode',lambda d:d['interventions']['ventilator'].update({'mode':'pressure-controlled'})),('uncalibrated',lambda d:d['interventions'].update({'hypertonicSolution':{'id':'hypertonic-3','value':1}}))]:
                bad=copy.deepcopy(before);mutate(bad)
                page.locator('#import-file').set_input_files({'name':name+'.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
                page.wait_for_timeout(150)
                message=page.locator('#toast').inner_text()
                after=export(page,'json','lifecycle-after-invalid-'+size+'.json')
                assert semantic(after)==semantic(before),name+' mutated prior state'
                result['invalidImports'].append({'case':name,'statePreserved':True,'feedback':message})
            commit(page,'respiratoryRate',99)
            after=export(page,'json','lifecycle-after-input-'+size+'.json');assert semantic(after)==semantic(before)
            page.locator('[data-action="restart"]:visible,[data-action="reset"]:visible').first.click();pause(page)
            reset=export(page,'json','lifecycle-reset-'+size+'.json')
            assert all(v==0 for v in reset['interventions']['vasoactive'].values())
            assert reset['interventions']['ventilator']=={'mode':'volume-controlled','fio2':21,'peep':0,'respiratoryRate':16,'tidalVolume':6,'heartRate':72,'icp':5}
            assert reset['visual']['opacity']=={'brain':1,'lungs':1,'kidneys':1}
            assert reset['baseline'] is None and reset['events']==[] and reset['timeS']<1
            assert page.locator('#baseline-button').inner_text()=='Capture baseline'
            fixture=copy.deepcopy(before);fixture['metrics']['co']=1234
            page.locator('#import-file').set_input_files({'name':'valid.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
            page.wait_for_timeout(150);pause(page)
            restored=export(page,'json','lifecycle-restored-'+size+'.json')
            assert restored['interventions']==before['interventions'] and restored['patient']==before['patient']
            assert restored['metrics']['co']!=1234 and restored['baseline'] is None and restored['events']==[]
            assert restored['history'][0]['time']==0 and restored['history'][0]['co']==5.04
            assert restored['history']!=before['history'] and restored['timeS']<before['timeS']
            assert restored['metrics']['co']==restored['metrics']['hr']*restored['metrics']['sv']/1000
            assert restored['speed']==5
            page.locator('[data-action="export"]').click();page.locator('[data-action="save-local"]').click();dialog_close(page)
            page.locator('[data-action="restart"]:visible,[data-action="reset"]:visible').first.click();pause(page)
            page.locator('[data-action="export"]').click();page.locator('[data-action="load-local"]').click();pause(page)
            local=export(page,'json','lifecycle-local-restored-'+size+'.json')
            assert local['interventions']==before['interventions'] and local['patient']==before['patient']
            result.update({'fiveAgentsAndVentilatorRestored':True,'canonicalReset':True,'finiteArchiveNotRestoredAsLive':True,
                           'freshInitialHistoryTime':restored['history'][0]['time'],'freshInitialCO':restored['history'][0]['co'],
                           'resumedImportTimeS':restored['timeS'],'resumedImportSpeed':restored['speed'],'localSaveRestore':True})
            report['viewports'][size]=result;context.close()
            print('LIFECYCLE',size,'PASS',flush=True)
        context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page()
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('console',lambda e:report['consoleErrors'].append(e.text) if e.type=='error' else None)
        page.on('requestfailed',lambda r:report['requestFailures'].append(r.url))
        fixture=(HERE/'zero-flow.html').read_text()
        page.route('**/qa-zero.html',lambda route:route.fulfill(status=200,content_type='text/html',body=fixture))
        page.goto(URL+'qa-zero.html',wait_until='networkidle');page.wait_for_function('window.anatomyEvidence')
        page.locator('#flow').click();page.wait_for_timeout(300)
        before=page.evaluate('window.anatomyEvidence()');page.wait_for_timeout(1000);after=page.evaluate('window.anatomyEvidence()')
        assert before['routes']==after['routes']
        assert all(r['rate']==0 for r in after['routes']) and after['finite'] and after['glError']==0
        page.locator('#glass').click();page.screenshot(path=str(HERE/'zero-flow-brain.png'),full_page=True)
        page.locator('#view').select_option('kidneys');page.screenshot(path=str(HERE/'zero-flow-kidneys.png'),full_page=True)
        report['zeroFlowRendererFixture']={'stablePhases':True,'allRatesZero':True,'evidence':after}
        context.close()
        assert not report['errors'] and not report['consoleErrors'] and not report['requestFailures']
    except Exception as error:
        report['failure']=str(error);raise
    finally:
        (HERE/'lifecycle-report.json').write_text(json.dumps(report,indent=2));browser.close()
