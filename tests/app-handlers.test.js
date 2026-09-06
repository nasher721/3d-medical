import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as model from '../src/physiology.js';
import * as ui from '../src/ui.js';
import * as session from '../src/session.js';
import { ORGAN_INFO } from '../src/content.js';

// Execute the production handlers with real model modules. Only browser surfaces
// are replaced; no copied serialization/validation/reset implementation is tested.
const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
function handler(name) {
  const marker = new RegExp(`(?:async )?function ${name}\\(`).exec(source);
  assert.ok(marker, `Production handler ${name} exists`);
  const start = marker.index;
  const next = source.slice(start + marker[0].length).search(/\n(?:async )?function /);
  return source.slice(start, start + marker[0].length + next);
}
function appHarness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', value: '', hidden: false, dataset: {},
      setAttribute(key, value) { this[key] = value; }, dispatchEvent() {}, style: { setProperty() {} }, classList: { toggle() {} } });
    return elements.get(id);
  };
  const c = { ...model, ...ui, ...session, startup:{ready:true}, reducedMotion:false, performance:{now:()=>0}, num: ui.displayNumber, ORGAN_INFO, state: model.createSimulation(),
    layers: { particles: true, labels: true, vessels: true, transparent: false, opacity: { brain: .2, lungs: .4, kidneys: .6 } },
    baseline: null, monitor: { baseline: null, phase: 0, lastTime: 0, update(s) { this.drawnTime = s.timeS; this.drawnBaseline = this.baseline; } },
    colorMode: 'oxygenation', selectedOrgan: 'whole', speed: 1, running: false, savedRunning: false,
    currentLesson: null, lessonStep: 0, renderer: { setLayers() {}, resetCamera() {}, update() {} },
    previous: 0, uiElapsed: 0, requestAnimationFrame() {}, updateLabels() {},
    document: { querySelectorAll: selector => { const match = /^\[data-(\w+)=[\"]([^\"]+)[\"]\]$/.exec(selector); return match ? [...elements.values()].filter(el => el.dataset?.[match[1]] === match[2]) : []; } }, Event: class {}, $: element,
    notifications: [], notify(message) { c.notifications.push(message); },
    syncInputs(kind, key, value) { element(`${kind}:${key}`).value = value; },
    selectOrgan(id) { c.selectedOrgan = id; }, updateScenarioLabel() {}, renderControls() {},
    updateReadings() {}, closeDialog() {}, showExport() {}, localStorage: { getItem: () => c.stored, setItem: (key, value) => { c.stored = value; } },
  };
  vm.createContext(c);
  for (const name of ['finishStartupFrame', 'validateSessionEnvelope', 'sessionData', 'restoreSetup', 'resetDisplayState', 'resetSession', 'captureBaseline', 'clearBaseline',
    'updatePlayback', 'syncInputs', 'applyOpacity', 'applyIntervention', 'applyPatient', 'commitNumericInput', 'loadLocal', 'importFile', 'saveLocal']) vm.runInContext(handler(name), c);
  vm.runInContext(source.match(/  function frame\(now\).*$/m)[0], c);
  return { c, element };
}
const snapshot = c => JSON.stringify({ state: c.state, layers: c.layers, baseline: c.baseline,
  monitorBaseline: c.monitor.baseline, selectedOrgan: c.selectedOrgan, speed: c.speed, running: c.running });

test('production session serializer round trips all five agents and volume-control settings', async () => {
  const { c } = appHarness();
  const values = { norepinephrine: .2, dobutamine: 5, epinephrine: .3, phenylephrine: .4, vasopressin: .5,
    respiratoryRate: 25, tidalVolume: 8, peep: 10, fio2: 60, fluid: 500 };
  for (const [key, value] of Object.entries(values)) model.setIntervention(c.state, key, value);
  c.saveLocal(); const saved = JSON.parse(c.stored);
  assert.equal(saved.version, 2);
  assert.equal(Object.keys(saved.interventions.vasoactive).length, 5);
  c.state = model.createSimulation('septic'); c.restoreSetup(saved);
  for (const [key, value] of Object.entries(values)) assert.equal(c.state.interventions[key], value, key);
  assert.equal(c.state.interventions.ventilator.mode, 'volume-controlled');
  assert.equal(c.state.timeS, 0);
  assert.deepEqual({ ...c.layers.opacity }, saved.visual.opacity);
  assert.deepEqual({ ...c.state.visual.opacity }, saved.visual.opacity);
  const event = { target: { files: [{ size: 1000, text: async () => JSON.stringify(saved) }], value: 'saved.json' } };
  await c.importFile(event);
  assert.equal(event.target.value, '');
  assert.match(c.notifications.at(-1), /Setup restored/);
  for (const [key, value] of Object.entries(values)) assert.equal(c.state.interventions[key], value, key);
});

test('production restore defaults legacy opacity and rejects malformed imports atomically', async () => {
  const { c } = appHarness();
  const legacy = { format: 'flowstate-session', version: 1, scenarioId: 'septic',
    patient: { ...model.DEFAULT_PATIENT }, interventions: { ...model.DEFAULT_INTERVENTIONS, norepinephrine: .4 } };
  c.restoreSetup(legacy);
  for (const field of ui.ORGAN_VISUALS) assert.equal(c.layers.opacity[field.key], field.defaultValue);
  assert.deepEqual({ ...c.state.visual.opacity }, model.createSimulation().visual.opacity);
  assert.equal(c.state.interventions.norepinephrine, .4);
  const saved = JSON.parse(JSON.stringify(c.sessionData()));
  const invalid = [
    { ...saved, unknown: 1 },
    { ...saved, calibration: { ...saved.calibration, modelVersion: '3' } },
    { ...saved, ventilatorCycle: { ...saved.ventilatorCycle, flowMlS: Infinity } },
    { ...saved, frankStarling: { ...saved.frankStarling, operatingPoint: { preload: NaN, strokeVolume: 10 } } },
    { ...saved, visual: { ...saved.visual, unknown: true } },
    { ...saved, patient: { ...saved.patient, unknown: 1 } },
    { ...saved, interventions: { ...saved.interventions, vasoactive: { ...saved.interventions.vasoactive, unknown: 1 } } },
    { ...saved, interventions: { ...saved.interventions, ventilator: { ...saved.interventions.ventilator, unknown: 1 } } },
    { ...saved, layers: { ...saved.layers, unknown: true } },
    { ...saved, metrics: { ...saved.metrics, co: Infinity } },
    { ...saved, history: [{ time: 0, co: NaN }] },
    { ...saved, schemaVersion: 1 },
    { ...saved, visual: { opacity: { brain: Infinity, lungs: 1, kidneys: 1 } } },
    { ...saved, visual: { opacity: { brain: 1, lungs: 1, kidneys: 1, unknown: 1 } } },
    { ...saved, visual: { opacity: { brain: 1 } } },
    { ...saved, interventions: { ...saved.interventions, hypertonicSolution: { concentrationPercent: 3 } } },
    { ...saved, interventions: { ...saved.interventions, ventilator: { ...saved.interventions.ventilator, mode: 'pressure-control' } } },
  ];
  for (const data of invalid) {
    const before = snapshot(c); assert.throws(() => c.restoreSetup(data)); assert.equal(snapshot(c), before);
  }
  const before = snapshot(c);
  await c.importFile({ target: { files: [{ size: 12, text: async () => '{bad JSON' }], value: 'file' } });
  assert.equal(snapshot(c), before); assert.match(c.notifications.at(-1), /Could not import/);
  c.stored = JSON.stringify(saved); c.loadLocal(); assert.equal(c.state.interventions.norepinephrine, .4);
});

test('production restart clears captured baseline, clock, monitor cursors and comparisons repeatedly', () => {
  const { c, element } = appHarness();
  for (let repeat = 0; repeat < 3; repeat++) {
    model.setIntervention(c.state, 'epinephrine', .3); model.stepSimulation(c.state, 3);
    c.captureBaseline(); c.monitor.phase = 8; c.monitor.lastTime = 3;
    c.selectedOrgan = 'brain'; c.speed = 5; c.running = false;
    element('#organ-labels').hidden = true;
    c.resetSession();
    assert.equal(c.state.timeS, 0); assert.equal(c.state.interventions.epinephrine, 0);
    assert.equal(c.baseline, null); assert.equal(c.monitor.baseline, null);
    assert.equal(c.monitor.phase, 0); assert.equal(c.monitor.lastTime, 0);
    assert.match(element('#baseline-button').innerHTML, /Capture baseline/);
    assert.equal(element('#organ-labels').hidden, false);
    assert.equal(c.monitor.drawnTime, 0); assert.equal(c.monitor.drawnBaseline, null);
    assert.deepEqual({ ...c.state.visual.opacity }, model.createSimulation().visual.opacity);
    assert.deepEqual({ ...c.layers.opacity }, model.createSimulation().visual.opacity);
    assert.equal(c.speed, 1); assert.equal(c.selectedOrgan, 'whole'); assert.equal(c.running, true);
    assert.deepEqual(c.state.metrics, model.createSimulation().metrics);
  }
});

test('production direct numeric handlers reject invalid values with feedback and retain valid state', () => {
  const { c } = appHarness(); model.setIntervention(c.state, 'epinephrine', .3);
  for (const [value, valueAsNumber] of [['', NaN], ['nonsense', NaN], ['Infinity', Infinity], ['2', 2], ['-1', -1]]) {
    const before = snapshot(c);
    c.commitNumericInput({ dataset: { intervention: 'epinephrine' }, value, valueAsNumber }, 'intervention');
    assert.equal(snapshot(c), before); assert.match(c.notifications.at(-1), /last valid value was kept/);
  }
  c.commitNumericInput({ dataset: { intervention: 'epinephrine' }, value: '.4', valueAsNumber: .4 }, 'intervention');
  assert.equal(c.state.interventions.epinephrine, .4);
});


test('opacity numeric and range pairs preserve decimals and peer state', () => {
  const { c, element } = appHarness();
  for (const [id, type] of [['brain-number', 'number'], ['brain-range', 'range']]) {
    Object.assign(element(id), { type, dataset: { opacity: 'brain' }, min: '0', max: '1' });
  }
  const peers = { lungs: c.layers.opacity.lungs, kidneys: c.layers.opacity.kidneys };
  c.commitNumericInput({ dataset: { opacity: 'brain' }, value: '0.35', valueAsNumber: .35 }, 'opacity');
  assert.equal(c.layers.opacity.brain, .35);
  assert.equal(element('brain-number').value, '0.35'); assert.equal(element('brain-range').value, .35);
  for (const [value, valueAsNumber] of [['', NaN], ['oops', NaN], ['2', 2], ['Infinity', Infinity]]) {
    const before = snapshot(c); c.commitNumericInput({ dataset: { opacity: 'brain' }, value, valueAsNumber }, 'opacity');
    assert.equal(snapshot(c), before); assert.equal(element('brain-number').value, '0.35');
    assert.match(c.notifications.at(-1), /last valid value was kept/);
  }
  c.applyOpacity('brain', .65);
  assert.equal(element('brain-number').value, '0.65'); assert.equal(element('brain-range').value, .65);
  assert.equal(c.layers.opacity.lungs, peers.lungs); assert.equal(c.layers.opacity.kidneys, peers.kidneys);
  assert.ok(ui.ORGAN_VISUALS.every(field => field.digits === 2));
});


test('production animation frame freezes paused model and resumes without resetting', () => {
  const { c } = appHarness();
  c.running = true; model.setIntervention(c.state, 'epinephrine', .3); c.frame(100);
  assert.ok(c.state.timeS > 0);
  c.running = false; const paused = JSON.stringify(c.state);
  for (let now = 200; now <= 1200; now += 100) c.frame(now);
  assert.equal(JSON.stringify(c.state), paused);
  const time = c.state.timeS; c.running = true; c.frame(1300);
  assert.ok(c.state.timeS > time); assert.equal(c.state.interventions.epinephrine, .3);
});


test('archived measurements are finite records and never become restored model state', () => {
  const { c } = appHarness(); const saved = JSON.parse(JSON.stringify(c.sessionData()));
  saved.metrics.co = 1234; saved.history = [{ time: 500, co: 1234 }]; saved.events = [{ time: 500, label: 'Archived event' }];
  c.restoreSetup(saved);
  assert.notEqual(c.state.metrics.co, 1234); assert.equal(c.state.timeS, 0);
  assert.equal(c.state.history[0].time, 0); assert.equal(c.state.events.length, 0);
  for (const replacement of [null, 'not a metric', Infinity]) {
    const before = snapshot(c);
    assert.throws(() => c.restoreSetup({ ...saved, metrics: { co: replacement } }));
    assert.equal(snapshot(c), before);
  }
});


test('production readiness keeps startup zero-time and blocks activation until complete frames settle',()=>{
  const {c,element}=appHarness();c.startup={ready:false,assetsReady:false,stableSince:null,lastCompleted:null};c.running=false;
  let now=0,finished=0;c.performance.now=()=>now;c.renderer.finishPreparationFrame=()=>finished++;
  for(const time of [100,1000,5000]){now=time;c.frame(time);}
  assert.equal(c.state.timeS,0);assert.equal(c.monitor.phase,0);assert.equal(c.startup.ready,false);assert.equal(finished,3);
  c.startup.assetsReady=true;c.finishStartupFrame(5100);c.finishStartupFrame(5500);assert.equal(c.startup.stableSince,5500);
  for(let t=5600;t<=6900;t+=100)c.finishStartupFrame(t);
  assert.equal(c.startup.ready,false);assert.equal(c.running,false);
  c.finishStartupFrame(7000);assert.equal(c.startup.ready,true);assert.equal(c.running,true);
  assert.equal(element('main')['aria-busy'],'false');assert.equal(element('main').inert,false);assert.equal(element('#scene-loader').hidden,true);
  now=7100;c.frame(now);assert.ok(c.state.timeS>0);assert.equal(finished,3);
});

test('startup readiness respects reduced-motion pause and restarts its settling period after slow frames',()=>{
  const {c}=appHarness();c.reducedMotion=true;c.startup={ready:false,assetsReady:true,stableSince:null,lastCompleted:null};
  for(let t=0;t<=1000;t+=100)c.finishStartupFrame(t);
  c.finishStartupFrame(1400);assert.equal(c.startup.stableSince,1400);
  for(let t=1500;t<=2800;t+=100)c.finishStartupFrame(t);
  assert.equal(c.startup.ready,false);c.finishStartupFrame(2900);assert.equal(c.startup.ready,true);assert.equal(c.running,false);
});


test('startup has a bounded error state without advancing or enabling interaction',()=>{
  const {c,element}=appHarness();c.startup={ready:false,assetsReady:false,startedAt:0};c.running=false;
  c.finishStartupFrame(20001);assert.equal(c.startup.failed,true);assert.equal(c.startup.ready,false);
  assert.equal(c.state.timeS,0);assert.equal(c.running,false);assert.equal(element('#startup-error').hidden,false);
  assert.equal(element('#live-status').textContent,'Unavailable');
});
