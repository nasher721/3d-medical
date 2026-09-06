import json,pathlib,re
from playwright.sync_api import sync_playwright
out=pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.goto('http://localhost:5188/')
 page.locator('[data-monitor="ventilator"]').click();page.wait_for_timeout(3000)
 cadence=page.evaluate('''async()=>{const times=[];const observer=new MutationObserver(()=>times.push(performance.now()));observer.observe(document.querySelector('[data-model-plot]'),{attributes:true,attributeFilter:['aria-label']});await new Promise(r=>setTimeout(r,1600));observer.disconnect();return times.slice(1).map((t,i)=>t-times[i]);}''')
 assert len(cadence)>5 and max(cadence)<=250, cadence
 page.locator('[data-monitor="starling"]').click();page.locator('#speed-select').select_option('5')
 def values():
  text=page.locator('[data-model-summary]').inner_text();return [float(x) for x in re.findall(r'(?:EDV|SV) ([\d.]+)',text)]
 baseline=values()
 page.locator('[data-tab="fluids"]').click();field=page.locator('input[type="number"][data-intervention="fluid"]');field.fill('1000');field.press('Tab');page.wait_for_timeout(2000);fluid=values();assert fluid[0]>baseline[0]
 page.locator('[data-action="patient"]').first.click();field=page.locator('input[type="number"][data-patient="contractility"]');field.fill('140');field.press('Tab');page.locator('[data-action="close-dialog"]').click();page.wait_for_timeout(2000);inotropy=values();assert inotropy[1]>fluid[1]
 page.locator('[data-action="patient"]').first.click();field=page.locator('input[type="number"][data-patient="vascularTone"]');field.fill('180');field.press('Tab');page.locator('[data-action="close-dialog"]').click();page.wait_for_timeout(2000);afterload=values();assert afterload[1]<inotropy[1]
 page.locator('#play-button').click();page.wait_for_timeout(5000);page.locator('.bedside').screenshot(path=str(out/'starling-desktop.png'))
 (out/'live-results.json').write_text(json.dumps({'cadenceMs':cadence,'maxIntervalMs':max(cadence),'baselineEDVSV':baseline,'afterFluidEDVSV':fluid,'afterInotropyEDVSV':inotropy,'afterAfterloadEDVSV':afterload},indent=2));b.close()
