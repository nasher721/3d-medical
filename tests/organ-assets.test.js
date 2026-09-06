import test from "node:test";
import assert from "node:assert/strict";
import { parseOrganGLB, loadOrganAssets, assertAssetReleaseAllowed } from "../src/organ-assets.js";

function fixture({ badIndex = false, stride = 12, shortNormals = false, missingMeshes = false, badBounds = false, extensions = false, externalBuffer = false, transformed = false } = {}) {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const normals = new Float32Array(shortNormals ? [0, 0, 1, 0, 0, 1] : [0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const index = new Uint16Array(badIndex ? [0, 1, 3] : [0, 1, 2]);
  const bin = new Uint8Array(positions.byteLength + normals.byteLength + index.byteLength);
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(new Uint8Array(normals.buffer), positions.byteLength);
  bin.set(new Uint8Array(index.buffer), positions.byteLength + normals.byteLength);
  const paddedBin = new Uint8Array((bin.byteLength + 3) & ~3);
  paddedBin.set(bin);
  const gltf = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: bin.byteLength, ...(externalBuffer ? { uri: 'external.bin' } : {}) }],
    ...(extensions ? { extensionsUsed: ['UNSUPPORTED_feature'] } : {}),
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, ...(stride === 12 ? {} : { byteStride: stride }) },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength },
      { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: index.byteLength },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", ...(badBounds ? { min: [0, 0, 0], max: [2, 1, 0] } : {}) },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    ...(missingMeshes ? {} : { meshes: [{ name: "Test organ", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 }] }] }),
    ...(transformed ? { nodes: [{ name: 'Test organ', mesh: 0, translation: [1, 0, 0] }] } : {}),
  };
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPadded = new Uint8Array((json.byteLength + 3) & ~3).fill(0x20);
  jsonPadded.set(json);
  const total = 12 + 8 + jsonPadded.byteLength + 8 + paddedBin.byteLength;
  const result = new Uint8Array(total);
  const view = new DataView(result.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonPadded.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  result.set(jsonPadded, 20);
  const binHeader = 20 + jsonPadded.byteLength;
  view.setUint32(binHeader, paddedBin.byteLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  result.set(paddedBin, binHeader + 8);
  return result.buffer;
}

test("parses named mesh while preserving triangle indices", () => {
  const [organ] = parseOrganGLB(fixture());
  assert.equal(organ.name, "Test organ");
  assert.deepEqual([...organ.indices], [0, 1, 2]);
  assert.deepEqual([...organ.position], [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual([...organ.normal], [0, 0, 1, 0, 0, 1, 0, 0, 1]);
});

test("rejects an index outside the vertex range", () => {
  assert.throws(() => parseOrganGLB(fixture({ badIndex: true })), /index references a missing vertex/);
});

test("rejects mismatched normal counts and missing mesh declarations", () => {
  assert.throws(() => parseOrganGLB(fixture({ shortNormals: true })), /POSITION and NORMAL counts differ/);
  assert.throws(() => parseOrganGLB(fixture({ missingMeshes: true })), /meshes array is required/);
});

test("rejects malformed GLB headers", () => {
  assert.throws(() => parseOrganGLB(new ArrayBuffer(20)), /unsupported GLB header/);
});

test('rejects unsupported extensions, external buffers, transforms, and mismatched accessor bounds', () => {
  assert.throws(() => parseOrganGLB(fixture({ extensions: true })), /extensions are unsupported/);
  assert.throws(() => parseOrganGLB(fixture({ externalBuffer: true })), /external or multiple buffers are unsupported/);
  assert.throws(() => parseOrganGLB(fixture({ transformed: true })), /non-identity node transform/);
  assert.throws(() => parseOrganGLB(fixture({ badBounds: true })), /bounds do not match decoded values/);
});

test("loads and parses fetched assets", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => fixture() });
  try {
    const assets = await loadOrganAssets("/organs.glb");
    assert.equal(assets[0].name, "Test organ");
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test('blocks distribution and release-mode loading for unresolved provenance', async () => {
  const blocked = [{ name: 'brain', provenanceStatus: 'blocked-pending-review', derivativeReleaseAllowed: false }];
  assert.throws(() => assertAssetReleaseAllowed(blocked), /release blocked/);
  await assert.rejects(() => loadOrganAssets('/organs.glb', { release: true, manifest: blocked }), /release blocked/);
  assert.equal(assertAssetReleaseAllowed([{ name: 'brain', provenanceStatus: 'reviewed', derivativeReleaseAllowed: true }]), true);
});
