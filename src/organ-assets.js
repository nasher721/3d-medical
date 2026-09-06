const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const TRIANGLES = 4;
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
export const ASSET_PROVENANCE_BLOCKED = 'blocked-pending-review';

/** Reject a package for distribution until every source/license gate is resolved. */
export function assertAssetReleaseAllowed(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Organ asset release requires a non-empty manifest.');
  const blocked = manifest.find(record => record?.derivativeReleaseAllowed !== true || record?.provenanceStatus !== 'reviewed');
  if (blocked) throw new Error(`Organ asset release blocked by provenance record: ${blocked.name || 'unnamed organ'}.`);
  return true;
}

const fail = (message) => {
  throw new Error(`Invalid organ GLB: ${message}`);
};

const identity = (values, expected) =>
  Array.isArray(values) && values.length === expected.length &&
  values.every((value, index) => Number.isFinite(value) && value === expected[index]);

function readChunk(view, offset) {
  if (offset + 8 > view.byteLength) fail("truncated chunk header");
  const length = view.getUint32(offset, true);
  const type = view.getUint32(offset + 4, true);
  const end = offset + 8 + length;
  if (end > view.byteLength) fail("chunk exceeds file length");
  return { length, type, start: offset + 8, end };
}

function accessorData(gltf, bin, accessorIndex, expectedType, attributeName) {
  if (!Number.isInteger(accessorIndex) || accessorIndex < 0) fail(`${attributeName} accessor index is invalid`);
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) fail(`${attributeName} accessor is missing`);
  if (accessor.bufferView === undefined || accessor.componentType !== FLOAT || accessor.type !== expectedType) {
    fail(`${attributeName} must be a float VEC3 accessor`);
  }
  if (!Number.isInteger(accessor.count) || accessor.count < 1) fail(`${attributeName} has an invalid count`);
  const viewDef = gltf.bufferViews?.[accessor.bufferView];
  if (!viewDef || viewDef.buffer !== 0) fail(`${attributeName} uses an unsupported buffer`);
  const viewOffset = viewDef.byteOffset ?? 0;
  const accessorOffset = accessor.byteOffset ?? 0;
  const elementBytes = 12;
  const stride = viewDef.byteStride ?? elementBytes;
  if (!Number.isInteger(viewOffset) || !Number.isInteger(accessorOffset) || !Number.isInteger(stride) || stride < elementBytes) {
    fail(`${attributeName} has an invalid stride or offset`);
  }
  const start = viewOffset + accessorOffset;
  const end = start + (accessor.count - 1) * stride + elementBytes;
  if (!Number.isInteger(viewDef.byteLength) || viewDef.byteLength < 0 ||
      start < viewOffset || end > viewOffset + viewDef.byteLength || end > bin.byteLength) {
    fail(`${attributeName} accessor is out of bounds`);
  }
  const dataView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const values = new Float32Array(accessor.count * 3);
  for (let i = 0; i < accessor.count; i += 1) {
    const at = start + i * stride;
    for (let component = 0; component < 3; component += 1) {
      const value = dataView.getFloat32(at + component * 4, true);
      if (!Number.isFinite(value)) fail(`${attributeName} contains non-finite values`);
      values[i * 3 + component] = value;
    }
  }
  return values;
}

function validateBounds(accessor, values, attributeName) {
  if (accessor.min === undefined && accessor.max === undefined) return;
  if (!Array.isArray(accessor.min) || !Array.isArray(accessor.max) || accessor.min.length !== 3 || accessor.max.length !== 3) fail(`${attributeName} bounds are invalid`);
  for (let axis = 0; axis < 3; axis += 1) {
    let actualMin = Infinity, actualMax = -Infinity;
    for (let index = axis; index < values.length; index += 3) { actualMin = Math.min(actualMin, values[index]); actualMax = Math.max(actualMax, values[index]); }
    if (!Number.isFinite(accessor.min[axis]) || !Number.isFinite(accessor.max[axis]) || Math.abs(actualMin - accessor.min[axis]) > 1e-4 || Math.abs(actualMax - accessor.max[axis]) > 1e-4) fail(`${attributeName} bounds do not match decoded values`);
  }
}

function indicesData(gltf, bin, primitive, vertexCount) {
  if (primitive.indices === undefined) {
    if (vertexCount % 3 !== 0) fail("non-indexed primitive vertex count is not divisible by 3");
    return null;
  }
  if (!Number.isInteger(primitive.indices) || primitive.indices < 0) fail("indices accessor index is invalid");
  const accessor = gltf.accessors?.[primitive.indices];
  if (!accessor || accessor.bufferView === undefined || accessor.type !== "SCALAR" ||
      ![UNSIGNED_SHORT, UNSIGNED_INT].includes(accessor.componentType)) {
    fail("indices must be an unsigned integer SCALAR accessor");
  }
  if (!Number.isInteger(accessor.count) || accessor.count < 3 || accessor.count % 3 !== 0) fail("invalid index count");
  const viewDef = gltf.bufferViews?.[accessor.bufferView];
  if (!viewDef || viewDef.buffer !== 0) fail("indices use an unsupported buffer");
  const componentBytes = accessor.componentType === UNSIGNED_SHORT ? 2 : 4;
  const stride = viewDef.byteStride ?? componentBytes;
  const start = (viewDef.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const end = start + (accessor.count - 1) * stride + componentBytes;
  if (!Number.isInteger(stride) || stride < componentBytes || !Number.isInteger(viewDef.byteLength) ||
      viewDef.byteLength < 0 || start < 0 ||
      start < (viewDef.byteOffset ?? 0) || end > (viewDef.byteOffset ?? 0) + viewDef.byteLength || end > bin.byteLength) {
    fail("indices are out of bounds");
  }
  const dataView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const result = new Array(accessor.count);
  for (let i = 0; i < accessor.count; i += 1) {
    const at = start + i * stride;
    const value = accessor.componentType === UNSIGNED_SHORT ? dataView.getUint16(at, true) : dataView.getUint32(at, true);
    if (value >= vertexCount) fail("index references a missing vertex");
    result[i] = value;
  }
  return result;
}

export function parseOrganGLB(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) fail("input is not an ArrayBuffer");
  if (arrayBuffer.byteLength < 20) fail("file is too small");
  const view = new DataView(arrayBuffer);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) fail("unsupported GLB header");
  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== arrayBuffer.byteLength) fail("header length does not match file");
  let offset = 12;
  let jsonChunk;
  let binChunk;
  while (offset < declaredLength) {
    const chunk = readChunk(view, offset);
    if (chunk.length % 4 !== 0) fail("chunk length is not aligned");
    if (chunk.type === JSON_CHUNK) {
      if (jsonChunk) fail("multiple JSON chunks");
      jsonChunk = new Uint8Array(arrayBuffer, chunk.start, chunk.length);
    } else if (chunk.type === BIN_CHUNK) {
      if (binChunk) fail("multiple BIN chunks");
      binChunk = new Uint8Array(arrayBuffer, chunk.start, chunk.length);
    }
    offset = chunk.end;
  }
  if (offset !== declaredLength || !jsonChunk || !binChunk) fail("JSON and BIN chunks are required");
  let gltf;
  try {
    gltf = JSON.parse(new TextDecoder().decode(jsonChunk).replace(/\0+\s*$/, ""));
  } catch {
    fail("JSON chunk is invalid");
  }
  if (!gltf || gltf.asset?.version !== "2.0") fail("asset version must be 2.0");
  if ((gltf.extensionsUsed?.length ?? 0) || (gltf.extensionsRequired?.length ?? 0)) fail("extensions are unsupported");
  if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1 || gltf.buffers[0].uri !== undefined) fail("external or multiple buffers are unsupported");
  if (!Number.isInteger(gltf.buffers[0].byteLength) || gltf.buffers[0].byteLength < 0 || gltf.buffers[0].byteLength > binChunk.byteLength) fail("buffer exceeds BIN chunk");
  for (const node of gltf.nodes ?? []) {
    if (node.matrix !== undefined && !identity(node.matrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])) fail("non-identity node transform");
    if (node.translation !== undefined && !identity(node.translation, [0, 0, 0])) fail("non-identity node transform");
    if (node.scale !== undefined && !identity(node.scale, [1, 1, 1])) fail("non-identity node transform");
    if (node.rotation !== undefined && !identity(node.rotation, [0, 0, 0, 1])) fail("non-identity node transform");
  }
  if (!Array.isArray(gltf.meshes)) fail("meshes array is required");
  const output = [];
  for (const mesh of gltf.meshes) {
    if (!mesh.name || !Array.isArray(mesh.primitives) || mesh.primitives.length === 0) continue;
    const positions = [];
    const normals = [];
    const triangles = [];
    mesh.primitives.forEach((primitive) => {
      if (primitive.mode !== undefined && primitive.mode !== TRIANGLES) fail(`mesh ${mesh.name} uses unsupported primitive mode`);
      if (primitive.targets || primitive.extensions) fail(`mesh ${mesh.name} uses unsupported features`);
      const positionAccessor = gltf.accessors?.[primitive.attributes?.POSITION];
      const p = accessorData(gltf, binChunk, primitive.attributes?.POSITION, "VEC3", "POSITION");
      validateBounds(positionAccessor, p, "POSITION");
      const n = accessorData(gltf, binChunk, primitive.attributes?.NORMAL, "VEC3", "NORMAL");
      if (n.length !== p.length) fail(`mesh ${mesh.name} POSITION and NORMAL counts differ`);
      for (let i = 0; i < n.length; i += 3) {
        if (n[i] === 0 && n[i + 1] === 0 && n[i + 2] === 0) fail(`mesh ${mesh.name} contains a zero normal`);
      }
      const indices = indicesData(gltf, binChunk, primitive, p.length / 3);
      const offset = positions.length / 3;
      for (const value of p) positions.push(value);
      for (const value of n) normals.push(value);
      const count = indices?.length ?? p.length / 3;
      for (let i = 0; i < count; i += 1) triangles.push(offset + (indices?.[i] ?? i));
    });
    output.push({ name: mesh.name, position: new Float32Array(positions), normal: new Float32Array(normals), indices: new Uint32Array(triangles) });
  }
  return output;
}

export async function loadOrganAssets(url, { signal, release = false, manifest } = {}) {
  if (release) assertAssetReleaseAllowed(manifest);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Unable to load organ GLB (${response.status})`);
  return parseOrganGLB(await response.arrayBuffer());
}
