import test from 'node:test';
import assert from 'node:assert/strict';

test('perfusion worksheet distinguishes conventional CPP from venous downstream pressure', async () => {
  const tools = await import('../src/neuro-tools.js');
  assert.deepEqual(tools.calculatePerfusion({ map: 80, icp: 20, cvp: 8 }), { cpp: 60, effectiveGradient: 60, downstream: 20 });
  assert.deepEqual(tools.calculatePerfusion({ map: 70, icp: 10, cvp: 25 }), { cpp: 60, effectiveGradient: 45, downstream: 25 });
  assert.equal(tools.calculatePerfusion({ map: 15, icp: 25, cvp: 8 }).cpp, -10);
  assert.throws(() => tools.calculatePerfusion({ map: '', icp: 20, cvp: 8 }), /finite/);
});

test('osmolarity worksheet uses explicit mg/dL units and rejects blank or impossible inputs', async () => {
  const { calculateOsmolarity } = await import('../src/neuro-tools.js');
  assert.equal(calculateOsmolarity({ sodium: 140, glucose: 90, bun: 14 }), 290);
  assert.equal(calculateOsmolarity({ sodium: 150, glucose: 180, bun: 28 }), 320);
  for (const sodium of ['', NaN, Infinity, 0, 300]) assert.throws(() => calculateOsmolarity({ sodium, glucose: 90, bun: 14 }), /finite/);
});

test('GCS retains component scores and does not invent a total for a non-testable component', async () => {
  const { calculateGCS } = await import('../src/neuro-tools.js');
  assert.deepEqual(calculateGCS({ eye: 4, verbal: 5, motor: 6 }), { total: 15, components: 'E4 V5 M6' });
  assert.deepEqual(calculateGCS({ eye: 2, verbal: null, motor: 5 }), { total: null, components: 'E2 VNT M5' });
  assert.equal(calculateGCS({ eye: 1, verbal: 1, motor: 1 }).total, 3);
  assert.throws(() => calculateGCS({ eye: 2.5, verbal: 5, motor: 6 }), /integer/);
});
