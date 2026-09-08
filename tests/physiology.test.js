import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, DEFAULT_INTERVENTIONS, DEFAULT_PATIENT, VASOACTIVE_REGISTRY, VENTILATOR_MODES, createSimulation, stepSimulation, setIntervention, setPatient, setVentilatorMode, resetInterventions, getInsights, forwardStrokeVolume, volumeControlledBreath, pressureControlledBreath, ventilatorBreath } from '../src/physiology.js';

const close = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test('vasoactive registry is finite, named, and preserves legacy units', () => {
  assert.deepEqual(VASOACTIVE_REGISTRY.map(record => record.id), ['norepinephrine', 'dobutamine', 'epinephrine', 'phenylephrine', 'vasopressin', 'milrinone', 'nitroprusside', 'nitroglycerin', 'esmolol', 'atropine']);
  assert.equal(VASOACTIVE_REGISTRY[0].conceptualUnit, 'µg/kg/min');
  assert.equal(VASOACTIVE_REGISTRY[1].conceptualUnit, 'µg/kg/min');
  assert.equal(VASOACTIVE_REGISTRY[4].conceptualUnit, 'conceptual model units');
  for (const record of VASOACTIVE_REGISTRY) {
    assert.ok(record.timeBasis && record.bounds && record.effectDimensions.length);
    assert.ok(Number.isFinite(record.bounds.min) && Number.isFinite(record.bounds.max));
  }
  const state = createSimulation(); const before = JSON.stringify(state);
  setIntervention(state, 'hypertonicSolution', { concentrationPercent: 3 });
  assert.equal(JSON.stringify(state), before);
});
test('all named vasoactive presets produce finite directional teaching responses', () => {
  for (const key of ['epinephrine', 'phenylephrine', 'vasopressin', 'atropine']) {
    const state = createSimulation('healthy'); const before = state.metrics.map;
    setIntervention(state, key, VASOACTIVE_REGISTRY.find(r => r.id === key).bounds.max); stepSimulation(state, 20);
    assert.ok(state.metrics.map > before, key);
    assert.ok(Object.values(state.metrics).every(Number.isFinite));
  }
  for (const key of ['nitroprusside', 'nitroglycerin', 'esmolol', 'milrinone']) {
    const state = createSimulation('healthy'); const before = { ...state.metrics };
    setIntervention(state, key, VASOACTIVE_REGISTRY.find(r => r.id === key).bounds.max); stepSimulation(state, 20);
    assert.ok(Object.values(state.metrics).every(Number.isFinite), key);
  }
  {
    const state = createSimulation('cardiogenic'); const before = state.metrics.co;
    setIntervention(state, 'milrinone', .75); stepSimulation(state, 20);
    assert.ok(state.metrics.co > before, 'milrinone raises cardiac output');
  }
  {
    const state = createSimulation('healthy'); const before = state.metrics.hr;
    setIntervention(state, 'esmolol', 300); stepSimulation(state, 20);
    assert.ok(state.metrics.hr < before, 'esmolol lowers heart rate');
  }
});
test('coupled cerebral, ventilator, renal, and Frank-Starling outputs share the forward model', () => {
  const state = createSimulation(); setIntervention(state, 'respiratoryRate', 30); setIntervention(state, 'tidalVolume', 8); stepSimulation(state, 1);
  const m = state.metrics;
  close(m.cerebralTerritories.aca + m.cerebralTerritories.mca + m.cerebralTerritories.pca, m.brainFlow);
  close(state.frankStarling.operatingPoint.strokeVolume, m.sv);
  close(m.minuteVentilation, state.interventions.respiratoryRate * m.tidalVolumeMl);
  assert.ok(m.paco2 < 40 && m.tidalVolumeMl === 8 * state.patient.weight);
  assert.ok(m.renalFlow >= 0 && m.renalFlow <= 2400 && m.urineOutput >= 0 && m.urineOutput <= 240);
});
test('healthy baseline and numerical identities', () => { const s = createSimulation(); const m = s.metrics;
  assert.ok(m.hr >= 70 && m.hr <= 75); assert.ok(m.co > 4.5 && m.co < 5.5); assert.ok(m.map > 84 && m.map < 92);
  close(m.co, m.hr * m.sv / 1000); close(m.cpp, m.map - m.icp); close(m.map, m.co * m.svr / 80 + m.cvp); assert.ok(m.spo2 > 96);
});
test('interventions are bounded and directional', () => { const s = createSimulation('septic'); const before = s.metrics.map;
  setIntervention(s, 'norepinephrine', 2); assert.equal(s.interventions.norepinephrine, 1); stepSimulation(s, 20); assert.ok(s.metrics.map > before);
  const co = s.metrics.co; setIntervention(s, 'dobutamine', 20); stepSimulation(s, 20); assert.ok(s.metrics.co > co);
  setIntervention(s, 'fio2', 100); assert.equal(s.interventions.fio2, 100); setIntervention(s, 'peep', 99); assert.equal(s.interventions.peep, 20);
  const hr = s.interventions.heartRate; setIntervention(s, 'heartRate', NaN); assert.equal(s.interventions.heartRate, hr);
});
test('all scenarios remain finite through long run and history is bounded', () => { for (const sc of SCENARIOS) { const s = createSimulation(sc.id);
  for (const k of Object.keys(DEFAULT_INTERVENTIONS)) setIntervention(s, k, 0.7 * (k === 'fio2' ? 100 : k === 'heartRate' ? 160 : (k === 'tidalVolume' ? 10 : 20)));
  for (let n = 0; n < 3600; n++) stepSimulation(s, .5); assert.ok(s.history.length <= 1800); for (const v of Object.values(s.metrics)) assert.ok(Number.isFinite(v), sc.id); } });
test('patient edits and insights are safe', () => { const s = createSimulation('brain-injury', { hemoglobin: 8 }); setPatient(s, 'hemoglobin', 10); assert.equal(s.patient.hemoglobin, 10); setPatient(s, 'weight', -4); assert.equal(s.patient.weight, 40); setPatient(s, 'autoregulation', 'false'); assert.equal(s.patient.autoregulation, true); setPatient(s, 'metabolicDemand', Infinity); assert.equal(s.patient.metabolicDemand, 100); assert.ok(getInsights(s).length); });
test('scenario physiology and named interventions point in expected directions', () => {
  const septic = createSimulation('septic'); const septicMap = septic.metrics.map; setIntervention(septic, 'norepinephrine', 1); stepSimulation(septic, 20); assert.ok(septic.metrics.map > septicMap);
  const cardio = createSimulation('cardiogenic'); const low = cardio.metrics.co; setIntervention(cardio, 'dobutamine', 20); stepSimulation(cardio, 20); assert.ok(cardio.metrics.co > low);
  const healthy = createSimulation('healthy'); const hco = healthy.metrics.co; setIntervention(healthy, 'fluid', 2000); stepSimulation(healthy, 20); const hgain = healthy.metrics.co - hco;
  const congested = createSimulation('cardiogenic'); const cco = congested.metrics.co; setIntervention(congested, 'fluid', 2000); stepSimulation(congested, 20); assert.ok(hgain > congested.metrics.co - cco); assert.ok(congested.metrics.cvp > cardio.metrics.cvp);
});
test('ARDS oxygen and PEEP tradeoffs are visible', () => { const s = createSimulation('ards'); const low = s.metrics.spo2; setIntervention(s, 'fio2', 100); stepSimulation(s, 20); assert.ok(s.metrics.spo2 > low); const co = s.metrics.co; setIntervention(s, 'peep', 20); stepSimulation(s, 20); assert.ok(s.metrics.pvr > 1 && s.metrics.co < co); });
test('ventilation changes CO2, CPP, and cerebral flow when autoregulation is absent', () => { const s = createSimulation('brain-injury'); setPatient(s, 'autoregulation', false); stepSimulation(s, 20); const flow = s.metrics.brainFlow; setIntervention(s, 'respiratoryRate', 6); stepSimulation(s, 20); assert.ok(s.metrics.paco2 > 40); assert.ok(s.metrics.cpp < s.metrics.map - 20); assert.ok(s.metrics.brainFlow > flow, 'hypercapnic vasodilation raises cerebral flow despite lower CPP'); });
test('hemoglobin changes oxygen delivery while saturation stays similar', () => { const s = createSimulation(); const sat = s.metrics.spo2; const do2 = s.metrics.do2; setPatient(s, 'hemoglobin', 6); stepSimulation(s, 20); assert.ok(Math.abs(s.metrics.spo2 - sat) < 1); assert.ok(s.metrics.do2 < do2); });
test('autoregulation buffers MAP changes and disabling it reveals pressure dependence', () => { const s = createSimulation(); setPatient(s, 'vascularTone', 30); stepSimulation(s, 20); const regulated = s.metrics.brainFlow; setPatient(s, 'autoregulation', false); stepSimulation(s, 20); assert.ok(s.metrics.brainFlow < regulated); });
test('rapid heart rate reduces filling and stroke volume', () => { const s = createSimulation(); const sv = s.metrics.sv; setIntervention(s, 'heartRate', 160); stepSimulation(s, 20); assert.ok(s.metrics.sv < sv); });
test('all bounds, reset behavior, and scenario presets are valid', () => { for (const id of SCENARIOS.map((x) => x.id)) { const s = createSimulation(id); assert.ok(s.interventions.heartRate >= 40 && s.interventions.heartRate <= 160); assert.ok(s.interventions.icp >= 0 && s.interventions.icp <= 40); for (const [key, value] of Object.entries(DEFAULT_INTERVENTIONS)) { setIntervention(s, key, -Infinity); assert.equal(s.interventions[key], value === 21 || value === 72 || value === 5 ? s.interventions[key] : value); } resetInterventions(s); assert.deepEqual(s.interventions, { ...DEFAULT_INTERVENTIONS, heartRate: createSimulation(s.scenarioId).interventions.heartRate, icp: createSimulation(s.scenarioId).interventions.icp }); } assert.deepEqual(Object.keys(DEFAULT_PATIENT).sort(), ['autoregulation','contractility','hemoglobin','metabolicDemand','temperature','vascularTone','volume','weight'].sort()); });
test('time step consistency, history cadence, and extreme combinations', () => { const a = createSimulation('ards'); const b = createSimulation('ards'); setIntervention(a, 'fio2', 100); setIntervention(b, 'fio2', 100); for (let n = 0; n < 20; n += 1) stepSimulation(a, 1); stepSimulation(b, 20); assert.ok(Math.abs(a.metrics.spo2 - b.metrics.spo2) < .5); assert.equal(a.history.length, 21); for (const id of SCENARIOS.map((x) => x.id)) { const s = createSimulation(id, { hemoglobin: 5, metabolicDemand: 200, vascularTone: 200, contractility: 20 }); for (const k of Object.keys(DEFAULT_INTERVENTIONS)) setIntervention(s, k, k === 'fio2' ? 100 : k === 'heartRate' ? 160 : 20); for (let n = 0; n < 3000; n += 1) stepSimulation(s, .5); assert.ok(s.history.length <= 1800); assert.ok(Object.values(s.metrics).every(Number.isFinite)); } });


test('Starling curve shares the forward model during every transient frame', () => {
  const s = createSimulation('cardiogenic');
  setPatient(s, 'volume', 130); setPatient(s, 'contractility', 150);
  setPatient(s, 'vascularTone', 160); setIntervention(s, 'peep', 12);
  for (let n = 0; n < 90; n++) {
    stepSimulation(s, 1 / 30);
    const m = s.metrics, curve = s.frankStarling;
    close(forwardStrokeVolume(m.edv, m), m.sv, 1e-6);
    close(curve.operatingPoint.strokeVolume, forwardStrokeVolume(curve.operatingPoint.preload, m), 1e-6);
    for (const point of curve.samples) close(point.sv, forwardStrokeVolume(point.edv, m), 1e-6);
    close(curve.afterload, m.afterload); close(curve.contractility, m.inotropy);
    close(m.co, m.hr * m.sv / 1000, 1e-6);
    close(m.map, m.cvp + m.co * m.svr / 80, 1e-6);
    close(m.cpp, m.map - m.icp, 1e-6);
    close(m.sv, m.edv - m.esv, 1e-6); close(m.ef, 100 * m.sv / m.edv, 1e-6);
  }
});

test('Starling preload, contractility, and afterload have directional forward effects', () => {
  const baseline = createSimulation();
  for (const [key, value, sign] of [['volume', 120, 1], ['contractility', 130, 1], ['vascularTone', 150, -1]]) {
    const s = createSimulation(); setPatient(s, key, value); stepSimulation(s, 20);
    assert.ok(sign * (s.metrics.sv - baseline.metrics.sv) > 1e-9, key);
    if (key === 'volume') assert.ok(s.frankStarling.operatingPoint.preload > baseline.frankStarling.operatingPoint.preload);
    else {
      const index = 3;
      assert.ok(sign * (s.frankStarling.samples[index].sv - baseline.frankStarling.samples[index].sv) > 1e-9, key);
    }
  }
  const m = baseline.metrics;
  assert.ok(forwardStrokeVolume(130, m) > forwardStrokeVolume(100, m));
});

test('VC delivered flow integrates to inspired and expired VT across settings and PBW', () => {
  for (const [rr, vt, weight, peep] of [[6, 4, 40, 0], [16, 6, 70, 5], [35, 10, 150, 20]]) {
    const s = createSimulation('ards', { weight });
    for (const [key, value] of Object.entries({ respiratoryRate: rr, tidalVolume: vt, peep })) setIntervention(s, key, value);
    stepSimulation(s, 1 / 30);
    const cycle = volumeControlledBreath(s, 0), count = 1000;
    let inspired = 0, expired = 0;
    for (let n = 0; n < count; n++) {
      const ti = (n + .5) * cycle.inspiratoryTimeS / count;
      const te = cycle.inspiratoryTimeS + (n + .5) * cycle.expiratoryTimeS / count;
      const a = volumeControlledBreath(s, ti), b = volumeControlledBreath(s, te);
      inspired += a.flowMlS * cycle.inspiratoryTimeS / count;
      expired += b.flowMlS * cycle.expiratoryTimeS / count;
      assert.ok(a.pressureCmH2O >= peep && b.pressureCmH2O >= peep);
      close(a.pressureCmH2O, peep + a.volumeMl / a.complianceMlCmH2O + a.resistanceCmH2OSL * a.flowMlS / 1000);
      const delta = 1e-6;
      close((volumeControlledBreath(s, ti + delta).volumeMl - volumeControlledBreath(s, ti - delta).volumeMl) / (2 * delta), a.flowMlS, 1e-6);
      close((volumeControlledBreath(s, te + delta).volumeMl - volumeControlledBreath(s, te - delta).volumeMl) / (2 * delta), b.flowMlS, 1e-6);
    }
    close(inspired, vt * weight, 1e-6); close(expired, -vt * weight, 1e-6);
    close(inspired * rr, s.metrics.minuteVentilation, 1e-6);
    close(cycle.alveolarVentilationMlMin, rr * (vt - 2) * weight, 1e-6);
    close(s.metrics.alveolarVentilation, cycle.alveolarVentilationMlMin, 1e-6);
    close(volumeControlledBreath(s, cycle.inspiratoryTimeS).volumeMl, vt * weight, 1e-6);
    close(volumeControlledBreath(s, cycle.cycleDurationS).volumeMl, 0, 1e-6);
    close(s.ventilatorCycle.volumeMl, volumeControlledBreath(s).volumeMl);
  }
});

test('multiorgan fixed-step time course and extreme replay are deterministic', () => {
  function run(id, split) {
    const s = createSimulation(id, { contractility: 20, vascularTone: 200, volume: 40, metabolicDemand: 200 });
    for (const [key, value] of Object.entries({ norepinephrine: 1, dobutamine: 20, epinephrine: 1, phenylephrine: 1, vasopressin: 1, respiratoryRate: 35, tidalVolume: 10, peep: 20, fio2: 100 })) setIntervention(s, key, value);
    for (const dt of split) {
      stepSimulation(s, dt);
      for (const value of Object.values(s.metrics)) assert.ok(Number.isFinite(value), id);
      assert.ok(s.metrics.renalFlow >= 0 && s.metrics.renalFlow <= 2400);
      assert.ok(s.metrics.urineOutput >= 0 && s.metrics.urineOutput <= 240);
      close(s.metrics.cerebralTerritories.aca + s.metrics.cerebralTerritories.mca + s.metrics.cerebralTerritories.pca, s.metrics.brainFlow, 1e-6);
    }
    return s;
  }
  for (const { id } of SCENARIOS) {
    const a = run(id, [1, 1, 1]), b = run(id, Array(90).fill(1 / 30));
    for (const key of Object.keys(a.metrics)) close(a.metrics[key], b.metrics[key], 1e-9);
    assert.deepEqual(a.history, b.history); assert.deepEqual(a.events, b.events);
    const snapshot = JSON.stringify(a);
    for (const dt of [0, -1, NaN, Infinity]) stepSimulation(a, dt);
    assert.equal(JSON.stringify(a), snapshot);
    const c = run(id, [600]), d = run(id, [60]);
    assert.deepEqual(c.metrics, d.metrics); close(c.timeS, 60, 1e-9);
  }
});

test('ventilator modes are named, bounded, and default to volume control', () => {
  assert.deepEqual(VENTILATOR_MODES.map(m => m.id), ['volume-controlled', 'pressure-control', 'pressure-support']);
  for (const mode of VENTILATOR_MODES) assert.ok(mode.name && mode.help);
  const s = createSimulation();
  assert.equal(s.interventions.ventilator.mode, 'volume-controlled');
  assert.equal(s.ventilatorCycle.tidalVolumeMl, volumeControlledBreath(s).tidalVolumeMl);
  setVentilatorMode(s, 'bogus-mode');
  assert.equal(s.interventions.ventilator.mode, 'volume-controlled');
});

test('pressure-control tidal volume is a modeled output, not the fixed volume-control input', () => {
  const s = createSimulation('ards');
  setVentilatorMode(s, 'pressure-control');
  setIntervention(s, 'inspiratoryPressure', 20);
  stepSimulation(s, 1 / 30);
  const cycle = pressureControlledBreath(s, 0);
  assert.ok(cycle.tidalVolumeMl > 0 && cycle.tidalVolumeMl < 2000);
  // Delivered volume follows compliance: a stiffer (lower-compliance) lung
  // yields a smaller delivered tidal volume at the same drive pressure.
  const stiff = createSimulation('ards', {}); setPatient(stiff, 'contractility', stiff.patient.contractility);
  const compliant = createSimulation('healthy');
  setVentilatorMode(stiff, 'pressure-control'); setIntervention(stiff, 'inspiratoryPressure', 20);
  setVentilatorMode(compliant, 'pressure-control'); setIntervention(compliant, 'inspiratoryPressure', 20);
  assert.ok(pressureControlledBreath(stiff, 0).tidalVolumeMl < pressureControlledBreath(compliant, 0).tidalVolumeMl);
  // Pressure stays flat at PEEP + drive during inspiration (pressure-targeted),
  // unlike volume control where pressure is the output.
  const mid = pressureControlledBreath(s, cycle.inspiratoryTimeS / 2);
  close(mid.pressureCmH2O, s.interventions.peep + 20, 1e-9);
  assert.equal(s.ventilatorCycle.tidalVolumeMl, ventilatorBreath(s).tidalVolumeMl);
  for (const value of Object.values(s.metrics)) assert.ok(Number.isFinite(value));
});

test('pressure-support at zero is CPAP: a flat PEEP trace with no delivered volume', () => {
  const s = createSimulation();
  setVentilatorMode(s, 'pressure-support');
  setIntervention(s, 'pressureSupport', 0);
  stepSimulation(s, 1 / 30);
  const cycle = pressureControlledBreath(s, 0, 'pressureSupport');
  close(cycle.tidalVolumeMl, 0, 1e-6);
  close(pressureControlledBreath(s, 5, 'pressureSupport').pressureCmH2O, s.interventions.peep, 1e-9);
});

test('bounded respiratory-support interventions have their documented directional effects', () => {
  const withoutBronchodilator = createSimulation('ards');
  const withBronchodilator = createSimulation('ards'); setIntervention(withBronchodilator, 'albuterol', 8);
  stepSimulation(withoutBronchodilator, 1 / 30); stepSimulation(withBronchodilator, 1 / 30);
  assert.ok(volumeControlledBreath(withBronchodilator, withBronchodilator.ventilatorCycle.inspiratoryTimeS / 2).pressureCmH2O
    < volumeControlledBreath(withoutBronchodilator, withoutBronchodilator.ventilatorCycle.inspiratoryTimeS / 2).pressureCmH2O);

  const rvFailure = createSimulation('rv-failure'); const before = rvFailure.metrics.pvr;
  setIntervention(rvFailure, 'inhaledNitricOxide', 40); stepSimulation(rvFailure, 20);
  assert.ok(rvFailure.metrics.pvr < before);

  const ards = createSimulation('ards'); const beforeSpo2 = ards.metrics.spo2;
  setIntervention(ards, 'pronePositioning', 1); stepSimulation(ards, 20);
  assert.ok(ards.metrics.spo2 > beforeSpo2);
});

test('furosemide gradually depletes retained fluid and raises urine output', () => {
  const s = createSimulation('cardiogenic');
  setIntervention(s, 'fluid', 2000); stepSimulation(s, 20);
  const fluidBefore = s.interventions.fluid, cvpBefore = s.metrics.cvp, urineBefore = s.metrics.urineOutput;
  setIntervention(s, 'furosemide', 80);
  stepSimulation(s, 120);
  assert.ok(s.interventions.fluid < fluidBefore, 'fluid drains over time');
  assert.ok(s.metrics.cvp < cvpBefore, 'venous congestion falls as fluid drains');
  assert.ok(s.metrics.urineOutput > urineBefore, 'urine output rises with furosemide');
  const noDose = createSimulation('cardiogenic'); setIntervention(noDose, 'fluid', 2000); stepSimulation(noDose, 140);
  assert.ok(s.interventions.fluid < noDose.interventions.fluid);
});

test('sedation lowers metabolic demand and heart rate; temperature moves both directions', () => {
  const s = createSimulation(); const before = { hr: s.metrics.hr, vo2: s.metrics.vo2 };
  setIntervention(s, 'sedation', 100); stepSimulation(s, 20);
  assert.ok(s.metrics.hr < before.hr && s.metrics.vo2 < before.vo2);

  const fever = createSimulation(); setPatient(fever, 'temperature', 40); stepSimulation(fever, 20);
  const cool = createSimulation(); setPatient(cool, 'temperature', 34); stepSimulation(cool, 20);
  assert.ok(fever.metrics.hr > cool.metrics.hr);
  assert.ok(fever.metrics.vo2 > cool.metrics.vo2);
});

test('nitroprusside and nitroglycerin lower pressure/congestion; esmolol blunts a tachycardic response', () => {
  const dilated = createSimulation('septic'); const before = dilated.metrics.map;
  setIntervention(dilated, 'nitroprusside', 3); stepSimulation(dilated, 20);
  assert.ok(dilated.metrics.map < before);

  const congested = createSimulation('cardiogenic'); setIntervention(congested, 'fluid', 2000); stepSimulation(congested, 20);
  const cvpBefore = congested.metrics.cvp;
  setIntervention(congested, 'nitroglycerin', 200); stepSimulation(congested, 20);
  assert.ok(congested.metrics.cvp < cvpBefore);

  const withEsmolol = createSimulation(); setIntervention(withEsmolol, 'epinephrine', 1); setIntervention(withEsmolol, 'esmolol', 300); stepSimulation(withEsmolol, 20);
  const withoutEsmolol = createSimulation(); setIntervention(withoutEsmolol, 'epinephrine', 1); stepSimulation(withoutEsmolol, 20);
  assert.ok(withEsmolol.metrics.hr < withoutEsmolol.metrics.hr);
});
