import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AnatomyRenderer,
  CEREBRAL_NODE_POSITIONS,
  CEREBRAL_TEACHING_GRAPH,
  ANATOMICAL_ROUTE_COLLECTIONS,
  CIRCLE_OF_WILLIS_EDGES,
} from '../src/anatomy.js';

const edgeNames = edges => new Set(edges.map(([from, to]) => `${from}->${to}`));

test('cerebral teaching graph keeps ACA, MCA, and PCA territories bilateral', () => {
  for (const territory of ['aca', 'mca', 'pca']) {
    const left = `left-${territory}-capillary-bed`;
    const right = `right-${territory}-capillary-bed`;
    assert.ok(CEREBRAL_TEACHING_GRAPH.nodes.includes(left));
    assert.ok(CEREBRAL_TEACHING_GRAPH.nodes.includes(right));
    assert.ok(CEREBRAL_NODE_POSITIONS[left][0] > 0);
    assert.ok(CEREBRAL_NODE_POSITIONS[right][0] < 0);
    assert.ok(CEREBRAL_TEACHING_GRAPH.edges.some(([from, to]) => from === `left-${territory}` && to === left));
    assert.ok(CEREBRAL_TEACHING_GRAPH.edges.some(([from, to]) => from === `right-${territory}` && to === right));
  }
});

test('cerebral venous graph drains by side through transverse and sigmoid sinuses', () => {
  const edges = edgeNames(CEREBRAL_TEACHING_GRAPH.edges);
  for (const side of ['left', 'right']) {
    assert.ok(edges.has(`${side}-mca-capillary-bed->${side}-transverse-sinus`));
    assert.ok(edges.has(`${side}-pca-capillary-bed->${side}-transverse-sinus`));
    assert.ok(edges.has(`${side}-transverse-sinus->${side}-sigmoid-sinus`));
    assert.ok(edges.has(`${side}-sigmoid-sinus->${side}-internal-jugular-return`));
    assert.ok(CEREBRAL_NODE_POSITIONS[`${side}-internal-jugular-return`][0] * (side === 'left' ? 1 : -1) > 0);
  }
  assert.ok(!edges.has('left-pca-capillary-bed->straight-sinus'),'posterior cortical territory is not a proxy for the deep cerebral veins');
});

test('all canonical cerebral graph edges render with matching endpoints and route semantics', () => {
  const renderer = Object.create(AnatomyRenderer.prototype);
  renderer.assets = [];
  renderer.routes = [];
  renderer._asset = (geometry, options) => ({ geometry, ...options });
  renderer._buildCerebralRoutes();
  const venous = new Set(ANATOMICAL_ROUTE_COLLECTIONS.venous);
  for (const [from, to] of CEREBRAL_TEACHING_GRAPH.edges) {
    const route = renderer.routes.find(candidate => candidate.name === `${from}->${to}`);
    assert.ok(route, `${from}->${to} should have a rendered route`);
    assert.deepEqual(route.path[0], CEREBRAL_NODE_POSITIONS[from]);
    assert.deepEqual(route.path.at(-1), CEREBRAL_NODE_POSITIONS[to]);
    assert.equal(route.semantic, venous.has(route.name) ? 'venous' : 'arterial');
    if(CIRCLE_OF_WILLIS_EDGES.some(([a,b])=>a===from&&b===to)&&!from.includes('vertebral')){
      assert.ok(route.path.every(p=>p[1]>3.1&&p[1]<3.5),'communicating circle must stay basal, including interpolated geometry');
    }
  }
});
