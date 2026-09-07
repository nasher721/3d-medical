import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseOrganGLB } from '../src/organ-assets.js';
import { spawnSync } from 'node:child_process';

test('registered vascular asset has finite indexed named source meshes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/organs/vascular-manifest.json', import.meta.url), 'utf8'));
  const bytes = await readFile(new URL('../assets/organs/vasculature.glb', import.meta.url));
  const meshes = parseOrganGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(meshes.length, manifest.length);
  assert.equal(meshes.length,56);
  assert.ok(bytes.length<3_000_000,'vascular bundle stays under 3 MB');
  assert.equal(new Set(meshes.map((mesh) => mesh.name)).size, meshes.length);
  assert.ok(manifest.every((mesh) => mesh.source?.length && mesh.group && typeof mesh.oxygenated === 'boolean'));
  assert.equal(manifest[0].registration.scale, 0.011900162274940116);
  assert.deepEqual(manifest[0].registration.heartCenter, [0.04, 0.42, 0.35]);
  assert.ok(manifest.some((record) => record.source[0] === 'FMA66326.obj' && record.oxygenated === false));
  assert.ok(manifest.some((record) => record.source[0] === 'FMA66643.obj' && record.oxygenated === true));
  assert.ok(manifest.some((record) => record.source[0] === 'FMA4754.obj' && record.name === 'right-internal-jugular' && record.oxygenated === false));
  const organs=JSON.parse(await readFile(new URL('../assets/organs/manifest.json',import.meta.url)));
  const heart=organs.find(r=>r.name==='heart');
  const center=heart.sourceBounds.min.map((v,i)=>(v+heart.sourceBounds.max[i])/2);
  for(const record of manifest){
    assert.deepEqual(record.registration.heartSourceCenter,center,'anchor is already rotated into runtime coordinates');
    assert.equal(record.normalizedTransform.coordinateSystem,'X-left, Y-up, Z-anterior');
    assert.equal(record.oxygenated,record.group==='pulmonary'?record.semantic==='venous':record.semantic==='arterial');
    assert.equal(record.derivativeReleaseAllowed,false);
    assert.equal(record.provenanceStatus,'blocked-pending-review');
    assert.match(record.sourceSHA256[record.source[0]],/^[a-f0-9]{64}$/);
  }
  const ascending=meshes.find(m=>m.name==='aorta-ascending');
  for(let i=0;i<ascending.position.length;i+=3){
    assert.ok(ascending.position[i]>-.5&&ascending.position[i]<.3);
    assert.ok(ascending.position[i+1]>.5&&ascending.position[i+1]<1.4,'ascending aorta stays at the heart, not 14 units above it');
    assert.ok(ascending.position[i+2]>0&&ascending.position[i+2]<.8);
  }
  for (const mesh of meshes) {
    assert.ok(mesh.position.every(Number.isFinite), `${mesh.name} positions`);
    assert.ok(mesh.normal.every(Number.isFinite), `${mesh.name} normals`);
    assert.ok(mesh.indices.length >= 3 && mesh.indices.length % 3 === 0, `${mesh.name} triangles`);
    assert.ok(mesh.indices.every((index) => Number.isInteger(index) && index >= 0 && index < mesh.position.length / 3), `${mesh.name} index bounds`);
    for (let i = 0; i < mesh.normal.length; i += 3) assert.ok(Math.abs(Math.hypot(mesh.normal[i], mesh.normal[i + 1], mesh.normal[i + 2]) - 1) < 1e-3, `${mesh.name} normals normalized`);
  }
});

test('vascular preparation cannot bypass release gate with preview flag',()=>{
  const result=spawnSync(process.execPath,['scripts/prepare-vasculature.js','tmp/bodyparts.zip','--preview','--release'],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/release blocked/);
});
