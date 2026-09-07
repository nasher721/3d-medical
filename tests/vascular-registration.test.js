import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceRegistrationOffsets, loadRegisteredVasculature } from '../src/vascular-registration.js';
import { AnatomyRenderer, CEREBRAL_NODE_POSITIONS } from '../src/anatomy.js';

const manifest=JSON.parse(await readFile(new URL('../assets/organs/manifest.json',import.meta.url)));
test('registration restores one shared source coordinate frame without resizing organs',()=>{
  const offsets=sourceRegistrationOffsets(manifest),heart=manifest.find(r=>r.name==='heart');
  for(const a of manifest)for(const b of manifest)for(let i=0;i<3;i++){
    const worldDelta=a.center[i]+offsets[a.name][i]-b.center[i]-offsets[b.name][i];
    const sourceDelta=(a.sourceBounds.min[i]+a.sourceBounds.max[i]-b.sourceBounds.min[i]-b.sourceBounds.max[i])/2;
    assert.ok(Math.abs(worldDelta-sourceDelta*heart.normalizedTransform.scale)<1e-9);
  }
  assert.deepEqual(offsets.heart,[0,0,0]);
});
test('registered tissue and schematic cerebral routes use identical translation conventions',()=>{
  const r=Object.create(AnatomyRenderer.prototype);r.metrics={};r.beat=0;r.time=0;
  const offset=sourceRegistrationOffsets(manifest).brain;
  const tissue=r._model({id:'brain',center:[0,3.62,0],registrationOffset:offset});
  const vessel=r._model({id:'vessels',registrationOffset:offset});
  assert.deepEqual([...tissue],[...vessel]);
});
test('registration rejects independently scaled or invalid source metadata',()=>{
  const records=structuredClone(manifest);records[0].normalizedTransform.scale*=2;
  assert.throws(()=>sourceRegistrationOffsets(records),/Inconsistent/);
});

test('real vascular bundle replaces schematic major vessels and keeps cerebral overlays registered',async t=>{
  const vascular=JSON.parse(await readFile(new URL('../assets/organs/vascular-manifest.json',import.meta.url)));
  const bytes=await readFile(new URL('../assets/organs/vasculature.glb',import.meta.url));
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?{ok:true,json:async()=>vascular}:{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  const r=Object.create(AnatomyRenderer.prototype);
  r.organManifest=manifest;r.assetController=new AbortController();r.assets=[];r.routes=[];
  r.cerebralPositions=CEREBRAL_NODE_POSITIONS;
  r._asset=(g,options)=>{const a={...options};r.assets.push(a);return a;};
  r._buildVessels();
  for(const record of manifest)r.assets.push({id:record.name.split('-')[0],sourceName:record.name,tissue:true,center:record.center});
  r.particleBuffers={};r.gl={deleteBuffer:()=>{}};r._buildParticles=()=>{};r.resetCamera=()=>{};r.canvas={dispatchEvent:()=>{}};
  await loadRegisteredVasculature(r);
  assert.equal(r.vascularAssetError,undefined);
  assert.equal(r.registeredVasculature,true);
  assert.equal(r.assets.filter(a=>a.sourceVessel).length,vascular.length);
  assert.ok(r.assets.filter(a=>a.id==='vessels'&&a.group==='systemic'&&!a.sourceVessel).every(a=>a.superseded));
  assert.ok(r.assets.filter(a=>a.id==='vessels'&&a.group==='brain'&&!a.superseded&&!a.sourceVessel&&!a.name.includes('registered')).every(a=>a.registrationOffset));
  assert.equal(r.routes.filter(route=>route.name.includes('registered-')).length,6,'bilateral carotid, vertebral and jugular connectors');
  assert.ok(r.assets.filter(a=>a.tissue).every(a=>a.registrationOffset));
});

test('an interrupted GPU upload restores the previous scene and disposes partial assets',async t=>{
  const vascular=JSON.parse(await readFile(new URL('../assets/organs/vascular-manifest.json',import.meta.url)));
  const bytes=await readFile(new URL('../assets/organs/vasculature.glb',import.meta.url));
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?{ok:true,json:async()=>vascular}:{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  const original={id:'vessels',group:'systemic'},deleted=[];
  const r={organManifest:manifest,assetController:new AbortController(),assets:[original],routes:[],particleBuffers:{},gl:{deleteBuffer:b=>deleted.push(b)}};
  let uploads=0;
  r._asset=()=>{if(uploads++)throw new Error('GPU upload interrupted');r.assets.push({buffers:{position:'partial-buffer'}});};
  await loadRegisteredVasculature(r);
  assert.equal(r.assets.length,1);assert.equal(r.assets[0],original);assert.equal(original.superseded,undefined);
  assert.equal(r.registeredVasculature,false);assert.equal(r.registrationOffsets,undefined);
  assert.deepEqual(deleted,['partial-buffer']);
  assert.match(r.vascularAssetError,/GPU upload interrupted/);
});

test('invalid vascular metadata leaves the original teaching scene untouched',async t=>{
  const bytes=await readFile(new URL('../assets/organs/vasculature.glb',import.meta.url));
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?{ok:true,json:async()=>[]}:{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  const r={organManifest:manifest,assetController:new AbortController(),assets:[{id:'vessels',group:'systemic'}]};
  await loadRegisteredVasculature(r);
  assert.match(r.vascularAssetError,/manifest mismatch/);
  assert.equal(r.registeredVasculature,undefined);
  assert.deepEqual(r.assets,[{id:'vessels',group:'systemic'}]);
});
