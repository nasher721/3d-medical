import { recordSnapshot } from './physiology.js';
import { HYPERTONIC_CALIBRATION_RECORDS } from './content.js';

export const calibrationSnapshot = () => ({ modelVersion: '2', hypertonic: HYPERTONIC_CALIBRATION_RECORDS.map(({ id, calibrationStatus, calibrationVersion }) => ({ id, calibrationStatus, calibrationVersion })) });
const clone = value => structuredClone(value);
export function serializeSession(state, { layers, baseline = null, colorMode = 'oxygenation', selectedOrgan = 'whole', speed = 1 }, exportedAt = new Date().toISOString()) {
  return { format: 'flowstate-session', version: 2, schemaVersion: 2, exportedAt,
    scenarioId: state.scenarioId, timeS: state.timeS, patient: { ...state.patient },
    interventions: { vasoactive: { ...state.interventions.vasoactive },
      ventilator: { ...state.interventions.ventilator }, fluid: state.interventions.fluidAmount, hypertonicSolution: null },
    visual: { opacity: { ...layers.opacity } }, metrics: { ...state.metrics, cerebralTerritories: { ...state.metrics.cerebralTerritories } },
    frankStarling: clone(state.frankStarling), ventilatorCycle: clone(state.ventilatorCycle), calibration: calibrationSnapshot(),
    baseline: baseline ? clone(baseline) : null, history: clone(state.history), events: clone(state.events),
    layers: { particles: layers.particles, labels: layers.labels, vessels: layers.vessels, transparent: layers.transparent },
    colorMode, selectedOrgan, speed, model: 'Educational lumped-parameter approximation. Not clinically validated.' };
}
// Imported metadata is evidence, never authority to activate a solver option.
export function validateDerivedArchive(data, reference) {
  const shape = (value, expected, path) => {
    if (expected === null) { if (value !== null) throw new Error(`Invalid ${path}`); return; }
    if (typeof expected === 'number') { if (!Number.isFinite(value)) throw new Error(`Invalid ${path}`); return; }
    if (typeof expected === 'string') { if (value !== expected) throw new Error(`Invalid ${path}`); return; }
    if (Array.isArray(expected)) { if (!Array.isArray(value) || value.length !== expected.length) throw new Error(`Invalid ${path}`); value.forEach((entry, i) => shape(entry, expected[i], `${path}[${i}]`)); return; }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== Object.keys(expected).sort().join()) throw new Error(`Invalid ${path}`);
    for (const key of Object.keys(expected)) shape(value[key], expected[key], `${path}.${key}`);
  };
  if (data.calibration !== undefined) shape(data.calibration, calibrationSnapshot(), 'calibration');
  if (data.frankStarling !== undefined) shape(data.frankStarling, reference.frankStarling, 'frankStarling');
  if (data.ventilatorCycle !== undefined) {
    if (!['inspiration', 'expiration'].includes(data.ventilatorCycle?.phase)) throw new Error('Invalid ventilator phase.');
    shape(data.ventilatorCycle, { ...reference.ventilatorCycle, phase: data.ventilatorCycle.phase }, 'ventilatorCycle');
  }
}

export const CSV_COLUMNS = Object.freeze([
  ['time','time_s'],['hr','hr_bpm'],['map','map_mmHg'],['sbp','sbp_mmHg'],['dbp','dbp_mmHg'],['co','co_L_min'],['sv','sv_mL'],['svr','svr_dyn_s_cm5'],['cvp','cvp_mmHg'],['spo2','SaO2_pct'],['svo2','SvO2_pct'],['pao2','PaO2_mmHg'],['paco2','PaCO2_mmHg'],['cpp','CPP_mmHg'],['icp','ICP_mmHg'],['do2','DO2_mL_min'],['lactate','lactate_mmol_L'],
  ['brainFlow','brainFlow_mL_100g_min'],['cerebralTerritories.aca','ACA_mL_100g_min'],['cerebralTerritories.mca','MCA_mL_100g_min'],['cerebralTerritories.pca','PCA_mL_100g_min'],['renalFlow','renalPerfusion_mL_min'],['urineOutput','urineOutput_mL_h'],
  ['tidalVolumeMl','VT_mL'],['minuteVentilation','minuteVentilation_mL_min'],['alveolarVentilation','alveolarVentilation_mL_min'],['airwayPressureCmH2O','airwayPressure_cmH2O'],['airwayFlowMlS','airwayFlow_mL_s'],['lungVolumeMl','lungVolume_mL'],['cycleDurationS','breathDuration_s'],['respiratoryRate','respiratoryRate_per_min'],['peep','PEEP_cmH2O'],['fio2','FiO2_pct'],['tidalVolumeMlKg','VT_mL_kg_PBW'],
  ['preloadEDV','preloadEDV_mL'],['strokeVolume','strokeVolume_mL'],['contractilityRelative','contractility_relative'],['afterloadDimensionless','afterload_dimensionless'],
]);
export function serializeCSV(state) {
  const rows = state.history.length ? state.history : [recordSnapshot(state)];
  return ['scenario,' + CSV_COLUMNS.map(([, unit]) => unit).join(','), ...rows.map(row => state.scenarioId + ',' + CSV_COLUMNS.map(([key]) => {
    const value = key.split('.').reduce((value, part) => value?.[part], row) ?? key.split('.').reduce((value, part) => value?.[part], row.metrics);
    return Number.isFinite(value) ? String(value) : '';
  }).join(','))].join('\n');
}
