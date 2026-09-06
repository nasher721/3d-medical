import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseOrganGLB } from '../src/organ-assets.js';

const manifestURL = new URL('../assets/organs/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestURL, 'utf8'));
const bytes = await readFile(new URL('../assets/organs/anatomy.glb', import.meta.url));
const meshes = parseOrganGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

test('all packaged organs preserve source proportions with one uniform scale', () => {
  const factor = manifest[0].normalizedTransform.scale;
  assert.ok(factor > 0 && factor < 1);
  for (const record of manifest) {
    assert.equal(record.normalizedTransform.scale, factor, `${record.name} must not be independently resized`);
    const mesh = meshes.find(mesh => mesh.name === record.name);
    for (let axis = 0; axis < 3; axis++) {
      let min = Infinity, max = -Infinity;
      for (let i = axis; i < mesh.position.length; i += 3) {
        min = Math.min(min, mesh.position[i]); max = Math.max(max, mesh.position[i]);
      }
      const sourceExtent = record.sourceBounds.max[axis] - record.sourceBounds.min[axis];
      assert.ok(Math.abs(max - min - sourceExtent * factor) < 1e-4, `${record.name} axis ${axis} must retain source extent`);
      assert.ok(Math.abs((min + max) / 2 - record.center[axis]) < 1e-4, 'animation pivot must match baked geometry');
    }
  }
});

test('bilateral kidney height difference is retained from the source', () => {
  const right = manifest.find(record => record.name === 'kidney-right');
  const left = manifest.find(record => record.name === 'kidney-left');
  const centerY = record => (record.sourceBounds.min[1] + record.sourceBounds.max[1]) / 2;
  assert.ok(left.center[1] > right.center[1], 'right kidney is inferior to left in this source anatomy');
  assert.ok(Math.abs(left.center[1] - right.center[1] - (centerY(left) - centerY(right)) * left.normalizedTransform.scale) < 1e-6);
  for (const record of [right, left]) {
    assert.ok(record.triangles > 10000, 'retain the higher-detail source surface');
    assert.match(record.sourceArchive, /_95\.zip$/);
  }
});

test('preparation preserves source attribution, hashes and distribution restrictions', () => {
  for (const record of manifest) {
    assert.ok(record.sourceREADME && record.archivedLicenseEvidence && record.currentLicenseEvidence);
    assert.equal(record.derivativeReleaseAllowed, false);
    assert.equal(record.provenanceStatus, 'blocked-pending-review');
    for (const source of record.source) assert.match(record.sourceSHA256[source], /^[0-9a-f]{64}$/);
  }
  const result = spawnSync(process.execPath, ['scripts/prepare-organs.js', 'tmp/bodyparts', '--preview', '--release'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release blocked by provenance/);
});
