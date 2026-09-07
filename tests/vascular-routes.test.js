import test from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEMIC_VASCULAR_ROUTES as routes } from '../src/vascular-routes.js';

const route = name => { const value = routes.find(r => r.name === name); assert.ok(value, name); return value; };
test('normal left aortic arch gives rise to three distinct named branches', () => {
  const arch = route('aortic-arch');
  assert.ok(arch.points.at(-1)[0] > 0);
  for (const name of ['brachiocephalic-trunk','left-common-carotid','left-subclavian']) {
    assert.ok(arch.points.some(p => p.every((v,i) => v === route(name).points[0][i])), `${name} joins arch`);
  }
  assert.ok(route('right-common-carotid').points.at(-1)[0] < 0);
});
test('pulmonary trunk divides once and four pulmonary veins enter the posterior left atrium', () => {
  const trunk = route('pulmonary-trunk');
  for (const side of ['right','left']) {
    assert.deepEqual(route(`${side}-pulmonary-artery`).points[0], trunk.points.at(-1));
    for (const level of ['superior','inferior']) {
      const vein=route(`${side}-${level}-pulmonary-vein`);
      assert.equal(vein.oxygenated,true);
      assert.equal(vein.semantic,'venous');
      assert.equal(vein.group,'pulmonary');
    }
  }
});
test('renal veins are anterior to arteries and left renal vein crosses anterior to the aorta', () => {
  for (const side of ['right','left']) {
    const artery=route(`${side}-renal-artery`),vein=route(`${side}-renal-vein`);
    assert.ok(vein.points[0][2] > artery.points.at(-1)[2]);
  }
  const left=route('left-renal-vein');
  assert.ok(left.points.some(p=>p[0]>.2&&p[0]<.4&&p[2]>-.4));
  assert.ok(route('right-renal-artery').points.at(-1)[1] < route('left-renal-artery').points.at(-1)[1]);
});
test('vessel routes have unique stable names and finite nondegenerate geometry', () => {
  assert.equal(new Set(routes.map(r=>r.name)).size,routes.length);
  for (const r of routes) {
    assert.ok(r.points.length>=2 && r.radius>0);
    assert.ok(r.points.flat().every(Number.isFinite));
    for(let i=1;i<r.points.length;i++)assert.notDeepEqual(r.points[i],r.points[i-1]);
    assert.ok(['arterial','venous'].includes(r.semantic));
  }
});
test('coronary ostia arise from aortic root with venous drainage to the right atrium', () => {
  for (const name of ['right-coronary-artery','left-main-coronary']) assert.deepEqual(route(name).points[0],route('ascending-aorta').points[0]);
  assert.deepEqual(route('left-anterior-descending').points[0],route('left-main-coronary').points.at(-1));
  assert.deepEqual(route('left-circumflex').points[0],route('left-main-coronary').points.at(-1));
  assert.equal(route('coronary-sinus').oxygenated,false);
});
