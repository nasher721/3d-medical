"""Separate fresh-process startup publication timing; no pixel reads while sampling."""
import json,pathlib
from playwright.sync_api import sync_playwright
HERE=pathlib.Path(__file__).resolve().parent
results=[]
with sync_playwright() as p:
    for w,h in [(1440,900),(390,844)]:
        browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.add_init_script(path=str(HERE/'probes.js'))
        page.add_init_script("""(() => {
          const s=window.__startup={frames:[],readyAt:null,start:performance.now()};
          const watch=t=>{const ready=!!document.querySelector('#scene-loader[hidden]');
            if(ready && s.readyAt===null)s.readyAt=performance.now();
            s.frames.push({t,ready});if(t-s.start<8000)requestAnimationFrame(watch);else s.done=true;};
          requestAnimationFrame(watch);
        })();""")
        page.goto('http://127.0.0.1:5199/',wait_until='domcontentloaded')
        page.wait_for_function('window.__startup.done')
        data=page.evaluate('({startup:window.__startup,draws:window.__finalQA.draws,display:window.__finalQA.mutations,device:window.__finalQA.device()})')
        ready=data['startup']['readyAt']
        def gaps(times):return [b-a for a,b in zip(times,times[1:])]
        data['postReadyDrawIntervals']={k:gaps([t for t in ts if t>=ready]) for k,ts in data['draws'].items()}
        data['postReadyDisplayIntervals']=gaps([t for t in data['display'] if t>=ready])
        data['viewport']={'width':w,'height':h};results.append(data)
        print(w,h,'readyAt',ready,'postReadyMaxDisplay',max(data['postReadyDisplayIntervals'],default=0),'postReadyMaxCanvas',max([n for ns in data['postReadyDrawIntervals'].values() for n in ns],default=0),flush=True)
        browser.close()
(HERE/'startup-report.json').write_text(json.dumps(results,indent=2))
