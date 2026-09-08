import { AnatomyRenderer } from './anatomy.js';
import { SCENARIOS, VENTILATOR_MODES, createSimulation, stepSimulation, setIntervention, setPatient, setVentilatorMode, getScenario, getInsights, validateSimulationState, migrateState } from './physiology.js';
import { Monitors } from './monitors.js';
import { serializeSession, serializeCSV, validateDerivedArchive } from './session.js';
import { icon, escapeHTML as esc, formatTime, displayNumber as num, INTERVENTIONS, PATIENT_FIELDS, sliderMarkup, ORGAN_VISUALS, visualOpacityMarkup, hypertonicOptionMarkup, ventilatorModeMarkup, ventilatorModeHelp, ventilationFieldsForMode } from './ui.js';
import { ORGAN_INFO, LESSONS, REFERENCES } from './content.js';
import { createNeuroWorkspace } from './neuro-workspace.js';

let state=createSimulation('healthy');
let running=false, speed=1, selectedOrgan='whole', activeTab='vasoactive', colorMode='oxygenation';
let baseline=null, currentLesson=null, lessonStep=0, dialogFocus=null, savedRunning=true;
let layers={particles:true,labels:true,vessels:true,transparent:false,opacity:{brain:1,lungs:1,kidneys:1}};
let renderer, monitor, toastTimer;
document.addEventListener('anatomy-assets-ready',event=>{
  const subtitle=$('#view-subtitle');
  if(subtitle&&event.detail?.detailed)subtitle.textContent=event.detail.registered?'Source-aligned organs and major vessels · cerebral overlay schematic':'Detailed organ surfaces · educational preview';
});
const $=selector=>document.querySelector(selector);
const neuroWorkspace=createNeuroWorkspace({getState:()=>state,showDialog,exploreBrain:()=>{selectOrgan('brain');closeDialog();},loadRelatedScenario:id=>{loadScenario(id);selectOrgan('brain');closeDialog();},getElement:$});
const organs=[['whole','person','Whole circulation'],['heart','heart','Heart'],['lungs','lungs','Lungs'],['brain','brain','Brain'],['kidneys','kidneys','Kidneys'],['systemic','vessels','Systemic vessels']];
const interventionTabs=[['vasoactive','Vasoactive'],['fluids','Fluids'],['ventilation','Ventilation'],['respiratorySupport','Resp. support'],['cerebral','Cerebral']];
const startup={ready:false,failed:false,assetsReady:false,stableSince:null,lastCompleted:null,startedAt:performance.now()};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion)running=false;

function init(){
  $('#app').innerHTML=`
    <header class="app-header"><a class="brand" href="./" aria-label="Flowstate home">${icon('pulse')}<span>FLOWSTATE</span></a><nav class="primary-nav" aria-label="Main navigation"><button class="nav-tab active" data-nav="simulator">Simulator</button><button class="nav-tab" data-nav="scenarios">Scenarios</button><button class="nav-tab" data-nav="learning">Learning lab</button><button class="nav-tab neuro-nav" data-nav="neuro">Neuro ICU</button></nav><div class="header-actions"><button class="button ghost guide-button" data-action="guide">${icon('book')}<span>Model guide</span></button><button class="button export-button" aria-label="Export session" data-action="export">${icon('export')}<span>Export session</span></button></div></header>
    <main><section class="session-bar" aria-label="Simulation session"><div class="scenario-control"><label class="sr-only" for="scenario-select">Clinical scenario</label><select id="scenario-select">${SCENARIOS.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>${icon('chevron')}</div><span class="scenario-subtitle" id="scenario-subtitle">Baseline physiology</span><div class="session-playback"><span id="live-status" class="live-status"><i></i>Live</span><time id="elapsed">00:00</time><button class="button icon-button" id="play-button" data-action="play" aria-label="Pause simulation">${icon('pause')}</button><label class="sr-only" for="speed-select">Simulation speed</label><select id="speed-select" aria-label="Simulation speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option></select><button class="button icon-button restart-button" data-action="restart" aria-label="Restart scenario" title="Restart scenario">${icon('reset')}</button></div></section>
    <section class="workspace"><aside class="explorer"><div class="section-label explorer-heading">Explorer <span>01—06</span></div><nav class="organ-nav" aria-label="Anatomical views">${organs.map(([id,ic,name])=>`<button class="organ-button ${id==='whole'?'selected':''}" data-organ="${id}" aria-label="${name}" aria-pressed="${id==='whole'}">${icon(ic)}<span>${name}</span>${id==='whole'?'<i></i>':''}</button>`).join('')}</nav><div class="layer-controls"><div class="section-label">Visual layers</div>${[['particles','Blood particles'],['labels','Organ labels'],['vessels','Vessel network'],['transparent','Translucent organs']].map(([id,name])=>`<label class="toggle-row"><span>${name}</span><input type="checkbox" data-layer="${id}" ${layers[id]?'checked':''}/><span class="switch"></span></label>`).join('')}</div><div class="explorer-bottom"><button class="button full-width" data-action="patient">${icon('settings')}Patient settings</button><div class="model-note"><span class="small-dot"></span>Educational model <button data-action="guide" aria-label="Educational model limitations">${icon('info')}</button></div></div></aside>
    <section class="viewport" aria-label="Interactive 3D circulation"><div class="view-heading"><div><h1 id="view-title">Whole circulation</h1><p id="view-subtitle">Schematic organs · educational approximation</p></div><div class="view-tools"><button class="button icon-button" data-action="display" aria-label="Display settings" title="Display settings">${icon('settings')}</button><button class="button icon-button" data-action="camera" aria-label="Reset 3D camera" title="Reset view">${icon('target')}</button><button class="button icon-button" data-action="fullscreen" aria-label="Expand 3D view" title="Expand view">${icon('expand')}</button></div></div><canvas id="anatomy" aria-label="3D heart, lungs, brain, kidneys and blood circulation. Drag to rotate, scroll to zoom." tabindex="0"></canvas><div id="organ-labels" class="organ-labels"></div><div class="scene-loader" id="scene-loader"><span class="loader-orbit"></span>Building the circulation</div><div class="view-bottom"><div class="color-legend"><label for="color-mode">Color by</label><select id="color-mode" aria-label="Vascular color mode"><option value="oxygenation">Oxygenation</option><option value="pressure">Pressure</option><option value="flow">Flow velocity</option></select><div class="legend-ramp" id="legend-ramp"></div><div class="legend-values" id="legend-values"><span>Venous</span><span>Arterial</span></div></div><div class="orbit-hint">Drag to orbit <span>·</span> Scroll to zoom</div><div class="orientation"><span>A</span><i></i><span>R</span></div></div><details id="organ-detail" class="organ-detail" hidden></details><div class="lesson-bar" id="lesson-bar" hidden></div></section>
    <aside class="interventions"><div class="inspector-heading"><h2>Interventions</h2><button class="help-icon compact-reset" data-action="reset" aria-label="Restart scenario" title="Restart scenario">${icon('reset')}</button><button class="help-icon" data-action="guide" aria-label="About interventions">${icon('info')}</button></div><div class="intervention-tabs" role="tablist" aria-label="Intervention categories">${interventionTabs.map(([id,name])=>`<button role="tab" id="tab-${id}" aria-controls="intervention-controls" aria-selected="${id==='vasoactive'}" data-tab="${id}" class="${id==='vasoactive'?'active':''}">${name}</button>`).join('')}</div><div id="intervention-controls" class="intervention-controls" role="tabpanel" aria-labelledby="tab-vasoactive"></div><div class="insight-box" id="insight-box"></div><button class="button reset-interventions" data-action="reset">${icon('reset')}Restart scenario</button></aside></section>
    <section class="bedside" aria-label="Live physiological monitoring"><div class="monitor-toolbar"><div class="monitor-tabs" role="tablist" aria-label="Monitor display"><button class="active" role="tab" aria-selected="true" id="monitor-waveforms" aria-controls="monitors" data-monitor="waveforms">${icon('pulse')}Waveforms</button><button role="tab" aria-selected="false" tabindex="-1" id="monitor-trends" aria-controls="monitors" data-monitor="trends">Trends</button><button role="tab" aria-selected="false" tabindex="-1" id="monitor-pv" aria-controls="monitors" data-monitor="pv">Pressure–volume</button><button role="tab" aria-selected="false" tabindex="-1" id="monitor-starling" aria-controls="monitors" data-monitor="starling">Frank–Starling</button><button role="tab" aria-selected="false" tabindex="-1" id="monitor-ventilator" aria-controls="monitors" data-monitor="ventilator">Ventilator</button><button role="tab" aria-selected="false" tabindex="-1" id="monitor-perfusion" aria-controls="monitors" data-monitor="perfusion">Organ perfusion</button></div><div class="baseline-actions"><button data-action="baseline" id="baseline-button">${icon('target')}Capture baseline</button><button data-action="events" aria-label="Event log">${icon('clock')}<span class="events-word">Event log</span><span id="event-count">0</span></button></div></div><div class="monitor-grid" id="monitors" role="tabpanel" aria-labelledby="monitor-waveforms"></div></section>
    <footer class="status-bar"><span><span class="small-dot"></span>All systems connected <span class="footer-separator">/</span> <span id="model-state">Steady state</span></span><span>Teaching simulation · not for clinical decisions <span class="footer-separator">/</span> <button data-action="shortcuts">Keyboard shortcuts</button></span></footer></main>
    <dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-shell"><div class="dialog-header"><div><span class="section-label" id="dialog-eyebrow">FLOWSTATE</span><h2 id="dialog-title"></h2></div><button class="button icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body" id="dialog-body"></div></div></dialog><input type="file" id="import-file" accept="application/json,.json" hidden/><section id="startup-error" class="startup-error" role="alert" hidden><h2>Simulation could not prepare</h2><p>Rendering did not settle within 20 seconds. The clock has stayed at zero and no session has started.</p><a class="button" href="./">Reload simulator</a></section>`;
  $('.app-header').inert=true;$('main').inert=true;$('main').setAttribute('aria-busy','true');
  monitor=new Monitors($('#monitors'));
  bindEvents();renderControls();updatePlayback();updateScenarioLabel();
  try { renderer=new AnatomyRenderer($('#anatomy'),{onSelect:selectOrgan,onReady:()=>{startup.assetsReady=true;$('#scene-loader').innerHTML='<span class="loader-orbit"></span>Preparing the live simulation';},onError:error=>{startup.assetsReady=true;const loader=$('#scene-loader');loader.textContent='Anatomy could not load. Reload to try again.';console.error(error);}});renderer.setLayers(layers); }
  catch(error){startup.assetsReady=true;$('#scene-loader').innerHTML=`<div class="graphics-error">${icon('info')}<strong>3D graphics unavailable</strong><p>This browser could not initialize WebGL. Enable hardware acceleration or open Flowstate in a WebGL-capable browser. The physiology and controls remain available.</p></div>`;console.error(error);}
  if(reducedMotion)notify('Reduced motion: simulation starts paused. Press Play when ready.');
  let previous=performance.now(),uiElapsed=0;
  function frame(now){if(startup.failed)return;const realDt=Math.min((now-previous)/1000,.1);previous=now;const dt=startup.ready&&running?realDt*speed:0;if(dt>0)stepSimulation(state,dt);renderer?.update({...state.metrics,respiratoryRate:state.interventions.respiratoryRate},dt);if(!startup.ready)renderer?.finishPreparationFrame();updateLabels();uiElapsed+=realDt;if(!startup.ready||uiElapsed>=.08){updateReadings();monitor.update(state);uiElapsed=0;}if(!startup.ready)finishStartupFrame(performance.now());requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}

// Actual zero-time render/publication work must settle before interaction starts.
// This is readiness, not a delay applied to an already-running simulation.
function finishStartupFrame(completedAt){
  if(startup.ready||startup.failed)return;
  startup.startedAt??=completedAt;
  if(completedAt-startup.startedAt>20000){startup.failed=true;running=false;$('#startup-error').hidden=false;$('#live-status').textContent='Unavailable';return;}
  if(!startup.assetsReady)return;
  const interval=startup.lastCompleted===null?Infinity:completedAt-startup.lastCompleted;
  startup.lastCompleted=completedAt;
  if(interval>200){startup.stableSince=completedAt;return;}
  if(completedAt-startup.stableSince<1500)return;
  startup.ready=true;running=!reducedMotion;
  $('.app-header').inert=false;$('main').inert=false;$('main').setAttribute('aria-busy','false');
  if(renderer)$('#scene-loader').hidden=true;
  updatePlayback();
}

function bindEvents(){
  document.addEventListener('click',event=>{
    if(!startup.ready)return;
    const btn=event.target.closest('button');if(!btn)return;
    if(btn.dataset.organ)selectOrgan(btn.dataset.organ);
    if(btn.dataset.tab){activeTab=btn.dataset.tab;renderControls();}
    if(btn.dataset.monitor){monitor.setMode(btn.dataset.monitor);$('#monitors').setAttribute('aria-labelledby',btn.id);document.querySelectorAll('[data-monitor]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',b===btn);b.tabIndex=b===btn?0:-1;});monitor.update(state);}
    if(btn.dataset.nav==='simulator')closeDialog();
    if(btn.dataset.nav==='scenarios'){showScenarios();setNavigation('scenarios');}
    if(btn.dataset.nav==='learning'){showLearning();setNavigation('learning');}
    if(btn.dataset.nav==='neuro'){neuroWorkspace.open();setNavigation('neuro');}
    if(btn.dataset.neuro)neuroWorkspace.click(btn.dataset);
    if(btn.dataset.scenario){loadScenario(btn.dataset.scenario);closeDialog();}
    if(btn.dataset.lesson){startLesson(btn.dataset.lesson);closeDialog();}
    if(btn.dataset.bolus){applyIntervention('fluid',state.interventions.fluid+Number(btn.dataset.bolus));renderControls();notify(`${btn.dataset.bolus} mL added to retained fluid.`);}
    if(btn.dataset.help){const field=Object.values(INTERVENTIONS).flat().find(f=>f.key===btn.dataset.help);showDialog(field.name,`<p class="lead">${esc(field.help)}</p><div class="educational-note">Intervention responses are qualitative, bounded teaching approximations. The displayed dose is a model input, not a recommended treatment.</div>`,'PHYSIOLOGY NOTE');}
    const actions={play:()=>{running=!running;updatePlayback();},restart:()=>resetSession(),reset:()=>resetSession(),camera:()=>{renderer?.resetCamera();notify('Camera reset.');},fullscreen:toggleFullscreen,guide:showGuide,display:showDisplay,patient:showPatient,export:showExport,events:showEvents,baseline:captureBaseline,'close-dialog':closeDialog,shortcuts:showShortcuts,'save-local':saveLocal,'load-local':loadLocal,'download-json':()=>download('json'),'download-csv':()=>download('csv'),'import':()=>$('#import-file').click(),'clear-baseline':clearBaseline,'lesson-next':nextLesson,'lesson-exit':endLesson};
    actions[btn.dataset.action]?.();
  });
  $('#scenario-select').addEventListener('change',event=>loadScenario(event.target.value));
  $('#speed-select').addEventListener('change',event=>{speed=Number(event.target.value);notify(`Simulation speed ${speed}×.`);});
  $('#color-mode').addEventListener('change',event=>{colorMode=event.target.value;renderer?.setColorMode(colorMode);$('#legend-ramp').className=`legend-ramp ${colorMode}`;$('#legend-values').innerHTML=colorMode==='oxygenation'?'<span>Venous</span><span>Arterial</span>':colorMode==='pressure'?'<span>Low</span><span>High pressure</span>':'<span>Slow</span><span>Fast flow</span>';});
  document.addEventListener('input',event=>{
    const input=event.target;
    if(input.hasAttribute('data-neuro-field'))neuroWorkspace.change();
    if(input.matches('input[type="range"][data-intervention]'))applyIntervention(input.dataset.intervention,Number(input.value));
  if(input.matches('input[type="range"][data-patient]'))applyPatient(input.dataset.patient,Number(input.value));
  if(input.matches('input[type="range"][data-opacity]'))applyOpacity(input.dataset.opacity,Number(input.value));
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.hasAttribute('data-neuro-field'))neuroWorkspace.change();
    if(input.matches('input[type="number"][data-intervention]'))commitNumericInput(input,'intervention');
    if(input.matches('input[type="number"][data-patient]'))commitNumericInput(input,'patient');
    if(input.matches('input[type="number"][data-opacity]'))commitNumericInput(input,'opacity');
    if(input.dataset.layer){layers[input.dataset.layer]=input.checked;document.querySelectorAll('[data-layer]').forEach(el=>el.checked=layers[el.dataset.layer]);renderer?.setLayers(layers);$('#organ-labels').hidden=!layers.labels;}
    if(input.id==='autoregulation'){setPatient(state,'autoregulation',input.checked);}
    if(input.id==='prone-positioning'){applyIntervention('pronePositioning',input.checked?1:0);}
    if(input.hasAttribute('data-ventilator-mode')){setVentilatorMode(state,input.value);renderControls();notify(`Ventilator mode: ${VENTILATOR_MODES.find(m=>m.id===input.value)?.name}.`);}
  });
  $('#import-file').addEventListener('change',importFile);$('#anatomy').addEventListener('graphics-reload-needed',()=>{notify('3D graphics context was lost. Reload to restore the scene.');});
  $('#dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  $('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const rect=$('#dialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();}});
  document.addEventListener('keydown',event=>{
    if(!startup.ready)return;
    if(event.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=[...event.target.closest('[role=tablist]').querySelectorAll('[role=tab]')],index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();return;}
    if(event.target.matches('input,select,textarea')||$('#dialog').open||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.code==='Space'){event.preventDefault();running=!running;updatePlayback();}
    if(event.key.toLowerCase()==='r'){renderer?.resetCamera();}
    if(event.key.toLowerCase()==='b')captureBaseline();
    if(event.key.toLowerCase()==='l'){layers.labels=!layers.labels;document.querySelector('[data-layer="labels"]').checked=layers.labels;renderer?.setLayers(layers);$('#organ-labels').hidden=!layers.labels;}
    if(/^[1-6]$/.test(event.key))selectOrgan(organs[Number(event.key)-1][0]);
  });
}

function fieldsForActiveTab(){
  if(activeTab==='vasoactive')return INTERVENTIONS.vasoactive.filter(field=>field.key!=='heartRate');
  if(activeTab==='ventilation')return ventilationFieldsForMode(state.interventions.ventilator.mode);
  if(activeTab==='respiratorySupport')return INTERVENTIONS.respiratorySupport.filter(field=>field.key!=='pronePositioning');
  return INTERVENTIONS[activeTab];
}
function renderControls(){
  document.querySelectorAll('[data-tab]').forEach(btn=>{const active=btn.dataset.tab===activeTab;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',active);btn.tabIndex=active?0:-1;});
  $('#intervention-controls').setAttribute('aria-labelledby',`tab-${activeTab}`);
  const mode=state.interventions.ventilator.mode;
  $('#intervention-controls').innerHTML=
    (activeTab==='ventilation'?`<div class="control-row"><div class="control-label"><label for="ventilator-mode">Ventilator mode</label></div>${ventilatorModeMarkup(mode)}</div><p class="control-explainer-inline">${esc(ventilatorModeHelp(mode))}</p>`:'')
    +fieldsForActiveTab().map(field=>sliderMarkup(field,state.interventions[field.key])).join('')
    +(activeTab==='fluids'?`<div class="bolus-buttons"><button class="button" data-bolus="250">${icon('drop')}+250 mL</button><button class="button" data-bolus="500">+500 mL</button></div><div class="control-explainer"><h3>Test the preload reserve</h3><p>Watch the change in stroke volume and venous pressure after a bolus. A failing or congested ventricle may gain little forward flow.</p><div class="fluid-result"><span>Stroke volume <b><i data-live="sv">—</i> mL</b></span><span>Venous pressure <b><i data-live="cvp">—</i> mmHg</b></span></div><small>Retained intravascular volume; distribution and elimination are simplified. Furosemide acts gradually, over simulated time, rather than instantly.</small></div>`:'')
    +(activeTab==='respiratorySupport'?`<label class="toggle-row autoregulation-row"><span><strong>Prone positioning</strong><small>Modestly improves compliance and reduces shunt in a recruitable lung.</small></span><input type="checkbox" id="prone-positioning" ${state.interventions.pronePositioning?'checked':''}/><span class="switch"></span></label>`:'')
    +(activeTab==='cerebral'?`<div class="control-explainer"><h3>Pressure reaching the brain</h3><div class="equation">CPP = MAP − ICP</div><div class="fluid-result"><span>Perfusion pressure <b><i data-live="cpp">—</i> mmHg</b></span><span>Cerebral blood flow <b><i data-live="brainFlow">—</i> mL/100 g/min</b></span></div><p>Change respiratory rate in Ventilation to explore CO₂ reactivity. Autoregulation can be toggled in Patient settings.</p></div>`:'');
  if(activeTab==='fluids'){
    const gate=document.createElement('label'); gate.className='control-row uncalibrated-option'; gate.innerHTML=`<span>Hypertonic solution <small>(calibration required)</small></span><select class="calibration-option" aria-label="Hypertonic solution" disabled><option value="">Select a reviewed option</option>${hypertonicOptionMarkup()}</select>`;
    $('#intervention-controls').prepend(gate);
  }
  updateReadings();
}
function syncInputs(kind,key,value){
  const fields=kind==='intervention'?Object.values(INTERVENTIONS).flat():kind==='opacity'?ORGAN_VISUALS:PATIENT_FIELDS;
  const field=fields.find(f=>f.key===key);
  document.querySelectorAll(`[data-${kind}="${key}"]`).forEach(input=>{
    input.value=input.type==='number'?num(value,field?.digits??(key==='hemoglobin'?1:0)):value;
    input.style.setProperty('--fill',`${(value-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
  });
}
function applyOpacity(key,value){
  const field=ORGAN_VISUALS.find(f=>f.key===key);if(!field||!Number.isFinite(value))return;
  layers.opacity[key]=Math.min(field.max,Math.max(field.min,value));
  state.visual.opacity[key]=layers.opacity[key];
  syncInputs('opacity',key,layers.opacity[key]);
  renderer?.setLayers({...layers,opacity:{...layers.opacity}});
}
function applyIntervention(key,value){setIntervention(state,key,value);syncInputs('intervention',key,state.interventions[key]);}
function applyPatient(key,value){setPatient(state,key,value);syncInputs('patient',key,state.patient[key]);}
function commitNumericInput(input,kind){
  const fields=kind==='intervention'?Object.values(INTERVENTIONS).flat():kind==='opacity'?ORGAN_VISUALS:PATIENT_FIELDS;
  const key=input.dataset[kind],field=fields.find(candidate=>candidate.key===key);
  const value=input.value.trim()===''?NaN:input.valueAsNumber;
  const invalid=!field||!Number.isFinite(value)||value<field.min||value>field.max;
  if(invalid){
    notify(`${field?.name||'Input'} must be a number between ${field?.min} and ${field?.max} ${field?.unit||''}. The last valid value was kept.`);
    syncInputs(kind,key,kind==='intervention'?state.interventions[key]:kind==='opacity'?layers.opacity[key]:state.patient[key]);return;
  }
  if(kind==='intervention')applyIntervention(key,value);else if(kind==='opacity')applyOpacity(key,value);else applyPatient(key,value);
}
function resetDisplayState(){layers={particles:true,labels:true,vessels:true,transparent:false,opacity:Object.fromEntries(ORGAN_VISUALS.map(field=>[field.key,field.defaultValue] ))};state.visual.opacity={...layers.opacity};renderer?.setLayers(layers);$('#organ-labels').hidden=false;document.querySelectorAll('[data-layer]').forEach(input=>{input.checked=layers[input.dataset.layer];});document.querySelectorAll('[data-opacity]').forEach(input=>{input.value=layers.opacity[input.dataset.opacity];input.style.setProperty('--fill',`${layers.opacity[input.dataset.opacity]*100}%`);});}
function resetSession(){state=createSimulation(state.scenarioId);running=true;speed=1;selectedOrgan='whole';clearBaseline();monitor.phase=0;monitor.lastTime=0;currentLesson=null;lessonStep=0;resetDisplayState();selectOrgan('whole');renderer?.resetCamera();$('#lesson-bar').hidden=true;$('#speed-select').value='1';updateScenarioLabel();renderControls();updatePlayback();updateReadings();monitor.update(state);notify('Scenario restarted from its canonical baseline.');}
function updatePlayback(){if(!startup.ready){$('#play-button').disabled=true;$('#live-status').innerHTML='<i></i>Loading';return;}$('#play-button').disabled=false;const button=$('#play-button');button.innerHTML=icon(running?'pause':'play');button.setAttribute('aria-label',running?'Pause simulation':'Play simulation');$('#live-status').classList.toggle('paused',!running);$('#live-status').innerHTML=`<i></i>${running?'Live':'Paused'}`;}
function updateScenarioLabel(){const scenario=getScenario(state.scenarioId);$('#scenario-select').value=state.scenarioId;$('#scenario-subtitle').textContent=scenario.subtitle||scenario.description;}
function loadScenario(id){state=createSimulation(id);baseline=null;monitor.baseline=null;monitor.phase=0;monitor.lastTime=0;currentLesson=null;$('#lesson-bar').hidden=true;$('#baseline-button').innerHTML=`${icon('target')}Capture baseline`;updateScenarioLabel();renderControls();updateReadings();notify(`${getScenario(id).name} loaded. All interventions reset.`);}
function selectOrgan(id){if(!ORGAN_INFO[id])return;selectedOrgan=id;renderer?.setView(id);document.querySelectorAll('[data-organ]').forEach(btn=>{btn.classList.toggle('selected',btn.dataset.organ===id);btn.setAttribute('aria-pressed',btn.dataset.organ===id);});$('#view-title').textContent=ORGAN_INFO[id].name;$('#view-subtitle').textContent=renderer?.registeredVasculature?'Source-aligned organs and major vessels · cerebral overlay schematic':id==='brain'?'Canonical topology · schematic beds · educational':id==='whole'?'Schematic organs · educational approximation':`${ORGAN_INFO[id].subtitle} · educational schematic`;const detail=$('#organ-detail');detail.hidden=id==='whole';detail.open=false;if(id!=='whole'){const info=ORGAN_INFO[id];detail.innerHTML=`<summary class="detail-title">${icon(organs.find(o=>o[0]===id)[1])}<h3>${info.name} physiology</h3><span class="detail-disclosure">Details ${icon('chevron')}</span></summary><p>${esc(info.text)}</p><div class="organ-metrics">${info.metrics.map(([key,label,unit,digits])=>`<div><span>${label}</span><b><i data-live="${key}" data-digits="${digits}">—</i><small>${unit}</small></b></div>`).join('')}</div><div class="organ-lesson">${icon('book')}<span>${esc(info.lesson)}</span></div>`;}updateReadings();}
function updateLabels(){
  const container=$('#organ-labels');
  if(!renderer||!layers.labels){container.replaceChildren();return;}
  const positions=renderer.getLabels(),dynamic=positions.filter(label=>label.kind==='anatomy'||label.kind==='flow');
  const existing=new Map([...container.querySelectorAll('[data-label]')].map(el=>[el.dataset.label,el]));
  for(const label of positions){
    let element=existing.get(label.id);
    if(!element){element=document.createElement('button');element.dataset.label=label.id;element.type='button';
      if(label.kind==='organ'){element.className='organ-label';element.dataset.organ=label.organ||label.id;}
      else {element.className=`anatomy-marker ${label.kind==='flow'?'flow-marker':''}`;element.dataset.anatomyLabel=label.id;}
      container.append(element);
    }
    existing.delete(label.id);element.hidden=!label.visible;element.setAttribute('aria-label',label.text);element.title=label.text;
    element.textContent=label.kind==='organ'?label.text:String(label.index??'•');
    element.style.left=`${(label.kind==='organ'?label.x:label.anchorX)*100}%`;
    element.style.top=`${(label.kind==='organ'?label.y:label.anchorY)*100}%`;
  }
  for(const stale of existing.values())stale.remove();
  let key=container.querySelector('.anatomy-key');
  if(!dynamic.length){key?.remove();return;}
  if(!key){key=document.createElement('details');key.className='anatomy-key';key.open=innerWidth>600;key.innerHTML='<summary></summary><div class="anatomy-key-list"></div>';container.append(key);}
  key.querySelector('summary').textContent=`Anatomy key · ${dynamic.filter(l=>l.kind==='anatomy').length} structures`;
  const list=key.querySelector('.anatomy-key-list');
  // Reconcile text without replacing the scroll container or current focus.
  for(const [index,label] of dynamic.entries()){
    let row=list.children[index];if(!row){row=document.createElement('div');row.innerHTML='<b></b><span></span>';list.append(row);}
    row.className=`anatomy-key-row ${label.kind==='flow'?'flow-key':''}`;row.firstChild.textContent=String(label.index??'•');row.lastChild.textContent=label.text;
  }
  while(list.children.length>dynamic.length)list.lastChild.remove();
}

let insightSignature="";
function updateReadings(){
  $('#elapsed').textContent=formatTime(state.time);$('#event-count').textContent=state.events.length;
  document.querySelectorAll('[data-live]').forEach(el=>el.textContent=num(state.metrics[el.dataset.live],Number(el.dataset.digits??(['cvp','lactate','co'].includes(el.dataset.live)?1:0))));
  const insights=getInsights(state);const top=insights[0]||{title:'Follow the pressure–flow response',text:'Adjust an intervention and watch the connected circulation respond.',tone:'neutral'};const signature=JSON.stringify(top);
  if(signature!==insightSignature){$('#insight-box').className=`insight-box ${top.tone}`;$('#insight-box').innerHTML=`${icon('info')}<div><strong>${esc(top.title)}</strong><p>${esc(top.text)}</p></div>`;insightSignature=signature;}
  $('#model-state').textContent=state.metrics.map<65?'Low perfusion pressure':state.metrics.spo2<90?'Reduced oxygenation':state.metrics.cvp>14?'Venous congestion':'Physiology connected';
  if(currentLesson)updateLessonMetrics();
}
function captureBaseline(){baseline={...state.metrics,cerebralTerritories:{...state.metrics.cerebralTerritories},time:state.time};monitor.baseline=baseline;$('#baseline-button').innerHTML=`${icon('check')}Baseline ${formatTime(state.time)}`;state.events.push({time:state.time,label:'Baseline captured'});notify('Baseline captured. Compare monitor changes and the pressure–volume envelope.');}
function clearBaseline(){baseline=null;monitor.baseline=null;$('#baseline-button').innerHTML=`${icon('target')}Capture baseline`;notify('Baseline cleared.');}
function toggleFullscreen(){const viewport=$('.viewport');if(document.fullscreenElement){document.exitFullscreen?.();return;}if(viewport.requestFullscreen)viewport.requestFullscreen().catch(()=>notify('Fullscreen unavailable in this browser. Drag the model to explore.'));else notify('Fullscreen unavailable in this browser.');}

function setNavigation(id){document.querySelectorAll('[data-nav]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.nav===id);if(btn.dataset.nav===id)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});}
function showDialog(title,body,eyebrow='FLOWSTATE LAB'){const dialog=$('#dialog');if(!dialog.open){dialogFocus=document.activeElement;savedRunning=running;running=false;updatePlayback();}$('#dialog-title').textContent=title;$('#dialog-eyebrow').textContent=eyebrow;$('#dialog-body').innerHTML=body;if(!dialog.open)dialog.showModal();}
function closeDialog(){const dialog=$('#dialog');if(!dialog.open)return;dialog.close();setNavigation('simulator');running=savedRunning;updatePlayback();dialogFocus?.focus();}
function showDisplay(){showDialog('Choose what the circulation reveals',`<p class="lead">Show or hide each layer of the live 3D scene. Organ opacity is controlled independently. All values are educational approximations.</p><div class="display-settings">${[['particles','Blood particles'],['labels','Organ labels'],['vessels','Vessel network'],['transparent','Translucent organs']].map(([id,name])=>`<label class="toggle-row"><span>${name}</span><input type="checkbox" data-layer="${id}" ${layers[id]?'checked':''}/><span class="switch"></span></label>`).join('')}</div><div class="opacity-controls"><div class="section-label">Organ opacity</div>${visualOpacityMarkup(layers.opacity)}</div><button class="button" data-action="patient">${icon('settings')}Open patient settings</button>`,'DISPLAY SETTINGS');}
function showScenarios(){
  showDialog('Every state tells a different story',`<p class="lead">Choose a starting physiology, then change one variable at a time. Loading a scenario starts a fresh session.</p><div class="scenario-grid">${SCENARIOS.map((s,i)=>`<button class="scenario-card ${s.id===state.scenarioId?'current':''}" data-scenario="${esc(s.id)}"><span class="scenario-number">0${i+1} <span>${esc(s.category||'Hemodynamics')}</span></span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="scenario-card-foot"><span>${s.id===state.scenarioId?'Current scenario':'Explore scenario'}</span>${icon('arrow')}</div></button>`).join('')}</div>`,'SCENARIO LIBRARY');
}
function showPatient(){showDialog('Make the physiology your own',`<p class="lead">Customize the patient around the current scenario. Changes take effect when you return to the simulation.</p><div class="patient-grid">${PATIENT_FIELDS.map(f=>sliderMarkup(f,state.patient[f.key],'patient')).join('')}${sliderMarkup(INTERVENTIONS.vasoactive.find(f=>f.key==='heartRate'),state.interventions.heartRate)}</div><label class="toggle-row autoregulation-row"><span><strong>Cerebral autoregulation</strong><small>Buffer pressure changes within the modeled autoregulatory range.</small></span><input type="checkbox" id="autoregulation" ${state.patient.autoregulation?'checked':''}/><span class="switch"></span></label><div class="educational-note">Weight is treated as predicted body weight for ventilator calculations. Organ shape and the virtual anatomy are illustrative, not patient-specific. All settings are relative to the selected scenario.</div>`,'PATIENT SETTINGS');}
function showLearning(){showDialog('Build intuition. One experiment at a time.',`<p class="lead">Guided bedside questions with a living circulation. Each experiment loads its own scenario.</p><div class="lesson-grid">${LESSONS.map((l,i)=>`<button class="lesson-card" data-lesson="${l.id}"><span class="section-label">EXPERIMENT 0${i+1} <span>${l.duration}</span></span><h3>${l.title}</h3><p>${l.description}</p><div class="scenario-card-foot"><span>${l.category}</span>${icon('arrow')}</div></button>`).join('')}</div><div class="learning-footer">Observe → predict → intervene → explain. There is no clinical score: the goal is understanding the mechanisms and the limits of the model.</div>`,'LEARNING LAB');}
function startLesson(id){const lesson=LESSONS.find(l=>l.id===id);if(!lesson)return;loadScenario(lesson.scenario);currentLesson=lesson;lessonStep=0;renderLesson();if(id==='cpp')selectOrgan('brain');else selectOrgan('whole');notify(`Experiment started: ${lesson.title}`);}
function renderLesson(){const step=currentLesson.steps[lessonStep];const bar=$('#lesson-bar');bar.hidden=false;bar.innerHTML=`<div class="lesson-progress"><span>EXPERIMENT · ${lessonStep+1} / ${currentLesson.steps.length}</span><button class="help-icon" data-action="lesson-exit" aria-label="Exit experiment">${icon('close')}</button></div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p><div class="lesson-question">${esc(step.action)}</div><div class="lesson-bottom"><span id="lesson-metrics"></span><button class="button primary" data-action="lesson-next">${lessonStep<currentLesson.steps.length-1?'Next step':'Finish'}${icon('arrow')}</button></div>`;}
function updateLessonMetrics(){const el=$('#lesson-metrics');if(el)el.textContent=`MAP ${num(state.metrics.map)} · CO ${num(state.metrics.co,1)} · SaO₂ ${num(state.metrics.spo2)}%`;}
function nextLesson(){if(!currentLesson)return;if(lessonStep<currentLesson.steps.length-1){lessonStep++;renderLesson();}else{const name=currentLesson.title;endLesson();showDialog('Reflect on the response',`<p class="lead">You completed “${esc(name)}”.</p><ul class="reflection-list"><li>Which variable changed first, and which changed downstream?</li><li>Did the intervention improve flow, pressure, oxygen delivery, or more than one?</li><li>What tradeoff appeared as you increased the intervention?</li><li>Which assumptions would you need to verify in a real patient?</li></ul><p>The session remains available. Capture an export or keep experimenting.</p>`,'EXPERIMENT COMPLETE');}}
function endLesson(){currentLesson=null;$('#lesson-bar').hidden=true;}
function showGuide(){showDialog('Understand the model',`<p class="lead">Flowstate is a connected, lumped-parameter teaching simulation. Its purpose is to make physiological relationships visible.</p><div class="guide-callout"><strong>For education, not clinical decisions.</strong><p>Drug responses, disease severity, gas exchange and anatomy are simplified. This model is not clinically validated, patient-calibrated or a dosing tool.</p></div><div class="guide-equations"><div><code>CO = HR × SV / 1000</code><p>Cardiac output follows heart rate and stroke volume.</p></div><div><code>MAP = CVP + CO × SVR / 80</code><p>Resistance connects pressure to flow.</p></div><div><code>CPP = MAP − ICP</code><p>Cerebral perfusion depends on the pressure gradient.</p></div><div><code>CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂</code><p>SaO₂ is a fraction here. Content is mL O₂/dL.</p></div><div><code>DO₂ = CO × CaO₂ × 10</code><p>Oxygen delivery depends on both flow and content.</p></div><div><code>SvO₂ ≈ (CaO₂ − VO₂ / (10 × CO)) / (1.34 × Hb)</code><p>A simplified Fick estimate neglecting venous dissolved oxygen.</p></div></div><h3>Canonical adult and clock</h3><p>The healthy baseline uses PBW 70 kg, hemoglobin 12 g/dL, core temperature 37°C, intrinsic heart rate 72 bpm, baseline ICP 5 mmHg, and no active vasoactive, respiratory-support, or renal-support input or retained fluid. Volume control starts at 16 breaths/min, 6 mL/kg PBW (420 mL), FiO₂ 21%, and PEEP 0 cmH₂O. The model advances in 1/30 s steps, records once per simulated second, and refreshes readings within 250 ms while running. Restart returns the selected scenario to its own baseline.</p><h3>Ventilator modes</h3><p>Three modes share respiratory rate, PEEP, and FiO₂. Volume control targets a fixed mL/kg PBW tidal volume; airway pressure is the modeled output. Pressure control and pressure support/CPAP hold a fixed pressure above PEEP instead; delivered tidal volume becomes the modeled output and falls when compliance worsens or resistance rises, the way real pressure-targeted ventilation behaves. Pressure support at 0 cmH₂O is CPAP. Patient inspiratory effort and triggering are not modeled in any mode.</p><h3>Conceptual intervention inputs</h3><p>The registry time basis is per minute unless noted otherwise. These bounded values describe model inputs, not clinical doses, targets, onset, or offset.</p><ul class="reflection-list"><li>Norepinephrine: 0–1 µg/kg/min; raises tone and preload, with modeled inotropy and heart-rate effects.</li><li>Dobutamine: 0–20 µg/kg/min; raises contractility and heart rate, lowers tone, and increases modeled demand.</li><li>Epinephrine: 0–1 µg/kg/min; raises contractility, tone, and heart rate.</li><li>Phenylephrine: 0–1 µg/kg/min; raises tone and downstream afterload.</li><li>Vasopressin: 0–1 conceptual model units, per-minute metadata; raises tone. This is not clinical units/min and has no clinical-unit conversion.</li><li>Milrinone: 0–0.75 µg/kg/min; an inodilator preset raising contractility while lowering tone.</li><li>Nitroprusside: 0–3 µg/kg/min; an arterial vasodilator preset lowering tone and MAP.</li><li>Nitroglycerin: 0–200 µg/min; a venodilator preset lowering modeled venous congestion more than arterial tone.</li><li>Esmolol: 0–300 µg/kg/min; a beta-blocker preset lowering heart rate and contractility.</li><li>Atropine: 0–3 mg, a bolus rather than an infusion; raises heart rate.</li><li>Furosemide: 0–80 mg; while active it gradually depletes modeled retained fluid and raises urine output over simulated time, unlike the instantaneous controls above.</li><li>Albuterol: 0–8 conceptual doses; lowers modeled airway resistance, with a mild heart-rate rise as a side effect.</li><li>Inhaled nitric oxide: 0–40 ppm; lowers modeled pulmonary vascular resistance and mildly improves V/Q matching where shunt is high.</li><li>Sedation depth: 0–100 conceptual scale; lowers modeled metabolic demand, heart rate, and vascular tone.</li><li>Prone positioning: a maneuver, not a drug; modestly improves compliance and reduces shunt in a recruitable lung.</li></ul><p>The 3%, 7.5%, and 23.4% hypertonic labels remain disabled: no source-reviewed concentration calibration supplies their units, bounds, time basis, or effects.</p><h3>Read the new teaching views</h3><p>Frank–Starling plots EDV in mL against stroke volume in mL using the same forward relationship as the operating point. It is distinct from the schematic pressure–volume loop. Volume control shows flow in mL/s, volume in mL, pressure in cmH₂O, and minute/alveolar ventilation in mL/min. FiO₂ is entered as percent and divided by 100 for oxygen calculations. Organ perfusion separates cerebral territories in mL/100 g/min, renal perfusion in mL/min, and urine output in mL/h.</p><h3>How to read the circulation</h3><p>Particles travel along schematic pulmonary and systemic paths. Their speed follows flow; oxygenation coloring changes between the arterial and venous sides. Pressure and flow color modes emphasize different parts of the circuit. Heart size and pulmonary congestion respond to model estimates. Visual changes are exaggerated for teaching.</p><h3>What is simplified</h3><ul class="reflection-list"><li>Blood flow uses a bounded compartment approximation, not computational fluid dynamics. Circuit connections are schematic.</li><li>Conceptual drug-response curves and organ flow are qualitative approximations. There is no drug pharmacokinetic model.</li><li>Fluid is retained volume. Furosemide is the one modeled exception that removes it, gradually, over simulated time; redistribution, bleeding over time and cumulative drug toxicity are otherwise not simulated. Urine output is a separate bounded collecting-system teaching proxy in mL/h.</li><li>ECG, pressure traces and pressure–volume loops are illustrative shapes driven by model values, not simulated electrophysiology. The ECG's P, QRS, and T durations are fixed absolute-time components (with a Bazett-style QT/heart-rate relationship) rather than fractions of the RR interval, so its shape stays physiologic-looking at both slow and fast rates; it is still not a diagnostic rhythm model.</li><li>The arterial saturation estimate is displayed as SaO₂; a pulse-oximeter sensor and measurement error are not modeled.</li><li>Time controls alter simulated time. Dialogs pause the session; background-tab time is capped rather than caught up.</li></ul><h3>Anatomical model credits</h3><p>Organ surfaces use code-owned procedural schematic shells. BodyParts3D provenance is blocked because the archived README and current license conflict, so no derived BodyParts3D asset is distributed. Organ spacing, vessel routes, tissue colors, and motion are illustrative. Urine output is a bounded educational collecting-system proxy, separate from renal perfusion; it is not GFR or clearance.</p><h3>Physiology references</h3><div class="reference-list">${REFERENCES.map((r,i)=>`<a href="${r.url}" target="_blank" rel="noopener noreferrer"><span>0${i+1}</span><div><strong>${esc(r.title)}</strong><small>${esc(r.note)}</small></div>${icon('arrow')}</a>`).join('')}</div><p class="guide-end">References support the physiological principles; they do not validate the simulator’s parameterization.</p>`,'MODEL GUIDE');}
function showEvents(){showDialog('Your intervention timeline',`<p class="lead">${esc(getScenario(state.scenarioId).name)} · ${formatTime(state.time)} of simulated time. Changes are recorded as you experiment.</p>${state.events.length?`<div class="event-list">${state.events.slice(-150).reverse().map(event=>`<div><time>${formatTime(event.time)}</time><span>${esc(event.label)}</span></div>`).join('')}</div>`:'<div class="empty-state">No interventions yet. Change a control to start your experiment.</div>'}`,'SESSION EVENTS');}
function showShortcuts(){showDialog('Keep your hands on the experiment',`<div class="shortcut-list">${[['Space','Play / pause'],['1–6','Select an organ view'],['R','Reset camera'],['B','Capture baseline'],['L','Toggle organ labels'],['Escape','Close dialog'],['Drag','Orbit the anatomy'],['Scroll','Zoom the anatomy']].map(([key,text])=>`<div><kbd>${key}</kbd><span>${text}</span></div>`).join('')}</div>`,'KEYBOARD & CAMERA');}
function showExport(){let hasSave=false;try{hasSave=!!localStorage.getItem('flowstate-session');}catch{}showDialog('Take the experiment with you',`<p class="lead">Save the current setup or export the recorded physiology for discussion and comparison.</p><div class="export-options"><button data-action="download-csv">${icon('export')}<div><strong>Download observations</strong><span>CSV · time series, units and scenario</span></div>${icon('arrow')}</button><button data-action="download-json">${icon('save')}<div><strong>Download full session</strong><span>JSON · setup, measurements, baseline and event log</span></div>${icon('arrow')}</button><button data-action="save-local">${icon('save')}<div><strong>Save setup in this browser</strong><span>Remember this scenario and your settings locally</span></div>${icon('arrow')}</button><button data-action="load-local" ${hasSave?'':'disabled'}>${icon('reset')}<div><strong>Restore saved setup</strong><span>${hasSave?'Reload your locally saved settings':'No setup saved in this browser yet'}</span></div>${icon('arrow')}</button><button data-action="import">${icon('upload')}<div><strong>Import a session setup</strong><span>Load settings from a Flowstate JSON export</span></div>${icon('arrow')}</button></div><div class="educational-note">Restoring or importing starts a fresh simulation from the saved settings. Historical measurements are kept in the export, but are not replayed. Nothing is sent to a server.</div>`,'EXPORT & RESTORE');}

function sessionData(){return serializeSession(state,{layers,baseline,colorMode,selectedOrgan,speed});}
function download(type){const data=sessionData();let text,mime,extension;if(type==='json'){text=JSON.stringify(data,null,2);mime='application/json';extension='json';}else{text=serializeCSV(state);mime='text/csv';extension='csv';}const url=URL.createObjectURL(new Blob([text],{type:mime}));const link=document.createElement('a');link.href=url;link.download=`flowstate-${state.scenarioId}-${Math.floor(state.time)}s.${extension}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`${extension.toUpperCase()} export downloaded.`);}
function saveLocal(){try{localStorage.setItem('flowstate-session',JSON.stringify(sessionData()));showExport();notify('Setup saved in this browser.');}catch{notify('Browser storage is unavailable. Download a JSON session instead.');}}
// Validate the supplied envelope before projecting restoration inputs. Archived
// measurements are checked for finite values but never installed as live state.
function validateSessionEnvelope(data){
  const object=(value,path)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Invalid ${path}: expected an object.`);};
  const keys=(value,allowed,path)=>{object(value,path);for(const key of Object.keys(value))if(!allowed.includes(key))throw new Error(`Unknown ${path} key: ${key}`);};
  keys(data,['format','version','schemaVersion','exportedAt','scenarioId','timeS','time','patient','interventions','visual','metrics','baseline','history','events','layers','colorMode','selectedOrgan','speed','model','calibration','frankStarling','ventilatorCycle'],'session');
  validateDerivedArchive(data,createSimulation());
  if(data.schemaVersion!==undefined&&data.schemaVersion!==data.version)throw new Error('Conflicting session schema version.');
  if(data.visual!==undefined)keys(data.visual,['opacity'],'visual');
  if(data.layers!==undefined){
    keys(data.layers,['particles','labels','vessels','transparent','opacity'],'layers');
    for(const key of ['particles','labels','vessels','transparent'])if(data.layers[key]!==undefined&&typeof data.layers[key]!=='boolean')throw new Error(`Invalid layer: ${key}`);
  }
  for(const opacity of [data.visual?.opacity,data.layers?.opacity])if(opacity!==undefined){
    keys(opacity,ORGAN_VISUALS.map(field=>field.key),'opacity');
    for(const field of ORGAN_VISUALS)if(!Number.isFinite(opacity[field.key])||opacity[field.key]<field.min||opacity[field.key]>field.max)throw new Error(`Invalid opacity: ${field.key}`);
  }
  if(data.speed!==undefined&&![.5,1,2,5].includes(data.speed))throw new Error('Invalid simulation speed.');
  if(data.colorMode!==undefined&&!['oxygenation','pressure','flow'].includes(data.colorMode))throw new Error('Invalid color mode.');
  if(data.selectedOrgan!==undefined&&!Object.hasOwn(ORGAN_INFO,data.selectedOrgan))throw new Error('Invalid selected organ.');
  if(data.model!==undefined&&typeof data.model!=='string')throw new Error('Invalid model description.');
  if(data.exportedAt!==undefined&&(typeof data.exportedAt!=='string'||!Number.isFinite(Date.parse(data.exportedAt))))throw new Error('Invalid export timestamp.');
  const numericRecord=(record,path)=>{
    object(record,path);
    for(const [key,value]of Object.entries(record)){
      if(value&&typeof value==='object'&&!Array.isArray(value))numericRecord(value,`${path}.${key}`);
      else if(!Number.isFinite(value))throw new Error(`Invalid recorded value: ${path}.${key}`);
    }
  };
  if(data.metrics!==undefined)numericRecord(data.metrics,'metrics');
  if(data.baseline!==undefined&&data.baseline!==null)numericRecord(data.baseline,'baseline');
  if(data.history!==undefined){if(!Array.isArray(data.history))throw new Error('Invalid history.');data.history.forEach((row,index)=>numericRecord(row,`history[${index}]`));}
  if(data.events!==undefined){
    if(!Array.isArray(data.events))throw new Error('Invalid events.');
    for(const event of data.events){keys(event,['time','label'],'event');if(!Number.isFinite(event.time)||event.time<0||typeof event.label!=='string')throw new Error('Invalid recorded event.');}
  }
}
function restoreSetup(data){
  validateSessionEnvelope(data);
  if(data?.format!=='flowstate-session'||![1,2].includes(data.version)||!SCENARIOS.some(s=>s.id===data.scenarioId)||!data.patient||typeof data.patient!=='object'||!data.interventions||typeof data.interventions!=='object')throw new Error('Not a supported Flowstate session.');
  const opacitySource=data.version===2?data.visual?.opacity:data.layers?.opacity;
  const opacity=opacitySource===undefined?Object.fromEntries(ORGAN_VISUALS.map(field=>[field.key,field.defaultValue])):opacitySource;
  const imported={schemaVersion:data.version===2?2:1,scenarioId:data.scenarioId,timeS:data.timeS,time:data.time,patient:data.patient,interventions:data.interventions,visual:{opacity}};
  const validation=validateSimulationState(imported);if(!validation.valid)throw new Error(validation.reason);migrateState(imported);
  const flat=data.version===2?{...(data.interventions.ventilator||{}),...(data.interventions.vasoactive||{}),...(data.interventions.support||{}),fluid:data.interventions.fluid}:data.interventions;
  // Mode was validated above; it is metadata, not a numeric intervention.
  if(data.version===2)delete flat.mode;
  const valid=Object.values(INTERVENTIONS).flat().map(field=>field.key);for(const[key,value]of Object.entries(flat))if(!valid.includes(key)||!Number.isFinite(value))throw new Error(`Invalid intervention setting: ${key}`);
  const nextLayers={particles:true,labels:true,vessels:true,transparent:false,opacity:{}};
  for(const field of ORGAN_VISUALS){const value=opacity[field.key];if(!Number.isFinite(value)||value<field.min||value>field.max)throw new Error(`Invalid opacity: ${field.key}`);nextLayers.opacity[field.key]=value;}
  if(data.layers&&typeof data.layers==='object')for(const key of ['particles','labels','vessels','transparent'])if(typeof data.layers[key]==='boolean')nextLayers[key]=data.layers[key];
  const next=createSimulation(data.scenarioId);for(const[key,value]of Object.entries(data.patient))setPatient(next,key,value);for(const[key,value]of Object.entries(flat))setIntervention(next,key,value);
  if(data.version===2&&data.interventions.ventilator?.mode)setVentilatorMode(next,data.interventions.ventilator.mode);
  next.events=[];
  state=next;layers=nextLayers;state.visual.opacity={...layers.opacity};clearBaseline();monitor.phase=0;monitor.lastTime=0;running=true;
  document.querySelectorAll('[data-layer]').forEach(input=>input.checked=layers[input.dataset.layer]);renderer?.setLayers(layers);$('#organ-labels').hidden=!layers.labels;
  colorMode=['oxygenation','pressure','flow'].includes(data.colorMode)?data.colorMode:'oxygenation';$('#color-mode').value=colorMode;$('#color-mode').dispatchEvent(new Event('change'));
  speed=[.5,1,2,5].includes(data.speed)?data.speed:1;$('#speed-select').value=speed;selectOrgan(ORGAN_INFO[data.selectedOrgan]?data.selectedOrgan:'whole');renderControls();updateScenarioLabel();updatePlayback();updateReadings();monitor.update(state);closeDialog();notify('Setup restored. A fresh simulation is loaded from the saved settings.');
}
function loadLocal(){try{restoreSetup(JSON.parse(localStorage.getItem('flowstate-session')));}catch(error){notify(`Could not restore: ${error.message}`);}}
async function importFile(event){const file=event.target.files[0];if(!file)return;try{if(file.size>5_000_000)throw new Error('Session file exceeds 5 MB.');restoreSetup(JSON.parse(await file.text()));}catch(error){notify(`Could not import: ${error.message}`);}event.target.value='';}
function notify(message){const dialog=$('#dialog');if(dialog?.open){let status=$('#dialog-status');if(!status){status=document.createElement('div');status.id='dialog-status';status.className='dialog-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');$('#dialog-body').prepend(status);}status.textContent=message;}clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}

const showGuideWithAnatomicalNote=showGuide;
showGuide=()=>{
  showGuideWithAnatomicalNote();
  const heading=[...$('#dialog-body').querySelectorAll('h3')].find(el=>el.textContent==='Anatomical model credits');
  if(heading?.nextElementSibling)heading.nextElementSibling.textContent='The local educational preview loads detailed six-organ anatomical surfaces. BodyParts3D provenance remains unresolved, so release packaging stays blocked; vessel routes and tissue beds are schematic, and the model is not clinically validated.';
};

init();
