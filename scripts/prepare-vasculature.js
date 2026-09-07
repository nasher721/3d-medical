// Build the registered vascular surface bundle from BodyParts3D OBJ sources.
// Usage: node scripts/prepare-vasculature.js <directory|BodyParts3D zip> [--preview]
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const input = resolve(process.argv[2] || 'tmp/bodyparts.zip');
const preview = process.argv.includes('--preview');
const release = process.argv.includes('--release');
if (release) throw new Error('Vascular release blocked: BodyParts3D provenance is unresolved');
if (!preview) throw new Error('Vascular preparation requires --preview; release packaging is intentionally gated');
const archive = input.toLowerCase().endsWith('.zip');
const organManifest = JSON.parse(await readFile(new URL('../assets/organs/manifest.json', import.meta.url), 'utf8'));
const heartRecord = organManifest.find((record) => record.name === 'heart');
if (!heartRecord?.sourceBounds || !Number.isFinite(heartRecord.normalizedTransform?.scale)) throw new Error('Existing organ manifest lacks heart registration anchor');
const SCALE = heartRecord.normalizedTransform.scale;
const HEART_CENTER = heartRecord.center;
// OBJ source is X-left, Y-posterior, Z-superior. Rotate [x,z,-y] into
// X-left, Y-up, Z-anterior. Organ manifest bounds already use that rotated
// frame, so the heart subtraction anchor needs no second rotation.
const heartSourceCenterRaw = heartRecord.sourceBounds.min.map((value, axis) => (value + heartRecord.sourceBounds.max[axis]) / 2);
const HEART_SOURCE_CENTER = heartSourceCenterRaw;

// These are the vascular meshes present in the supplied BodyParts3D archive.
// Names and source IDs are intentionally stable because runtime routes refer
// to them by name. Missing catalog entries are not replaced with primitives.
const DEFINITIONS = [
  ['aorta-ascending', 'systemic', true, 'ascending aorta', 'FMA3736'],
  ['aorta-arch', 'systemic', true, 'aortic arch', 'FMA3768'],
  ['aorta-descending', 'systemic', true, 'descending aorta', 'FMA3784'],
  ['brachiocephalic-trunk', 'systemic', true, 'brachiocephalic artery', 'FMA3932nsn'],
  ['right-common-carotid', 'brain', true, 'right common carotid artery', 'FMA3941'],
  ['left-common-carotid', 'brain', true, 'left common carotid artery', 'FMA4058'],
  ['right-subclavian', 'systemic', true, 'right subclavian artery', 'FMA3953'],
  ['left-subclavian', 'systemic', true, 'left subclavian artery', 'FMA4694'],
  ['coronary-right', 'heart', true, 'right coronary artery', 'FMA3802'],
  ['coronary-right-marginal', 'heart', true, 'marginal branch right coronary artery', 'FMA3818'],
  ['coronary-right-posterior-interventricular', 'heart', true, 'posterior interventricular branch right coronary artery', 'FMA3840nsn'],
  ['coronary-left-anterior-interventricular', 'heart', true, 'anterior interventricular branch left coronary artery', 'FMA3862nsn'],
  ['coronary-left-circumflex', 'heart', true, 'circumflex branch left coronary artery', 'FMA3895'],
  ['coronary-left-stem', 'heart', true, 'stem left coronary artery', 'FMA4685'],
  ['coronary-right-septal', 'heart', true, 'interventricular septal branches right coronary artery', 'FMA71669'],
  ['coronary-left-septal', 'heart', true, 'interventricular septal branches left coronary artery', 'FMA71670'],
  ['coronary-right-posterolateral', 'heart', true, 'right posterolateral branch right coronary artery', 'FMA76994'],
  ['celiac', 'systemic', true, 'celiac artery', 'FMA50737'],
  ['gastric-left', 'systemic', true, 'left gastric artery', 'FMA14768'],
  ['hepatic-common', 'systemic', true, 'common hepatic artery', 'FMA14771'],
  ['splenic', 'systemic', true, 'splenic artery', 'FMA14773'],
  ['mesenteric-superior', 'systemic', true, 'superior mesenteric artery', 'FMA14749'],
  ['mesenteric-inferior', 'systemic', true, 'inferior mesenteric artery', 'FMA14750'],
  ['right-renal-artery', 'renal', true, 'right renal artery', 'FMA14752'],
  ['left-renal-artery', 'renal', true, 'left renal artery', 'FMA14753'],
  ['right-renal-vein', 'renal', false, 'right renal vein', 'FMA14335'],
  ['left-renal-vein', 'renal', false, 'left renal vein', 'FMA14336'],
  ['pulmonary-artery', 'pulmonary', false, 'pulmonary artery', 'FMA66326'],
  ['pulmonary-vein', 'pulmonary', true, 'pulmonary vein', 'FMA66643'],
  ['coronary-sinus', 'heart', false, 'coronary sinus', 'FMA4706'],
  ['great-cardiac-vein', 'heart', false, 'great cardiac vein', 'FMA4707'],
  ['middle-cardiac-vein', 'heart', false, 'middle cardiac vein', 'FMA4713'],
  ['posterior-cardiac-veins', 'heart', false, 'posterior veins of left ventricle', 'FMA76751'],
  ['anterior-cardiac-veins', 'heart', false, 'anterior cardiac veins', 'FMA71567'],
  ['splenic-vein', 'systemic', false, 'splenic vein', 'FMA14331'],
  ['superior-mesenteric-vein', 'systemic', false, 'superior mesenteric vein', 'FMA14332'],
  ['superior-vena-cava', 'systemic', false, 'superior vena cava', 'FMA4720'],
  ['inferior-vena-cava', 'systemic', false, 'inferior vena cava', 'FMA10951'],
  ['right-brachiocephalic-vein', 'brain', false, 'right brachiocephalic vein', 'FMA4751'],
  ['right-internal-jugular', 'brain', false, 'right internal jugular vein', 'FMA4754'],
  ['right-subclavian-vein', 'brain', false, 'right subclavian vein', 'FMA4755'],
  ['left-brachiocephalic-vein', 'brain', false, 'left brachiocephalic vein', 'FMA4761'],
  ['left-internal-jugular', 'brain', false, 'left internal jugular vein', 'FMA4762'],
  ['left-subclavian-vein', 'brain', false, 'left subclavian vein', 'FMA4763'],
  ['right-common-iliac-artery', 'systemic', true, 'right common iliac artery', 'FMA14765'],
  ['left-common-iliac-artery', 'systemic', true, 'left common iliac artery', 'FMA14766'],
  ['right-external-iliac-artery', 'systemic', true, 'right external iliac artery', 'FMA18806'],
  ['left-external-iliac-artery', 'systemic', true, 'left external iliac artery', 'FMA18807'],
  ['right-internal-iliac-artery', 'systemic', true, 'right internal iliac artery', 'FMA18809'],
  ['left-internal-iliac-artery', 'systemic', true, 'left internal iliac artery', 'FMA18810'],
  ['right-common-iliac-vein', 'systemic', false, 'right common iliac vein', 'FMA21387'],
  ['left-common-iliac-vein', 'systemic', false, 'left common iliac vein', 'FMA21388'],
  ['right-external-iliac-vein', 'systemic', false, 'right external iliac vein', 'FMA18885'],
  ['left-external-iliac-vein', 'systemic', false, 'left external iliac vein', 'FMA18886'],
  ['right-internal-iliac-vein', 'systemic', false, 'right internal iliac vein', 'FMA18887'],
  ['left-internal-iliac-vein', 'systemic', false, 'left internal iliac vein', 'FMA18888'],
];

function archiveEntries(file) {
  return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
}
const entries = archive ? archiveEntries(input) : [];
const byBase = new Map(entries.map((entry) => [entry.split(/[\\/]/).at(-1).toLowerCase(), entry]));
const temp = archive ? await mkdtemp(join(tmpdir(), 'flowstate-vascular-')) : null;
async function sourceBytes(id) {
  const filename = `${id}.obj`;
  if (!archive) return readFile(join(input, filename));
  const entry = byBase.get(filename.toLowerCase());
  if (!entry) throw new Error(`Missing BodyParts3D source: ${filename}`);
  // The supplied archive uses literal Windows backslashes in entry names;
  // unzip's basename wildcard handles both that layout and POSIX archives.
  return Buffer.from(execFileSync('unzip', ['-p', input, `*${filename}`], { maxBuffer: 256 * 1024 * 1024 }));
}

function parseOBJ(bytes, label) {
  const text = bytes.toString('utf8');
  const vertices = [], faces = [], weld = new Map(), local = [];
  for (const line of text.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields[0] === 'v' && fields.length >= 4) {
      const v = fields.slice(1, 4).map(Number);
      if (v.every(Number.isFinite)) vertices.push(v);
    } else if (fields[0] === 'f' && fields.length >= 4) {
      const poly = fields.slice(1).map((field) => {
        const raw = Number(field.split('/')[0]);
        const index = raw < 0 ? vertices.length + raw : raw - 1;
        if (!Number.isInteger(index) || index < 0 || index >= vertices.length) throw new Error(`${label}: invalid face index`);
        const key = vertices[index].map((value) => value.toFixed(6)).join(',');
        if (!weld.has(key)) { weld.set(key, local.length); local.push(vertices[index]); }
        return weld.get(key);
      });
      for (let i = 1; i < poly.length - 1; i += 1) faces.push([poly[0], poly[i], poly[i + 1]]);
    }
  }
  if (!local.length || !faces.length) throw new Error(`${label}: source has no surface`);
  return { vertices: local, faces };
}

const gltf = { asset: { version: '2.0', generator: 'Flowstate registered vasculature preparation', copyright: 'BodyParts3D, Copyright© Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
const chunks = [];
function accessor(values, componentType, type, target, bounds = {}) {
  const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  const view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: gltf.buffers[0].byteLength, byteLength: bytes.length, target });
  chunks.push(bytes); const padding = (4 - (bytes.length % 4)) % 4; if (padding) chunks.push(Buffer.alloc(padding));
  gltf.buffers[0].byteLength += bytes.length + padding;
  gltf.accessors.push({ bufferView: view, componentType, count: values.length / (type === 'VEC3' ? 3 : 1), type, ...bounds });
  return gltf.accessors.length - 1;
}
const records = [];
for (const [name, group, oxygenated, semantic, sourceId] of DEFINITIONS) {
  const bytes = await sourceBytes(sourceId);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const { vertices, faces } = parseOBJ(bytes, sourceId);
  const world = vertices.map(([x, y, z]) => [x * SCALE - HEART_SOURCE_CENTER[0] * SCALE + HEART_CENTER[0], z * SCALE - HEART_SOURCE_CENTER[1] * SCALE + HEART_CENTER[1], -y * SCALE - HEART_SOURCE_CENTER[2] * SCALE + HEART_CENTER[2]]);
  const normals = new Float32Array(world.length * 3), indices = [];
  for (const [a, b, c] of faces) {
    const u = world[b].map((v, i) => v - world[a][i]), v = world[c].map((q, i) => q - world[a][i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const i of [a, b, c]) for (let axis = 0; axis < 3; axis += 1) normals[i * 3 + axis] += n[axis];
    indices.push(a, b, c);
  }
  for (let i = 0; i < normals.length; i += 3) { const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1; normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len; }
  const flat = new Float32Array(world.flat()), flatMin = [0, 1, 2].map((axis) => Math.min(...world.map((v) => v[axis]))), flatMax = [0, 1, 2].map((axis) => Math.max(...world.map((v) => v[axis])));
  const position = accessor(flat, 5126, 'VEC3', 34962, { min: flatMin, max: flatMax });
  const normal = accessor(normals, 5126, 'VEC3', 34962);
  const index = accessor(new Uint32Array(indices), 5125, 'SCALAR', 34963);
  const meshIndex = gltf.meshes.length; gltf.meshes.push({ name, primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: index, mode: 4 }] });
  gltf.nodes.push({ name, mesh: meshIndex }); gltf.scenes[0].nodes.push(meshIndex);
  const flow = /(?:vein|sinus|vena)/i.test(semantic) ? 'venous' : 'arterial';
  records.push({ name, semantic: flow, label: semantic, group, oxygenated, source: [`${sourceId}.obj`], sourceSHA256: { [`${sourceId}.obj`]: hash }, vertices: world.length, triangles: faces.length, bounds: { min: flatMin, max: flatMax }, sourceCoordinateSystem: 'X-left, Y-posterior, Z-superior', normalizedTransform: { coordinateSystem: 'X-left, Y-up, Z-anterior', pivot: 'heart source center registered to existing heart', scale: SCALE, sourceUnits: 'mm' } });
}

const json = Buffer.from(JSON.stringify(gltf)); const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20); const bin = Buffer.concat(chunks); const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + jsonPad.length + 8 + bin.length, 8); const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length + jsonPad.length); jh.writeUInt32LE(0x4e4f534a, 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4); const glb = Buffer.concat([header, jh, json, jsonPad, bh, bin]);
const provenance = { sourceRelease: 'BodyParts3D 3.0 (2011-09-15), 99% polygon-reduction OBJ', sourceArchive: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip', sourceREADME: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html', archivedLicenseEvidence: 'CC Attribution-Share Alike 2.1 Japan (Release 3.0 README)', currentLicenseEvidence: 'CC Attribution 4.0 International (portal license, last updated 2025-02-27)', provenanceStatus: 'blocked-pending-review', derivativeReleaseAllowed: false };
const manifest = records.map((record) => ({ ...provenance, ...record, registration: { scale: SCALE, heartSourceCenter: HEART_SOURCE_CENTER, heartCenter: HEART_CENTER, transform: '[x,z,-y] * scale - heartSourceCenter * scale + heart.center' } }));
await mkdir('assets/organs', { recursive: true }); await writeFile('assets/organs/vasculature.glb', glb); await writeFile('assets/organs/vascular-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
if (temp) await rm(temp, { recursive: true, force: true });
console.log(JSON.stringify({ preview, meshes: records.length, bytes: glb.length }));
