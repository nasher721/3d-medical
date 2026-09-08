import { VASOACTIVE_REGISTRY, VENTILATOR_MODES } from './physiology.js';
import { HYPERTONIC_CALIBRATION_RECORDS } from './content.js';

const paths = {
  pulse: '<path d="M2 12h4l3-9 5 18 4-13 3 4h3"/>',
  person: '<circle cx="12" cy="6" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4M8 12l-3 6m11-6 3 6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  lungs: '<path d="M10 3v9l-5 5m9-14v9l5 5M9 6C5 6 2 13 2 18c0 4 7 3 7 0V6Zm6 0c4 0 7 7 7 12 0 4-7 3-7 0V6Z"/>',
  brain: '<path d="M12 4c-3-4-8 0-7 3-5 1-5 8-1 9-1 5 7 7 8 3V4Zm0 0c3-4 8 0 7 3 5 1 5 8 1 9 1 5-7 7-8 3M5 7l3 2-1 3m-3 4 4-1m11-8-3 2 1 3m3 4-4-1"/>',
  kidneys: '<path d="M7 3c-7 2-7 17 0 17 4 0 4-6 1-7 2-2 3-8-1-10Zm10 0c7 2 7 17 0 17-4 0-4-6-1-7-2-2-3-8 1-10ZM9 14l2 3v5m4-8-2 3v5"/>',
  vessels: '<path d="M12 22V2m0 7L6 4m6 12 7-7M7 22l5-6M3 2l3 2V1m13 8 3-1m-3 1V5m-7 5L4 9"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>',
  book: '<path d="M4 3h13a3 3 0 0 1 3 3v16H7a3 3 0 0 1-3-3V3Zm0 15h16M8 7h7m-7 4h6"/>',
  export: '<path d="M12 2v13m-5-5 5 5 5-5M3 15v6h18v-6"/>',
  settings: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  drop: '<path d="M12 2S4 11 4 16a8 8 0 0 0 16 0C20 11 12 2 12 2Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  save: '<path d="M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
};
export function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`; }
export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export function displayNumber(n, digits = 0) { return Number.isFinite(n) ? n.toFixed(digits) : '—'; }
// Per-drug slider granularity; anything not listed uses the norepinephrine-style default.
const VASOACTIVE_STEP = { dobutamine: [.5, 1], milrinone: [.02, 2], nitroprusside: [.05, 2], nitroglycerin: [2, 0], esmolol: [5, 0], atropine: [.1, 1] };
export const INTERVENTIONS = {
  vasoactive: [
    ...VASOACTIVE_REGISTRY.map(record => { const [step, digits] = VASOACTIVE_STEP[record.id] || [.01, 2]; return { key: record.id, name: record.displayName, unit: record.conceptualUnit, min: record.bounds.min, max: record.bounds.max, step, digits, help: record.educationalCopy }; }),
    {key:'heartRate',name:'Heart rate',unit:'bpm',min:40,max:160,step:1,digits:0,help:'Set the intrinsic rate. The model adds drug effects; fast rates shorten diastolic filling.'},
  ],
  fluids: [
    {key:'fluid',name:'Retained fluid',unit:'mL',min:0,max:2000,step:50,digits:0,help:'A simplified cumulative retained volume, not an infusion prescription. Response depends on preload reserve and cardiac function.'},
    {key:'furosemide',name:'Furosemide (diuretic)',unit:'mg',min:0,max:80,step:5,digits:0,help:'A named conceptual loop-diuretic preset. While active it gradually depletes modeled retained fluid and raises urine output over simulated time; it is not a dosing recommendation.'},
  ],
  ventilation: [
    {key:'fio2',name:'Inspired oxygen',unit:'%',min:21,max:100,step:1,digits:0,help:'Raises alveolar oxygen. Intrapulmonary shunt limits the improvement in arterial oxygenation.'},
    {key:'peep',name:'PEEP',unit:'cmH₂O',min:0,max:20,step:1,digits:0,help:'Recruits collapsed lung but raises intrathoracic pressure, reduces venous return and can increase RV afterload.'},
    {key:'respiratoryRate',name:'Respiratory rate',unit:'/min',min:6,max:35,step:1,digits:0,help:'Increases alveolar minute ventilation and lowers PaCO₂. Cerebral blood flow responds to carbon dioxide.'},
    {key:'tidalVolume',name:'Tidal volume',unit:'mL/kg PBW',min:4,max:10,step:.5,digits:1,help:'Volume-control target. Changes alveolar ventilation directly. Predicted body weight is an explicit patient setting in this model.'},
    {key:'inspiratoryPressure',name:'Inspiratory pressure',unit:'cmH₂O above PEEP',min:5,max:40,step:1,digits:0,help:'Pressure-control target. Delivered tidal volume becomes a modeled output of this pressure, compliance and resistance instead of a fixed input.'},
    {key:'pressureSupport',name:'Pressure support',unit:'cmH₂O above PEEP',min:0,max:25,step:1,digits:0,help:'Pressure-support/CPAP target above PEEP. At 0 cmH₂O this is CPAP. Patient inspiratory effort and triggering are not modeled.'},
  ],
  respiratorySupport: [
    {key:'albuterol',name:'Albuterol (bronchodilator)',unit:'doses',min:0,max:8,step:.5,digits:1,help:'A named conceptual bronchodilator preset. Bounded reduction in modeled airway resistance lowers peak/plateau airway pressure; a mild heart-rate rise is a modeled side effect.'},
    {key:'inhaledNitricOxide',name:'Inhaled nitric oxide',unit:'ppm',min:0,max:40,step:1,digits:0,help:'A named conceptual selective pulmonary vasodilator preset. Bounded reduction in modeled pulmonary vascular resistance, with a small V/Q-matching benefit where shunt is high.'},
    {key:'pronePositioning',name:'Prone positioning',unit:'boolean',min:0,max:1,step:1,digits:0,help:'A patient-positioning maneuver, not a drug. Modestly improves compliance and reduces shunt in a recruitable lung. Rendered as a toggle, not a slider.'},
  ],
  cerebral: [
    {key:'icp',name:'Intracranial pressure',unit:'mmHg',min:0,max:40,step:1,digits:0,help:'Set baseline ICP. The model includes secondary CO₂ and venous-pressure effects. CPP equals MAP minus ICP.'},
    {key:'sedation',name:'Sedation depth',unit:'conceptual scale',min:0,max:100,step:5,digits:0,help:'A bounded conceptual sedation-depth input. Reduces modeled metabolic demand and heart rate, and mildly reduces vascular tone; it is not a dosing tool for any agent.'},
  ],
};
export const PATIENT_FIELDS = [
  {key:'weight',name:'Predicted body weight',unit:'kg',min:40,max:150,step:1},
  {key:'hemoglobin',name:'Hemoglobin',unit:'g/dL',min:5,max:18,step:.5,digits:1},
  {key:'contractility',name:'Contractility',unit:'% of scenario',min:20,max:180,step:5},
  {key:'vascularTone',name:'Vascular tone',unit:'% of scenario',min:30,max:200,step:5},
  {key:'volume',name:'Circulating volume',unit:'% of scenario',min:40,max:160,step:5},
  {key:'metabolicDemand',name:'Metabolic demand',unit:'% of baseline',min:20,max:200,step:5},
  {key:'temperature',name:'Core temperature',unit:'°C',min:32,max:41,step:.1,digits:1},
];

// Step 8 UI contract: app.js may project these records into controls once the
// v2 physiology and anatomy contracts are available. Keeping them separate
// from the legacy INTERVENTIONS object prevents unsupported options from
// becoming writable through today's adapter.
export const ORGAN_VISUALS = Object.freeze([
  { key: 'brain', name: 'Brain', unit: 'opacity', min: 0, max: 1, step: 0.05, digits: 2, defaultValue: 1 },
  { key: 'lungs', name: 'Lungs', unit: 'opacity', min: 0, max: 1, step: 0.05, digits: 2, defaultValue: 1 },
  { key: 'kidneys', name: 'Kidneys', unit: 'opacity', min: 0, max: 1, step: 0.05, digits: 2, defaultValue: 1 },
]);

export const VOLUME_CONTROL_VENTILATOR = Object.freeze({
  key: 'volume-control',
  name: 'Volume-controlled ventilation',
  mode: 'volume-control',
  fields: Object.freeze([
    { key: 'respiratoryRate', name: 'Respiratory rate', unit: '/min', min: 6, max: 35, step: 1, digits: 0 },
    { key: 'tidalVolume', name: 'Tidal volume', unit: 'mL/kg PBW', min: 4, max: 10, step: 0.5, digits: 1 },
    { key: 'fio2', name: 'Inspired oxygen', unit: '%', min: 21, max: 100, step: 1, digits: 0 },
    { key: 'peep', name: 'PEEP', unit: 'cmH₂O', min: 0, max: 20, step: 1, digits: 0 },
  ]),
});

// These placeholders are intentionally disabled until Step 1/3 supplies a
// reviewed calibration record. They contain no clinical dose or target copy.
export const HYPERTONIC_UI_PRESETS = Object.freeze(HYPERTONIC_CALIBRATION_RECORDS.map(record => ({
  key: record.id, name: record.displayName, concentrationPercent: record.concentrationPercent,
  calibrationStatus: record.calibrationStatus, enabled: record.calibrationStatus === 'reviewed' && record.solverConsumable === true,
  disabledReason: record.calibrationGate?.reason || 'Unavailable until a source-reviewed educational calibration record is present.',
})));

export const UI_VASOACTIVE_PRESETS = Object.freeze(VASOACTIVE_REGISTRY.map(record => ({
  key: record.id, name: record.displayName, unit: record.conceptualUnit,
  timeBasis: record.timeBasis, min: record.bounds.min, max: record.bounds.max,
})));

export function visualOpacityMarkup(values = {}) {
  return ORGAN_VISUALS.map(field => sliderMarkup(field, values[field.key] ?? field.defaultValue, 'opacity')).join('');
}

export function ventilatorMarkup(values = {}) {
  return VOLUME_CONTROL_VENTILATOR.fields.map(field => sliderMarkup(field, values[field.key] ?? field.min, 'ventilator')).join('');
}

export function ventilatorModeMarkup(currentMode) {
  return `<select id="ventilator-mode" aria-label="Ventilator mode" data-ventilator-mode>${VENTILATOR_MODES.map(mode => `<option value="${mode.id}" ${mode.id === currentMode ? 'selected' : ''}>${escapeHTML(mode.name)}</option>`).join('')}</select>`;
}
export function ventilatorModeHelp(mode) { return VENTILATOR_MODES.find(m => m.id === mode)?.help || ''; }
// Which of the ventilation-tab fields apply to the selected mode. FiO2, PEEP
// and respiratory rate are shared controls; the drive field is mode-specific.
export function ventilationFieldsForMode(mode) {
  const driveKey = mode === 'pressure-control' ? 'inspiratoryPressure' : mode === 'pressure-support' ? 'pressureSupport' : 'tidalVolume';
  return INTERVENTIONS.ventilation.filter(field => !['tidalVolume', 'inspiratoryPressure', 'pressureSupport'].includes(field.key) || field.key === driveKey);
}

export function hypertonicOptionMarkup() {
  return HYPERTONIC_UI_PRESETS.map(option => `<option value="${option.key}" disabled title="${escapeHTML(option.disabledReason)}">${escapeHTML(option.name)} — unavailable</option>`).join('');
}
export function sliderMarkup(field, value, kind = 'intervention') {
  return `<div class="control-row"><div class="control-label"><label for="${kind}-${field.key}">${field.name}</label>${field.help ? `<button class="help-icon" title="${escapeHTML(field.help)}" aria-label="About ${field.name}" data-help="${field.key}">${icon('info')}</button>` : ''}<span class="unit">${field.unit}</span></div><div class="control-value"><input type="number" id="number-${kind}-${field.key}" aria-label="${field.name} value" data-${kind}="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${Number(value).toFixed(field.digits ?? 0)}"/><span>${field.unit}</span></div><input id="${kind}-${field.key}" class="slider" aria-label="${field.name}" type="range" data-${kind}="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" style="--fill:${(value-field.min)/(field.max-field.min)*100}%"/><div class="range-labels"><span>${field.min}</span><span>${field.max}</span></div></div>`;
}
