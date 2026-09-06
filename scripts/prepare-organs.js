// Offline source preparation: node scripts/prepare-organs.js <BodyParts3D OBJ directory>
// See assets/organs/README.md for source, license, and glTF Transform packaging.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assertAssetReleaseAllowed } from '../src/organ-assets.js';

const source = process.argv[2];
if (!source) throw new Error('Supply the extracted BodyParts3D OBJ directory.');
const existingManifest = JSON.parse(await readFile('assets/organs/manifest.json', 'utf8'));
// Local preview follows build.js; distribution still requires reviewed provenance.
if (!process.argv.includes('--preview') || process.argv.includes('--release')) assertAssetReleaseAllowed(existingManifest);
const kidneySourceIndex = process.argv.indexOf('--kidney-source');
const kidneySource = kidneySourceIndex < 0 ? null : process.argv[kidneySourceIndex + 1];
if (kidneySourceIndex >= 0 && (!kidneySource || kidneySource.startsWith('--'))) throw new Error('Supply the 95% kidney OBJ directory after --kidney-source.');
const definitions = [
  { name: 'brain', sources: ['BP49', 'BP50', 'BP51', 'FMA67943', 'FMA72653', 'FMA72654', 'FMA72655', 'FMA72656', 'FMA72661', 'FMA72662', 'FMA72665', 'FMA72666', 'FMA72667', 'FMA72668', 'FMA72669', 'FMA72670', 'FMA72685', 'FMA72686', 'FMA72687', 'FMA72688', 'FMA72689', 'FMA72690', 'FMA72701', 'FMA72702', 'FMA72705', 'FMA72706', 'FMA72717', 'FMA72718', 'FMA72800', 'FMA72801', 'FMA72804', 'FMA72805', 'FMA72975', 'FMA72976', 'FMA72977', 'FMA72978', 'FMA67944', 'FMA61993nsn', 'FMA62004'], group: 'brain', center: [0, 3.62, 0], size: [2.3, 1.5, 1.9] },
  { name: 'heart', sources: ['FMA7274'], group: 'heart', center: [.04, .42, .35], size: [1.5, 1.9, 1.35] },
  { name: 'lung-right', sources: ['FMA7333', 'FMA7337', 'FMA7383'], group: 'lungs', center: [-1.68, 1.13, 0], size: [1.85, 3.08, 2.2] },
  { name: 'lung-left', sources: ['FMA7370', 'FMA7371'], group: 'lungs', center: [1.68, 1.13, 0], size: [1.85, 3.08, 2.2] },
  { name: 'kidney-right', sources: ['FMA7204'], group: 'kidneys', center: [-1.32, -1.59, .08], size: [1.06, 1.54, .95] },
  { name: 'kidney-left', sources: ['FMA7205'], group: 'kidneys', center: [1.32, -1.59, .08], size: [1.06, 1.54, .95] },
];
const files = await readdir(source, { recursive: true });
const kidneyFiles = kidneySource ? await readdir(kidneySource, { recursive: true }) : null;
const meshes = [];
for (const definition of definitions) {
  const vertices = [], faces = [], weld = new Map();
  const sourceFiles = [], sourceSHA256 = {};
  for (const fma of definition.sources) {
    const useKidneySource = kidneySource && definition.group === 'kidneys';
    const file = (useKidneySource ? kidneyFiles : files).find(file => file.split(/[\\/]/).at(-1).toLowerCase() === `${fma.toLowerCase()}.obj`);
    if (!file) throw new Error(`Missing source: ${fma}.obj`);
    sourceFiles.push(file);
    const local = [];
    const contents = await readFile(join(useKidneySource ? kidneySource : source, file), 'utf8');
    sourceSHA256[file] = createHash('sha256').update(contents).digest('hex');
    for (const line of contents.split(/\r?\n/)) {
      const [type, ...fields] = line.trim().split(/\s+/);
      if (type === 'v') {
        const [x, y, z] = fields.map(Number);
        if (![x, y, z].every(Number.isFinite)) throw new Error(`Invalid vertex: ${file}`);
        // BodyParts3D: Z superior, negative Y anterior. Preserve handedness.
        const vertex = [x, z, -y], key = vertex.map(v => v.toFixed(6)).join(',');
        if (!weld.has(key)) { weld.set(key, vertices.length); vertices.push(vertex); }
        local.push(weld.get(key));
      }
      if (type === 'f') {
        const indices = fields.map(field => { const n = Number(field.split('/')[0]); return n < 0 ? local.length + n : n - 1; });
        if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= local.length)) throw new Error(`Invalid face: ${file}`);
        for (let i = 1; i < indices.length - 1; i++) faces.push([local[indices[0]], local[indices[i]], local[indices[i + 1]]]);
      }
    }
  }
  if (!vertices.length || !faces.length) throw new Error(`Empty source: ${definition.name}`);
  const min = [0, 1, 2].map(axis => vertices.reduce((a, v) => Math.min(a, v[axis]), Infinity));
  const max = [0, 1, 2].map(axis => vertices.reduce((a, v) => Math.max(a, v[axis]), -Infinity));
  meshes.push({ ...definition, file: sourceFiles, sourceSHA256, vertices, faces, min, max, scale: Math.min(...definition.size.map((size, axis) => size / (max[axis] - min[axis]))) });
}

const gltf = { asset: { version: '2.0', generator: 'Flowstate anatomical source preparation', copyright: 'BodyParts3D, Copyright© Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
const chunks = [];
function accessor(values, componentType, type, target, bounds) {
  const buffer = Buffer.from(values.buffer);
  const view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: gltf.buffers[0].byteLength, byteLength: buffer.length, target });
  chunks.push(buffer);
  const padding = (4 - buffer.length % 4) % 4;
  if (padding) chunks.push(Buffer.alloc(padding));
  gltf.buffers[0].byteLength += buffer.length + padding;
  gltf.accessors.push({ bufferView: view, componentType, count: values.length / (type === 'VEC3' ? 3 : 1), type, ...bounds });
  return gltf.accessors.length - 1;
}
const report = [];
// One scale preserves relative organ dimensions. Centers remain an exploded
// teaching layout; bilateral superior/inferior offsets come from the source.
const factor = Math.min(...meshes.filter(mesh => mesh.group === 'lungs').map(mesh => mesh.scale));
for (const mesh of meshes) {
  const sourceCenter = mesh.min.map((value, axis) => (value + mesh.max[axis]) / 2);
  const pair = meshes.filter(other => other.group === mesh.group);
  if (pair.length === 2) mesh.center[1] += (sourceCenter[1] - pair.reduce((sum, other) => sum + (other.min[1] + other.max[1]) / 2, 0) / 2) * factor;
  const positions = new Float32Array(mesh.vertices.flatMap(vertex => vertex.map((value, axis) => (value - (mesh.min[axis] + mesh.max[axis]) / 2) * factor + mesh.center[axis])));
  const normals = new Float32Array(positions.length);
  const indices = [], seenFaces = new Set(), firstNormal = new Map();
  for (const face of mesh.faces) {
    const [a, b, c] = face.map(index => positions.subarray(index * 3, index * 3 + 3));
    const u = b.map((value, axis) => value - a[axis]), v = c.map((value, axis) => value - a[axis]);
    const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    if (Math.hypot(...n) < 1e-12) continue;
    const faceKey = [...face].sort((a, b) => a - b).join(',');
    if (seenFaces.has(faceKey)) continue;
    seenFaces.add(faceKey);
    indices.push(...face);
    for (const index of face) if (!firstNormal.has(index)) firstNormal.set(index, n);
    for (const index of face) for (let axis = 0; axis < 3; axis++) normals[index * 3 + axis] += n[axis];
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (length > 1e-12) for (let axis = 0; axis < 3; axis++) normals[i + axis] /= length;
    else if (firstNormal.has(i / 3)) {
      const n = firstNormal.get(i / 3), magnitude = Math.hypot(...n);
      for (let axis = 0; axis < 3; axis++) normals[i + axis] = n[axis] / magnitude;
    }

  }
  const min = mesh.min.map((value, axis) => (value - (mesh.min[axis] + mesh.max[axis]) / 2) * factor + mesh.center[axis]);
  const max = mesh.max.map((value, axis) => (value - (mesh.min[axis] + mesh.max[axis]) / 2) * factor + mesh.center[axis]);
  const used = [...new Set(indices)], remap = new Map(used.map((index, i) => [index, i]));
  const packedPositions = new Float32Array(used.flatMap(index => [...positions.subarray(index * 3, index * 3 + 3)]));
  const packedNormals = new Float32Array(used.flatMap(index => [...normals.subarray(index * 3, index * 3 + 3)]));
  const position = accessor(packedPositions, 5126, 'VEC3', 34962, { min, max });
  const normal = accessor(packedNormals, 5126, 'VEC3', 34962);
  const index = accessor(new Uint32Array(indices.map(index => remap.get(index))), 5125, 'SCALAR', 34963);
  const id = gltf.meshes.length;
  gltf.meshes.push({ name: mesh.name, primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: index, mode: 4 }] });
  gltf.nodes.push({ name: mesh.name, mesh: id });
  gltf.scenes[0].nodes.push(id);
  const previous = existingManifest.find(record => record.name === mesh.name);
  if (!previous) throw new Error(`Missing provenance record: ${mesh.name}`);
  const highDetail = kidneySource && mesh.group === 'kidneys';
  const sourceChanged = mesh.file.some(file => previous.sourceSHA256?.[file] !== mesh.sourceSHA256[file]);
  const provenance = {
    sourceRelease: `BodyParts3D 3.0 (2011-09-15), ${highDetail ? 95 : 99}% polygon-reduction OBJ`,
    sourceArchive: previous.sourceArchive.replace(/_(95|99)\.zip$/, `_${highDetail ? 95 : 99}.zip`),
    sourceArchiveContentLengthBytes: highDetail ? 547270545 : 134113358,
    sourceArchiveLastModified: highDetail ? undefined : '2011-09-11',
    ...(sourceChanged ? { provenanceStatus: 'blocked-pending-review', derivativeReleaseAllowed: false } : {}),
  };
  report.push({ ...previous, ...provenance, name: mesh.name, source: mesh.file,
    center: mesh.center, sourceSHA256: mesh.sourceSHA256, sourceBounds: { min: mesh.min, max: mesh.max },
    normalizedTransform: { coordinateSystem: 'X-left, Y-up, Z-anterior', pivot: 'baked organ center',
      scale: factor, sourceUnits: 'mm', layout: 'exploded teaching centers; source-relative sizes and bilateral height offsets' },
    vertices: packedPositions.length / 3, triangles: indices.length / 3, min, max });
}
const json = Buffer.from(JSON.stringify(gltf)), jsonPad = Buffer.alloc((4 - json.length % 4) % 4, 0x20);
if (!process.argv.includes('--preview') || process.argv.includes('--release')) assertAssetReleaseAllowed(report);
const bin = Buffer.concat(chunks);
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + jsonPad.length + 8 + bin.length, 8);
jsonHeader.writeUInt32LE(json.length + jsonPad.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
await mkdir('assets/organs', { recursive: true });
await mkdir('tmp', { recursive: true });
await writeFile('tmp/anatomy-source.glb', Buffer.concat([header, jsonHeader, json, jsonPad, binHeader, bin]));
await writeFile('assets/organs/manifest.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
