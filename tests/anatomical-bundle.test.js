import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseOrganGLB } from '../src/organ-assets.js';
import { AnatomyRenderer } from '../src/anatomy.js';

test('shipping anatomical bundle contains six detailed, correctly placed organ surfaces', async () => {
  const bytes = await readFile(new URL('../assets/organs/anatomy.glb', import.meta.url));
  assert.ok(bytes.length < 12_000_000, 'keep the offline mesh bundle within its 12 MB budget');
  const meshes = parseOrganGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.deepEqual(meshes.map(mesh => mesh.name).sort(), ['brain', 'heart', 'kidney-left', 'kidney-right', 'lung-left', 'lung-right']);
  const expected = {
    brain: [[-1.2, 2.6, -1.1], [1.2, 4.7, 1.1]],
    heart: [[-.9, -.6, -.5], [.9, 1.5, 1.2]],
    'lung-right': [[-2.8, -.6, -1.2], [-.6, 2.9, 1.2]],
    'lung-left': [[.6, -.6, -1.2], [2.8, 2.9, 1.2]],
    'kidney-right': [[-2, -2.5, -.5], [-.6, -.6, .6]],
    'kidney-left': [[.6, -2.5, -.5], [2, -.6, .6]],
  };
  for (const mesh of meshes) {
    assert.ok(mesh.indices.length / 3 > 2000, `${mesh.name} must retain anatomical surface detail`);
    if(mesh.name.startsWith('kidney-'))assert.ok(mesh.indices.length/3>10000,`${mesh.name} must retain the higher-detail renal source`);
    assert.ok(mesh.position.length / 3 < mesh.indices.length / 2, `${mesh.name} must reuse its shared vertices`);
    const [min, max] = expected[mesh.name];
    for (let i = 0; i < mesh.position.length; i++) {
      assert.ok(mesh.position[i] >= min[i % 3] && mesh.position[i] <= max[i % 3], `${mesh.name} must retain its baked orientation and placement`);
    }
    for (let i = 0; i < mesh.normal.length; i += 3) {
      assert.ok(Math.abs(Math.hypot(...mesh.normal.subarray(i, i + 3)) - 1) < .001, `${mesh.name} has a non-unit normal`);
    }
  }
});

test('large meshes retain indexed buffers with a compatible fallback for WebGL 1', () => {
  const position = new Float32Array(65537 * 3), normal = new Float32Array(position.length);
  position.set([2, 3, 4], 65536 * 3);
  const geometry = { position, normal, indices: new Uint32Array([0, 65535, 65536]) };
  for (const supported of [true, false]) {
    const uploads = [];
    const renderer = Object.create(AnatomyRenderer.prototype);
    renderer.assets = []; renderer.uintIndices = supported ? {} : null;
    renderer.gl = { ARRAY_BUFFER: 1, ELEMENT_ARRAY_BUFFER: 2, STATIC_DRAW: 3, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125,
      createBuffer: () => ({}), bindBuffer: () => {}, bufferData: (target, data) => uploads.push({ target, data }) };
    const asset = renderer._asset(geometry, { id: 'brain' });
    assert.equal(asset.count, 3);
    if (supported) {
      assert.equal(asset.indexType, 5125);
      assert.equal(uploads[0].data, position);
      assert.equal(uploads[2].data, geometry.indices);
    } else {
      assert.equal(asset.indexType, undefined);
      assert.equal(uploads[0].data.length, 9);
      assert.deepEqual([...uploads[0].data.slice(6)], [2, 3, 4]);
    }
  }
});

test('imported heart and lung geometry retain physiology-driven animation about their pivots', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.metrics = { edv: 120, cvp: 6, respiratoryRate: 16, lungWater: 0 };
  renderer.beat = 0; renderer.time = 0;
  const heart = { id: 'heart', center: [.04, .42, .35] };
  const resting = renderer._model(heart);
  renderer.beat = 1;
  const contracting = renderer._model(heart);
  assert.ok(contracting[0] < resting[0]);
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(contracting[axis * 5] * heart.center[axis] + contracting[12 + axis] - heart.center[axis]) < 1e-6);
  }
  const lung = { id: 'lungs', center: [1.68, 1.13, 0] };
  const expiration = renderer._model(lung);
  renderer.time = 60 / 16 / 4;
  assert.ok(renderer._model(lung)[0] > expiration[0]);
  renderer.metrics.lungWater = 15;
  assert.ok(renderer._model(lung)[0] > 1.1);
});

test('cardiac chambers contract on independent atrial/ventricular timing, nonuniformly, with apex twist', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.metrics = { edv: 120, cvp: 6 };
  renderer.time = 0;
  const lv = { id: 'heart', chamber: 'lv', center: [.24, .20, .45] };
  const ra = { id: 'heart', chamber: 'ra', center: [-.24, .74, .20] };
  // Ventricular systole: `this.beat` drives LV contraction and apex twist;
  // the atrium is unaffected mid-systole because its kick fires in late diastole.
  renderer.beat = 1; renderer.heartPhase = 0;
  const lvSystole = renderer._model(lv);
  assert.ok(lvSystole[0] < 1, 'the LV short axis contracts during systole');
  assert.ok(lvSystole[0] < lvSystole[5], 'the short (radial) axis contracts more than the long (base-apex) axis');
  assert.ok(lv.twistAngle > 0, 'the LV apex twists during systole');
  const raQuiet = renderer._model(ra);
  assert.equal(raQuiet[0], 1, 'the atrium is not contracting mid-ventricular-systole');
  assert.equal(ra.twistAngle, 0, 'atria do not twist');
  // Atrial kick: a short late-diastolic contraction, independent of the
  // ventricular beat pulse.
  renderer.beat = 0; renderer.heartPhase = .92;
  assert.ok(renderer._model(ra)[0] < 1, 'the atrial kick contracts the atrium even with no ventricular beat');
});

test('brain pulsation amplitude grows with intracranial pressure and is damped by falling perfusion pressure', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.time = 0; renderer.beat = 1;
  const brainScale = (icp, cpp) => { renderer.metrics = { icp, cpp }; return renderer._model({ id: 'brain', center: [0, 3.62, 0] })[0]; };
  const normal = brainScale(5, 80), elevated = brainScale(30, 80), lowPerfusion = brainScale(30, 20);
  assert.ok(elevated > normal, 'a larger systolic swing accompanies reduced compliance at high ICP (Monro-Kellie)');
  assert.ok(lowPerfusion < elevated && lowPerfusion > 1, 'falling CPP damps, but does not reverse, the pulsatile swing at the same ICP');
});

test('the diaphragm and ribcage move in phase with the lungs across the respiratory cycle', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.metrics = { respiratoryRate: 16 };
  renderer.time = 0;
  const lung = { id: 'lungs', center: [1.68, 1.13, 0] }, diaphragm = { id: 'diaphragm', center: [0, -.7, .05] }, ribcage = { id: 'ribcage', center: [0, .5, .1] };
  const restLung = renderer._model(lung)[0], restDiaphragmY = renderer._model(diaphragm)[13], restRib = renderer._model(ribcage)[0];
  renderer.time = 60 / 16 / 4; // quarter cycle: peak of the shared breathing sine
  assert.ok(renderer._model(lung)[0] > restLung, 'lungs expand on inspiration');
  assert.ok(renderer._model(diaphragm)[13] < restDiaphragmY, 'the diaphragm descends as the lungs expand');
  assert.ok(renderer._model(ribcage)[0] > restRib, 'the ribcage widens as the lungs expand');
});

import { CEREBRAL_TEACHING_GRAPH, ANATOMICAL_ROUTE_COLLECTIONS, CIRCLE_OF_WILLIS_EDGES, ORGAN_OPACITY_KEYS, graphIsConnected } from '../src/anatomy.js';
test('imported tissue uses the packaged center as its animation pivot', async t => {
  const bytes = await readFile(new URL('../assets/organs/anatomy.glb', import.meta.url));
  const names = ['brain', 'heart', 'kidney-left', 'kidney-right', 'lung-left', 'lung-right'];
  const manifest = names.map(name => ({name, center: name === 'heart' ? [.21,.47,.31] : [0,0,0]}));
  // Invalid metadata must not introduce NaN transforms into the rendering path.
  manifest.find(record => record.name === 'lung-right').center = [0,NaN,0];
  t.mock.method(globalThis, 'fetch', async url => String(url).endsWith('manifest.json')
    ? {ok:true,json:async()=>manifest}
    : {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.assetController = new AbortController();
  renderer.canvas = {dispatchEvent:()=>{}};
  renderer.assets = [];
  renderer._asset = (geometry,options) => renderer.assets.push(options);
  await renderer._loadOrgans();
  const heart = renderer.assets.find(asset => asset.id === 'heart');
  assert.deepEqual(heart.center, [.21,.47,.31]);
  assert.deepEqual(renderer.assets.find(asset => asset.id === 'lungs' && asset.side === -1).center, [-1.68,1.13,0]);
  renderer.metrics = {edv:120,cvp:6}; renderer.beat = 1; renderer.time = 0;
  const model = renderer._model(heart);
  for(let axis=0;axis<3;axis++)assert.ok(Math.abs(model[axis*5]*heart.center[axis]+model[12+axis]-heart.center[axis])<1e-6);
});

test('basal cerebral arteries preserve patient laterality and anterior-posterior anatomy', () => {
  const p = CEREBRAL_NODE_POSITIONS;
  for(const artery of ['internal-carotid','aca','mca','pca','posterior-communicating','vertebral']){
    assert.ok(p[`left-${artery}`][0]>0,`left ${artery} must be on patient left (+X)`);
    assert.ok(p[`right-${artery}`][0]<0,`right ${artery} must be on patient right (-X)`);
  }
  // The teaching graph also includes the ascending vertebral inflow below the circle.
  const circle = [...new Set(CIRCLE_OF_WILLIS_EDGES.flat())].filter(name=>!name.endsWith('vertebral')).map(name=>p[name]);
  const extent = axis => Math.max(...circle.map(v=>v[axis]))-Math.min(...circle.map(v=>v[axis]));
  assert.ok(extent(1)<.15,'Circle of Willis should lie in a basal transverse plane');
  assert.ok(extent(2)>.5,'the circle must extend anteriorly and posteriorly, not form a frontal diagram');
  assert.ok(circle.every(v=>v[1]>3.1&&v[1]<3.5),'the circle must remain near the base of the cerebrum');
  for(const side of ['left','right']){
    assert.ok(p[`${side}-aca`][2]>p[`${side}-internal-carotid`][2]);
    assert.ok(p[`${side}-pca`][2]<p[`${side}-internal-carotid`][2]);
    assert.ok(Math.abs(p[`${side}-mca`][0])>Math.abs(p[`${side}-internal-carotid`][0]));
    assert.ok(p[`${side}-vertebral`][1]<p.basilar[1],'vertebral inflow ascends toward the basilar apex');
    assert.ok(p[`${side}-vertebral`][2]>.19,'vertebral inflow stays ventral to the source brainstem');
  }
  assert.ok(p.basilar[2]>.19&&p.basilar[2]<p['anterior-communicating'][2],'basilar trunk lies ventral to pons and posterior to the anterior circle');
  const renderer = routeRenderer();
  for(const side of [-1,1]){
    const route = renderer.routes.find(r=>r.name===`${side}-carotid-inflow`);
    assert.ok(route.path.at(-1)[0]*side>0,'cervical carotids must enter the ipsilateral circle');
  }
});

test('canonical cerebral teaching graph has connected Circle of Willis and labeled territories', () => {
  const required = ['left-internal-carotid', 'right-internal-carotid', 'left-aca', 'right-aca', 'anterior-communicating', 'left-mca', 'right-mca', 'left-pca', 'right-pca', 'left-posterior-communicating', 'right-posterior-communicating', 'basilar', 'left-vertebral', 'right-vertebral'];
  assert.ok(required.every(node => CEREBRAL_TEACHING_GRAPH.nodes.includes(node)));
  const circleNodes = [...new Set(CIRCLE_OF_WILLIS_EDGES.flat())];
  assert.ok(graphIsConnected(circleNodes, CIRCLE_OF_WILLIS_EDGES));
  for (const territory of ['aca-capillary-bed', 'mca-capillary-bed', 'pca-capillary-bed']) assert.match(CEREBRAL_TEACHING_GRAPH.labels[territory], /schematic capillary bed/);
});

test('arterial, venous, and urine route collections are semantically disjoint', () => {
  const collections = Object.values(ANATOMICAL_ROUTE_COLLECTIONS).map(routes => new Set(routes));
  for (let i = 0; i < collections.length; i++) for (let j = i + 1; j < collections.length; j++) for (const route of collections[i]) assert.ok(!collections[j].has(route), `${route} reused across route collections`);
  assert.ok(ANATOMICAL_ROUTE_COLLECTIONS.urine.every(route => /collecting|calyces|pelvis|ureter|bladder|outlet/.test(route)));
});

test('canonical vessel nodes all have learner-facing labels and urine route stays separate', () => {
  for (const node of CEREBRAL_TEACHING_GRAPH.nodes) assert.ok(CEREBRAL_TEACHING_GRAPH.labels[node], `${node} needs a visible label`);
  assert.ok(ANATOMICAL_ROUTE_COLLECTIONS.urine.every(route => route.includes('->')));
  assert.ok(!ANATOMICAL_ROUTE_COLLECTIONS.arterial.some(route => route.includes('ureter')));
});

test('organ opacity updates are bounded and isolated', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.layers = { particles: true, labels: true, vessels: true, transparent: false, opacity: { brain: 1, lungs: 1, kidneys: 1 } };
  renderer.setLayers({ opacity: { brain: .35, lungs: 2, kidneys: -.5 } });
  assert.deepEqual(ORGAN_OPACITY_KEYS.map(key => renderer.layers.opacity[key]), [.35, 1, 0]);
  renderer.setLayers({ opacity: { brain: Number.NaN, lungs: Infinity } });
  assert.deepEqual(ORGAN_OPACITY_KEYS.map(key => renderer.layers.opacity[key]), [.35, 1, 0]);
});

test('procedural shells provide an identifiable fallback when surfaces are gated', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.assets = [];
  renderer._asset = (geometry, options) => { renderer.assets.push({ geometry, ...options }); return renderer.assets.at(-1); };
  renderer._buildFallbackOrgans();
  assert.equal(renderer.assets.length, 9);
  assert.deepEqual(renderer.assets.map(asset => asset.id), ['brain', 'heart', 'heart', 'heart', 'heart', 'lungs', 'lungs', 'kidneys', 'kidneys']);
  assert.ok(renderer.assets.every(asset => asset.procedural && asset.geometry.position.length > 0));
  // The fallback heart is four independently animatable chambers, not one blob.
  assert.deepEqual(renderer.assets.filter(asset => asset.id === 'heart').map(asset => asset.chamber), ['ra', 'rv', 'la', 'lv']);
});

import { CEREBRAL_NODE_POSITIONS, URINE_NODE_POSITIONS } from '../src/anatomy.js';
import { mat4Identity } from '../src/math3d.js';
function routeRenderer(){
  const renderer=Object.create(AnatomyRenderer.prototype);
  renderer.assets=[];renderer.routes=[];
  renderer._asset=(g,options)=>{const asset={...options,geometry:g};renderer.assets.push(asset);return asset;};
  renderer._buildVessels();return renderer;
}
test('live brain geometry uses every canonical edge and exact shared endpoints',()=>{
  const renderer=routeRenderer();
  for(const [from,to] of CEREBRAL_TEACHING_GRAPH.edges){
    const route=renderer.routes.find(r=>r.name===`${from}->${to}`);
    assert.ok(route,`rendered route ${from}->${to}`);
    assert.deepEqual(route.path[0],CEREBRAL_NODE_POSITIONS[from]);
    assert.deepEqual(route.path.at(-1),CEREBRAL_NODE_POSITIONS[to]);
    assert.equal(route.semantic,ANATOMICAL_ROUTE_COLLECTIONS.venous.includes(route.name)?'venous':'arterial');
  }
});
test('urine and blood runtime semantics stay disjoint across camera selection',()=>{
  const renderer=routeRenderer();renderer.canvas={clientWidth:600,clientHeight:600};
  const before=renderer.routes.map(r=>r.group);
  for(const view of ['kidneys','brain','whole','kidneys'])renderer.setView(view);
  assert.deepEqual(renderer.routes.map(r=>r.group),before);
  const urine=renderer.routes.filter(r=>r.semantic==='urine');
  assert.equal(urine.length,9);
  assert.ok(urine.every(r=>r.group==='urine'&&r.asset.id==='urine'));
  assert.ok(urine.some(r=>r.path.at(-1).every((p,i)=>p===URINE_NODE_POSITIONS.outlet[i])));
  assert.ok(renderer.routes.filter(r=>r.group==='renal').every(r=>r.semantic!=='urine'));
});
test('regional blood and urine particles freeze at zero local flow independently',()=>{
  const renderer=routeRenderer();renderer.metrics={co:5,hr:72,brainFlow:0,renalFlow:0,urineOutput:0,cerebralTerritories:{aca:0,mca:0,pca:0}};
  renderer.time=0;renderer.heartPhase=0;renderer._draw=()=>{};
  renderer.update({},1);
  for(const r of renderer.routes.filter(r=>['brain','renal','urine'].includes(r.group)))assert.equal(r.phase,0);
  renderer.update({urineOutput:60},1);
  assert.ok(renderer.routes.filter(r=>r.semantic==='urine').every(r=>r.phase>0));
  assert.ok(renderer.routes.filter(r=>r.group==='renal').every(r=>r.phase===0));
});
test('learner overlay receives complete live labels, units and noncolor zero-flow states',()=>{
  const renderer=Object.create(AnatomyRenderer.prototype);
  renderer.vp=mat4Identity();renderer.canvas={clientWidth:390,clientHeight:844};
  renderer.layers={labels:true};renderer.metrics={brainFlow:0,renalFlow:0,urineOutput:0};
  renderer.view='brain';const brain=renderer.getLabels();
  assert.ok(CEREBRAL_TEACHING_GRAPH.nodes.every(id=>brain.some(l=>l.id===id&&l.visible&&l.kind==='anatomy')));
  assert.match(brain.find(l=>l.id==='brain-flow').text,/■ No flow/);
  renderer.view='kidneys';const renal=renderer.getLabels();
  assert.ok(Object.keys(URINE_NODE_POSITIONS).every(id=>renal.some(l=>l.id===id)));
  assert.match(renal.find(l=>l.id==='urine-flow').text,/mL\/h.*No flow/);
  renderer.view='whole';assert.equal(renderer.getLabels().length,4);
});
