/* A small, deterministic cardiovascular/respiratory model for teaching.
 * Values are intentionally illustrative and are not a clinical decision aid. */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const finite = (v) => Number.isFinite(v);
const lerp = (a, b, x) => a + (b - a) * x;
export const SCHEMA_VERSION = 2;
export const FIXED_STEP_SECONDS = 1 / 30;
export const MAX_STEP_SECONDS = 60;
export const HISTORY_CADENCE_SECONDS = 1;

export const DEFAULT_INTERVENTIONS = Object.freeze({
  norepinephrine: 0, dobutamine: 0, fluid: 0, fio2: 21, peep: 0,
  respiratoryRate: 16, tidalVolume: 6, heartRate: 72, icp: 5,
});
export const DEFAULT_PATIENT = Object.freeze({ weight: 70, hemoglobin: 12, contractility: 100,
  vascularTone: 100, volume: 100, metabolicDemand: 100, autoregulation: true, temperature: 37 });

const LIMITS = {
  norepinephrine: [0, 1], dobutamine: [0, 20], epinephrine: [0, 1], phenylephrine: [0, 1], vasopressin: [0, 1],
  milrinone: [0, .75], nitroprusside: [0, 3], nitroglycerin: [0, 200], esmolol: [0, 300], atropine: [0, 3],
  fluid: [0, 2000], fio2: [21, 100],
  peep: [0, 20], respiratoryRate: [6, 35], tidalVolume: [4, 10], heartRate: [40, 160], icp: [0, 40],
  inspiratoryPressure: [5, 40], pressureSupport: [0, 25],
  albuterol: [0, 8], inhaledNitricOxide: [0, 40], furosemide: [0, 80], sedation: [0, 100], pronePositioning: [0, 1],
};
export const INTERVENTION_LIMITS = Object.freeze(Object.fromEntries(Object.entries(LIMITS).map(([k, v]) => [k, Object.freeze([...v])] )));
export const VASOACTIVE_REGISTRY = Object.freeze([
  { id: 'norepinephrine', displayName: 'Norepinephrine', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 1 }), effectDimensions: Object.freeze(['vascularTone', 'venousReturn']), educationalCopy: 'Bounded illustrative vasoconstrictor input; not a clinical dose.' },
  { id: 'dobutamine', displayName: 'Dobutamine', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 20 }), effectDimensions: Object.freeze(['contractility', 'heartRate']), educationalCopy: 'Bounded illustrative inotrope input; not a clinical dose.' },
  { id: 'epinephrine', displayName: 'Epinephrine', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 1 }), effectDimensions: Object.freeze(['contractility', 'vascularTone', 'heartRate']), educationalCopy: 'Named conceptual preset; response calibration remains pending.' },
  { id: 'phenylephrine', displayName: 'Phenylephrine', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 1 }), effectDimensions: Object.freeze(['vascularTone']), educationalCopy: 'Named conceptual preset; response calibration remains pending.' },
  { id: 'vasopressin', displayName: 'Vasopressin', conceptualUnit: 'conceptual model units', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 1 }), effectDimensions: Object.freeze(['vascularTone']), educationalCopy: 'Named conceptual preset; response calibration remains pending.' },
  { id: 'milrinone', displayName: 'Milrinone', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: .75 }), effectDimensions: Object.freeze(['contractility', 'vascularTone', 'heartRate']), educationalCopy: 'Named conceptual inodilator preset: bounded contractility gain paired with vasodilation; response calibration remains pending.' },
  { id: 'nitroprusside', displayName: 'Nitroprusside', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 3 }), effectDimensions: Object.freeze(['vascularTone', 'heartRate']), educationalCopy: 'Named conceptual arterial vasodilator preset; response calibration remains pending.' },
  { id: 'nitroglycerin', displayName: 'Nitroglycerin', conceptualUnit: 'µg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 200 }), effectDimensions: Object.freeze(['venousReturn', 'vascularTone']), educationalCopy: 'Named conceptual venodilator preset; reduces modeled venous congestion more than arterial tone. Response calibration remains pending.' },
  { id: 'esmolol', displayName: 'Esmolol', conceptualUnit: 'µg/kg/min', timeBasis: 'per minute', bounds: Object.freeze({ min: 0, max: 300 }), effectDimensions: Object.freeze(['heartRate', 'contractility']), educationalCopy: 'Named conceptual beta-blocker preset: bounded heart-rate and contractility reduction; response calibration remains pending.' },
  { id: 'atropine', displayName: 'Atropine', conceptualUnit: 'mg', timeBasis: 'bolus', bounds: Object.freeze({ min: 0, max: 3 }), effectDimensions: Object.freeze(['heartRate']), educationalCopy: 'Named conceptual anticholinergic bolus preset; raises modeled heart rate. Response calibration remains pending.' },
]);
const PATIENT_LIMITS = { weight: [40, 150], hemoglobin: [5, 18], contractility: [20, 180], vascularTone: [30, 200], volume: [40, 160], metabolicDemand: [20, 200], temperature: [32, 41] };

const scenarioList = [
  { id: 'healthy', name: 'Healthy circulation', subtitle: 'Normal oxygen delivery', description: 'A resting adult with intact cardiopulmonary reserve.', category: 'baseline', learning: 'Trace normal flow from the right heart through lungs and systemic organs.', parameters: { hr: 72, contractility: 1, tone: 1, volume: 1, shunt: .02, icp: 5 } },
  { id: 'septic', name: 'Distributive shock', subtitle: 'Low tone and high demand', description: 'Vasodilation and relative hypovolemia reduce perfusion pressure.', category: 'shock', learning: 'Compare vasopressor and fluid effects on MAP, flow, and oxygen extraction.', parameters: { hr: 105, contractility: .95, tone: .58, volume: .86, shunt: .08, demand: 1.2 } },
  { id: 'cardiogenic', name: 'Cardiogenic shock', subtitle: 'Pump failure', description: 'Reduced contractility causes low forward flow with venous congestion.', category: 'shock', learning: 'Observe why inotropy may improve flow while raising myocardial demand.', parameters: { hr: 98, contractility: .48, tone: 1.18, volume: 1.05, shunt: .08, congestion: 3 } },
  { id: 'hypovolemic', name: 'Hypovolemic shock', subtitle: 'Preload depletion', description: 'Loss of circulating volume limits stroke volume and delivery.', category: 'shock', learning: 'See fluid responsiveness depend on reserve and venous congestion.', parameters: { hr: 118, contractility: 1, tone: 1.12, volume: .58, shunt: .05 } },
  { id: 'obstructive', name: 'Obstructive shock', subtitle: 'Impaired filling / outflow', description: 'A mechanical obstruction lowers preload and increases venous pressure.', category: 'shock', learning: 'Distinguish low cardiac output from distributive hypotension.', parameters: { hr: 110, contractility: .9, tone: 1.1, volume: .72, shunt: .1, congestion: 6, obstruction: .72 } },
  { id: 'ards', name: 'ARDS', subtitle: 'Severe intrapulmonary shunt', description: 'Poorly aerated lung units impair oxygenation and increase work of breathing.', category: 'respiratory', learning: 'Explore FiO2 and PEEP tradeoffs when shunt limits oxygenation.', parameters: { hr: 100, contractility: 1, tone: 1, volume: .95, shunt: .42, demand: 1.15, lungWater: 3 } },
  { id: 'brain-injury', name: 'Brain injury', subtitle: 'Raised intracranial pressure', description: 'Intracranial hypertension threatens cerebral perfusion pressure.', category: 'neurologic', learning: 'Link MAP, ICP, CPP, and autoregulated cerebral blood flow.', parameters: { hr: 78, contractility: 1, tone: .95, volume: 1, shunt: .07, icp: 28 } },
  { id: 'rv-failure', name: 'Right-ventricular failure', subtitle: 'Pulmonary vascular load', description: 'A strained right ventricle struggles against elevated pulmonary resistance.', category: 'cardiac', learning: 'Watch PEEP, oxygenation, and preload alter RV output.', parameters: { hr: 108, contractility: .7, tone: 1, volume: 1.05, shunt: .15, pvr: 2.2, congestion: 8 } },
];
export const SCENARIOS = Object.freeze(scenarioList);
export const getScenario = (id) => scenarioList.find((s) => s.id === id) || scenarioList[0];

const metricKeys = ['hr','map','sbp','dbp','co','sv','svr','cvp','spo2','svo2','pao2','paco2','cpp','icp','pvr','do2','vo2','lactate','ef','lungWater','oxygenDebt','brainFlow','renalFlow','urineOutput','edv','esv','tidalVolumeMl','minuteVentilation','alveolarVentilation','inotropy','afterload','rateFilling','rvLoad','obstructionFactor'];

// A Hill dissociation curve links content and pressure. Mixing happens in oxygen
// content, rather than averaging oxygen pressures across a pulmonary shunt.
function saturation(po2) { return 100 / (1 + (25.5 / Math.max(po2, .1)) ** 2.9); }
function oxygenContent(po2, hb) { return 1.34 * hb * saturation(po2) / 100 + .003 * po2; }
function pressureForContent(content, hb) {
  let low=.1, high=700;
  for(let k=0;k<28;k++){const mid=(low+high)/2;if(oxygenContent(mid,hb)<content)low=mid;else high=mid;}
  return (low+high)/2;
}
// Shared schematic Frank–Starling forward function. EDV is a preload proxy;
// dimensionless drivers are current relaxed model state, not clinical estimates.
export function forwardStrokeVolume(edvMl, { inotropy, afterload, rateFilling, rvLoad, obstructionFactor }) {
  return clamp(70 * (edvMl / 120) * inotropy * rateFilling * obstructionFactor * rvLoad / afterload,
    8, Math.min(145, edvMl * .85));
}

// Shared lung mechanics used by every ventilator mode. Prone positioning and
// a bronchodilator are bounded, illustrative teaching adjustments to the same
// engineering-choice compliance and resistance used since the original
// volume-control model; they are not calibrated respiratory mechanics.
function lungComplianceMlPerCmH2O(state) {
  const sc = getScenario(state.scenarioId).parameters, i = state.interventions;
  const proneRecruitment = 1 + (i.pronePositioning || 0) * .12;
  return 50 * proneRecruitment / (1 + (sc.lungWater || 0) * .3 + Math.max(0, i.peep - 12) * .025);
}
function airwayResistanceCmH2OPerLS(state) {
  const bronchodilation = Math.min(state.interventions.albuterol || 0, 8) / 8 * .4;
  return 5 * (1 - bronchodilation);
}

// One idealized volume-controlled breath: fixed I:E 1:2, constant inspiratory
// flow, then passive quadratic volume decay to zero. Compliance and resistance
// are illustrative engineering choices, not calibrated lung mechanics.
export function volumeControlledBreath(state, timeS = state.timeS) {
  const i = state.interventions;
  const tidalVolumeMl = i.tidalVolume * state.patient.weight;
  const cycleDurationS = 60 / i.respiratoryRate;
  const inspiratoryTimeS = cycleDurationS / 3, expiratoryTimeS = cycleDurationS - inspiratoryTimeS;
  const timeInCycleS = ((timeS % cycleDurationS) + cycleDurationS) % cycleDurationS;
  const inspiration = timeInCycleS < inspiratoryTimeS;
  const fraction = inspiration ? timeInCycleS / inspiratoryTimeS : (timeInCycleS - inspiratoryTimeS) / expiratoryTimeS;
  const volumeMl = inspiration ? tidalVolumeMl * fraction : tidalVolumeMl * (1 - fraction) ** 2;
  const flowMlS = inspiration ? tidalVolumeMl / inspiratoryTimeS : -2 * tidalVolumeMl * (1 - fraction) / expiratoryTimeS;
  const complianceMlCmH2O = lungComplianceMlPerCmH2O(state);
  const resistanceCmH2OSL = airwayResistanceCmH2OPerLS(state);
  const elasticPressureCmH2O = i.peep + volumeMl / complianceMlCmH2O;
  // During passive expiration, airway opening pressure is the PEEP boundary;
  // elastic pressure inside the lung drives the separate expiratory outflow.
  const pressureCmH2O = inspiration ? elasticPressureCmH2O + resistanceCmH2OSL * flowMlS / 1000 : i.peep;
  return { phase: inspiration ? 'inspiration' : 'expiration', cycleDurationS, timeInCycleS,
    inspiratoryTimeS, expiratoryTimeS, tidalVolumeMl, volumeMl, flowMlS, pressureCmH2O,
    elasticPressureCmH2O, complianceMlCmH2O, resistanceCmH2OSL,
    minuteVentilationMlMin: i.respiratoryRate * tidalVolumeMl,
    alveolarVentilationMlMin: i.respiratoryRate * Math.max(1, i.tidalVolume - 2) * state.patient.weight };
}

// Pressure-targeted breath, shared by Pressure-Control (full mandatory support,
// `inspiratoryPressure`) and Pressure-Support/CPAP (`pressureSupport`) modes.
// Airway pressure holds constant above PEEP during inspiration; inspiratory
// flow decelerates along the same RC (resistance x compliance) time constant
// used for the passive expiratory decay, so tidal volume becomes a modeled
// OUTPUT of compliance and resistance instead of a fixed control -- unlike
// volume control, where tidal volume is the input. This is the same teaching
// distinction real pressure- vs volume-targeted ventilation illustrates.
// Patient-triggered inspiratory effort is not modeled: Pressure-Support/CPAP
// only shows the ventilator-delivered portion of a supported breath.
export function pressureControlledBreath(state, timeS = state.timeS, driveKey = 'inspiratoryPressure') {
  const i = state.interventions;
  const cycleDurationS = 60 / i.respiratoryRate;
  const inspiratoryTimeS = cycleDurationS / 3, expiratoryTimeS = cycleDurationS - inspiratoryTimeS;
  const timeInCycleS = ((timeS % cycleDurationS) + cycleDurationS) % cycleDurationS;
  const inspiration = timeInCycleS < inspiratoryTimeS;
  const complianceMlCmH2O = lungComplianceMlPerCmH2O(state);
  const resistanceCmH2OSL = airwayResistanceCmH2OPerLS(state);
  const resistanceCmH2OPerMlS = resistanceCmH2OSL / 1000;
  const driveCmH2O = i[driveKey];
  const tau = Math.max(1e-6, resistanceCmH2OPerMlS * complianceMlCmH2O);
  const targetVolumeMl = driveCmH2O * complianceMlCmH2O;
  const deliveredVolumeMl = targetVolumeMl * (1 - Math.exp(-inspiratoryTimeS / tau));
  const expiredFraction = inspiration ? 0 : (timeInCycleS - inspiratoryTimeS) / expiratoryTimeS;
  const volumeMl = inspiration ? targetVolumeMl * (1 - Math.exp(-timeInCycleS / tau)) : deliveredVolumeMl * (1 - expiredFraction) ** 2;
  const flowMlS = inspiration ? (driveCmH2O / resistanceCmH2OPerMlS) * Math.exp(-timeInCycleS / tau)
    : -2 * deliveredVolumeMl * (1 - expiredFraction) / expiratoryTimeS;
  const elasticPressureCmH2O = i.peep + volumeMl / complianceMlCmH2O;
  const pressureCmH2O = inspiration ? i.peep + driveCmH2O : i.peep;
  const weight = state.patient.weight, deliveredVTKg = deliveredVolumeMl / weight;
  return { phase: inspiration ? 'inspiration' : 'expiration', cycleDurationS, timeInCycleS,
    inspiratoryTimeS, expiratoryTimeS, tidalVolumeMl: deliveredVolumeMl, volumeMl, flowMlS, pressureCmH2O,
    elasticPressureCmH2O, complianceMlCmH2O, resistanceCmH2OSL,
    minuteVentilationMlMin: i.respiratoryRate * deliveredVolumeMl,
    alveolarVentilationMlMin: i.respiratoryRate * Math.max(1, deliveredVTKg - 2) * weight };
}

const PRESSURE_DRIVE_KEY = { 'pressure-control': 'inspiratoryPressure', 'pressure-support': 'pressureSupport' };
// Dispatches to the breath model matching the selected ventilator mode. Volume
// control remains the schema default and the only mode exercised by legacy tests.
export function ventilatorBreath(state, timeS = state.timeS) {
  const driveKey = PRESSURE_DRIVE_KEY[state.interventions.ventilator.mode];
  return driveKey ? pressureControlledBreath(state, timeS, driveKey) : volumeControlledBreath(state, timeS);
}
// The delivered tidal volume for whichever mode is active -- a fixed input in
// volume control, a modeled output in pressure control and pressure support.
function deliveredTidalVolumeMl(state) {
  const driveKey = PRESSURE_DRIVE_KEY[state.interventions.ventilator.mode];
  return driveKey ? pressureControlledBreath(state, 0, driveKey).tidalVolumeMl : state.interventions.tidalVolume * state.patient.weight;
}
function computeUrineOutputMlH(renalFlow, cvp, furosemideDoseMg = 0) {
  return clamp(20 + renalFlow * .09 * clamp(1 - Math.max(0, cvp - 12) * .03, .25, 1.2) + furosemideDoseMg * 1.2, 0, 240);
}

function targetMetrics(state) {
  const sc=getScenario(state.scenarioId).parameters, p=state.patient, i=state.interventions;
  const tone=clamp(sc.tone*p.vascularTone/100
    + .90*i.norepinephrine + .55*i.epinephrine + .90*i.phenylephrine + .65*i.vasopressin
    - .009*i.dobutamine - .30*i.nitroprusside - .00125*i.nitroglycerin - .47*i.milrinone
    - i.sedation*.002,.25,2.5);
  const reserve=clamp(p.volume/100*sc.volume,.25,1.5);
  const congestion=(sc.congestion||0)+i.peep*.24+i.fluid/2000*(2+(sc.congestion||0)*.65)-i.nitroglycerin*.012;
  const inotropy=clamp(p.contractility/100*sc.contractility*(1+i.dobutamine*.055+i.epinephrine*.04+i.norepinephrine*.09+i.milrinone*.47-i.esmolol*.00083),.10,2.3);
  const fluidResponse=.34*(.30+.70*Math.min(inotropy,1.2))/(1+congestion*.10);
  const preload=clamp(reserve+i.fluid/2000*fluidResponse-congestion/60+i.norepinephrine*.10,.20,1.6);
  const hr=clamp(i.heartRate+i.dobutamine*1.1+i.epinephrine*2+i.norepinephrine*3
    +i.milrinone*4+i.nitroprusside*1.3-i.esmolol*.067+i.atropine*12
    -i.sedation*.08+i.albuterol*.75+(p.temperature-37)*3.5,35,185);
  const rateFilling=clamp(1-Math.max(0,hr-90)*.0045+Math.max(0,60-hr)*.001,.55,1.08);
  const afterload=1+Math.max(0,tone-1)*(.22+.35*Math.max(0,1-inotropy));
  const pvrWood=(sc.pvr||1.2)*(1+i.peep*.025+Math.max(0,i.peep-10)*.035)*(1-Math.min(i.inhaledNitricOxide,40)/40*.45);
  const rvLoad=1/(1+Math.max(0,pvrWood-1.2)*.10);
  const edv=clamp(120*preload,35,250);
  const obstructionFactor=1-(sc.obstruction||0)*.55;
  const sv=forwardStrokeVolume(edv,{inotropy,afterload,rateFilling,rvLoad,obstructionFactor});
  const co=hr*sv/1000,svr=clamp(1300*tone,300,3400);
  const cvp=clamp(5.5+congestion-(1-reserve)*6,0,32),map=cvp+co*svr/80;
  const demand=250*p.metabolicDemand/100*(sc.demand||1)*(1+i.dobutamine*.009+Math.max(0,hr-100)*.0015)
    *(1+(p.temperature-37)*.10)*(1-i.sedation/100*.25);
  // The same mL/kg tidal volume scales ventilation with predicted body weight in
  // volume control; pressure-targeted modes derive a delivered volume instead.
  const tidalVolumeMl=deliveredTidalVolumeMl(state);
  const minuteVentilation=i.respiratoryRate*tidalVolumeMl;
  const alveolarVentilation=i.respiratoryRate*Math.max(1,tidalVolumeMl/p.weight-2)*p.weight;
  const paco2=clamp(40*(p.metabolicDemand/100)*(sc.demand||1)/Math.max(alveolarVentilation/(16*4*70),.15),15,120);
  const capillaryPO2=clamp(i.fio2/100*713-paco2/.8,20,680);
  const recruitable=(sc.shunt||.02)>.2;
  const shunt=clamp((sc.shunt||.02)-Math.min(i.peep,12)*(recruitable?.013:.0005)+Math.max(0,i.peep-12)*.006
    -i.pronePositioning*(recruitable?.10:.01)-Math.min(i.inhaledNitricOxide,40)/40*(recruitable?.05:.005),.008,.65);
  const capContent=oxygenContent(capillaryPO2,p.hemoglobin);
  const ca=clamp(capContent-shunt/(1-shunt)*demand/Math.max(co*10,1),1,capContent);
  const pao2=pressureForContent(ca,p.hemoglobin),spo2=saturation(pao2);
  const do2=co*10*ca,vo2=Math.min(demand,do2*.85);
  const svo2=clamp((ca-vo2/Math.max(co*10,1)-.003*35)/(1.34*p.hemoglobin)*100,0,99);
  const icp=clamp(i.icp+Math.max(0,cvp-10)*.28+(paco2-40)*.10,0,55),cpp=map-icp;
  const effectiveCPP=Math.max(0,map-Math.max(icp,cvp));
  const autoFlow=effectiveCPP<50?effectiveCPP/50:effectiveCPP>150?effectiveCPP/150:1;
  const brainFlow=clamp(50*(p.autoregulation?autoFlow:effectiveCPP/80)*clamp(1+.025*(paco2-40),.3,2),0,150);
  const renalFlow=clamp(1000*(co/5)*clamp((map-cvp)/82,.05,1.3)/(1+Math.max(0,cvp-8)*.06),0,2400);
  const ef=sv/edv*100,esv=edv-sv,pulse=clamp(28+sv*.28,25,70);
  const lungWater=(sc.lungWater||0)+Math.max(0,cvp-9)*.35+Math.max(0,1-inotropy)*i.fluid/500;
  const oxygenDebt=clamp(1-do2/Math.max(demand*3.2,1),0,1);
  const urineOutput=computeUrineOutputMlH(renalFlow,cvp,i.furosemide);
  return {hr,map,sbp:map+pulse*2/3,dbp:map-pulse/3,co,sv,svr,cvp,spo2,svo2,pao2,paco2,cpp,icp,pvr:pvrWood*80,do2,vo2,lactate:1+oxygenDebt*5,ef,lungWater,oxygenDebt,brainFlow,renalFlow,urineOutput,edv,esv,tidalVolumeMl,minuteVentilation,alveolarVentilation,inotropy,afterload,rateFilling,rvLoad,obstructionFactor};
}

// Keep displayed values tied together during the transition, so intermediate
// frames obey the same conservation identities as the steady target.
function synchronizeMetrics(state) {
  const m = state.metrics, patient = state.patient, interventions = state.interventions;
  // Ventilator settings are controls, so their displayed volume and minute
  // ventilation remain exact identities across the relaxation transition.
  if (interventions) {
    m.tidalVolumeMl = deliveredTidalVolumeMl(state);
    m.minuteVentilation = interventions.respiratoryRate * m.tidalVolumeMl;
    m.alveolarVentilation = interventions.respiratoryRate * Math.max(1, m.tidalVolumeMl / patient.weight - 2) * patient.weight;
  }
  m.spo2 = saturation(m.pao2);
  m.sv = forwardStrokeVolume(m.edv, m);
  m.co = m.hr * m.sv / 1000;
  m.map = m.co * m.svr / 80 + m.cvp;
  const pulse = clamp(28 + m.sv * .28, 25, 65);
  m.sbp = m.map + pulse * 2 / 3; m.dbp = m.map - pulse / 3;
  m.cpp = m.map - m.icp;
  const caO2 = 1.34 * patient.hemoglobin * m.spo2 / 100 + .003 * m.pao2;
  m.do2 = m.co * 10 * caO2;
  m.vo2 = Math.min(m.vo2, m.do2 * .85);
  m.svo2 = clamp((caO2 - m.vo2 / Math.max(m.co * 10, 1) - .003 * 35) / Math.max(1.34 * patient.hemoglobin, .1) * 100, 0, 99);
  m.edv = Math.max(m.edv, m.sv + 1); m.esv = m.edv - m.sv; m.ef = m.sv / m.edv * 100;
  m.oxygenDebt = clamp(Math.max(0, 1 - m.do2 / Math.max(m.vo2 * 3.2, 1)), 0, 1);
  m.lactate = 1 + m.oxygenDebt * 5;
  m.urineOutput = computeUrineOutputMlH(m.renalFlow, m.cvp, interventions?.furosemide);
}

function updateCoupledViews(state) {
  Object.defineProperty(state, 'ventilatorCycle', { enumerable: false, configurable: true, value: ventilatorBreath(state) });
  const m = state.metrics;
  const aca = m.brainFlow * .36, mca = m.brainFlow * .44;
  Object.defineProperty(m, 'cerebralTerritories', { enumerable: false, configurable: true, value: Object.freeze({ aca, mca, pca: m.brainFlow - aca - mca }) });
  const preload = m.edv;
  const curve = [];
  for (let index = 0; index < 9; index += 1) {
    const edv = 50 + index * 20;
    curve.push({ edv, sv: forwardStrokeVolume(edv, m) });
  }
  state.frankStarling = { label: 'Schematic Frank–Starling relationship', units: { preload: 'mL EDV', strokeVolume: 'mL', contractility: 'relative inotropy', afterload: 'dimensionless penalty' }, samples: curve, contractility: m.inotropy, afterload: m.afterload, operatingPoint: { preload, strokeVolume: m.sv } };
}

// Preserve sampled values explicitly: the live territory/cycle accessors are
// non-enumerable, and later control changes must not rewrite earlier observations.
export function recordSnapshot(state) {
  const cycle = state.ventilatorCycle, fs = state.frankStarling;
  return { time: state.timeS, ...state.metrics, cerebralTerritories: { ...state.metrics.cerebralTerritories },
    airwayPressureCmH2O: cycle.pressureCmH2O, airwayFlowMlS: cycle.flowMlS, lungVolumeMl: cycle.volumeMl,
    cycleDurationS: cycle.cycleDurationS, respiratoryRate: state.interventions.respiratoryRate,
    peep: state.interventions.peep, fio2: state.interventions.fio2, tidalVolumeMlKg: state.interventions.tidalVolume,
    preloadEDV: fs.operatingPoint.preload, strokeVolume: fs.operatingPoint.strokeVolume,
    contractilityRelative: fs.contractility, afterloadDimensionless: fs.afterload };
}

function defineAlias(object, key, getter, setter, enumerable = false) {
  Object.defineProperty(object, key, { enumerable, configurable: false, get: getter, set: setter });
}

const supportKeys = ['albuterol', 'inhaledNitricOxide', 'furosemide', 'sedation', 'pronePositioning'];
function installV2Compatibility(state) {
  defineAlias(state, 'time', () => state.timeS, (value) => { if (finite(value) && value >= 0) state.timeS = value; });
  const i = state.interventions;
  const v = i.vasoactive;
  for (const key of ['norepinephrine', 'dobutamine']) defineAlias(i, key, () => v[key], (value) => { v[key] = value; }, true);
  for (const key of ['epinephrine', 'phenylephrine', 'vasopressin', 'milrinone', 'nitroprusside', 'nitroglycerin', 'esmolol', 'atropine']) defineAlias(i, key, () => v[key], (value) => { v[key] = value; });
  for (const key of ['fio2', 'peep', 'respiratoryRate', 'tidalVolume', 'heartRate', 'icp']) defineAlias(i, key, () => state.interventions.ventilator[key] ?? state.interventions[key], (value) => { state.interventions.ventilator[key] = value; }, true);
  // Pressure-mode ventilator fields and the support-drug group are v2-only:
  // non-enumerable, like the epinephrine/phenylephrine/vasopressin presets above,
  // so they never leak into the legacy v1 flat intervention shape.
  for (const key of ['inspiratoryPressure', 'pressureSupport']) defineAlias(i, key, () => state.interventions.ventilator[key], (value) => { state.interventions.ventilator[key] = value; });
  defineAlias(i, 'fluid', () => i.fluidAmount, (value) => { i.fluidAmount = value; }, true);
  const s = i.support;
  for (const key of supportKeys) defineAlias(i, key, () => s[key], (value) => { s[key] = value; });
}

const allowedTopLevel = new Set(['schemaVersion','scenarioId','timeS','time','patient','interventions','visual','metrics','history','events']);
const allowedInterventions = new Set([...Object.keys(LIMITS), 'vasoactive', 'ventilator', 'support', 'hypertonicSolution']);
const allowedVasoactive = new Set(['norepinephrine','dobutamine','epinephrine','phenylephrine','vasopressin','milrinone','nitroprusside','nitroglycerin','esmolol','atropine']);
const allowedVentilator = new Set(['mode','fio2','peep','respiratoryRate','tidalVolume','heartRate','icp','inspiratoryPressure','pressureSupport']);
const allowedSupport = new Set(supportKeys);
const allowedVentilatorModes = new Set(['volume-controlled', 'pressure-control', 'pressure-support']);
const allowedOpacity = new Set(['brain','lungs','kidneys']);
const assertPlainObject = (value, name) => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`); };
function validateInputShape(candidate) {
  assertPlainObject(candidate, 'state');
  for (const key of Object.keys(candidate)) if (!allowedTopLevel.has(key)) throw new TypeError(`Unknown state key: ${key}`);
  if (candidate.schemaVersion !== undefined && candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2) throw new TypeError('Unsupported schema version');
  if (candidate.timeS !== undefined && (!finite(candidate.timeS) || candidate.timeS < 0)) throw new TypeError('Invalid timeS');
  if (candidate.time !== undefined && (!finite(candidate.time) || candidate.time < 0)) throw new TypeError('Invalid time');
  if (candidate.patient !== undefined) {
    assertPlainObject(candidate.patient, 'patient');
    for (const [key, value] of Object.entries(candidate.patient)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_PATIENT, key)) throw new TypeError(`Unknown patient key: ${key}`);
      if (key === 'autoregulation' ? typeof value !== 'boolean' : !finite(value) || value < PATIENT_LIMITS[key][0] || value > PATIENT_LIMITS[key][1]) throw new TypeError(`Invalid patient value: ${key}`);
    }
  }
  if (candidate.interventions !== undefined) {
    assertPlainObject(candidate.interventions, 'interventions');
    for (const key of Object.keys(candidate.interventions)) if (!allowedInterventions.has(key)) throw new TypeError(`Unknown intervention key: ${key}`);
    for (const [key, value] of Object.entries(candidate.interventions)) if (LIMITS[key] && (!finite(value) || value < LIMITS[key][0] || value > LIMITS[key][1])) throw new TypeError(`Invalid intervention value: ${key}`);
    const v = candidate.interventions.vasoactive;
    if (v !== undefined) { assertPlainObject(v, 'vasoactive'); for (const key of Object.keys(v)) if (!allowedVasoactive.has(key)) throw new TypeError(`Unknown vasoactive key: ${key}`); for (const [key, value] of Object.entries(v)) if (!finite(value) || value < 0 || value > INTERVENTION_LIMITS[key][1]) throw new TypeError(`Invalid vasoactive value: ${key}`); }
    const vent = candidate.interventions.ventilator;
    if (vent !== undefined) { assertPlainObject(vent, 'ventilator'); for (const key of Object.keys(vent)) if (!allowedVentilator.has(key)) throw new TypeError(`Unknown ventilator key: ${key}`); if (vent.mode !== undefined && !allowedVentilatorModes.has(vent.mode)) throw new TypeError('Unsupported ventilator mode'); for (const [key, value] of Object.entries(vent)) if (key !== 'mode' && LIMITS[key] && (!finite(value) || value < LIMITS[key][0] || value > LIMITS[key][1])) throw new TypeError(`Invalid ventilator value: ${key}`); }
    const support = candidate.interventions.support;
    if (support !== undefined) { assertPlainObject(support, 'support'); for (const key of Object.keys(support)) if (!allowedSupport.has(key)) throw new TypeError(`Unknown support key: ${key}`); for (const [key, value] of Object.entries(support)) if (!finite(value) || value < LIMITS[key][0] || value > LIMITS[key][1]) throw new TypeError(`Invalid support value: ${key}`); }
    if (candidate.interventions.hypertonicSolution !== undefined && candidate.interventions.hypertonicSolution !== null) throw new TypeError('Hypertonic solution is uncalibrated');
  }
  if (candidate.visual !== undefined) { assertPlainObject(candidate.visual, 'visual'); for (const key of Object.keys(candidate.visual)) if (key !== 'opacity') throw new TypeError(`Unknown visual key: ${key}`); const opacity = candidate.visual.opacity || {}; assertPlainObject(opacity, 'visual.opacity'); for (const key of Object.keys(opacity)) if (!allowedOpacity.has(key) || !finite(opacity[key]) || opacity[key] < 0 || opacity[key] > 1) throw new TypeError(`Invalid opacity: ${key}`); }
}
export function validateSimulationState(candidate) {
  try { validateInputShape(candidate); } catch (error) { return { valid: false, reason: error.message }; }
  let invalid = false;
  const visit = (value, path) => {
    if (invalid) return;
    if (value === null) { if (path[path.length - 1] !== 'hypertonicSolution') invalid = true; return; }
    if (typeof value === 'number' && !finite(value)) { invalid = true; return; }
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, [...path, String(index)]));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, [...path, key]));
  };
  visit(candidate, []);
  if (invalid) return { valid: false, reason: 'non-finite or null value' };
  return { valid: true, state: candidate };
}

export function migrateState(input = {}) {
  validateInputShape(input);
  const source = input.interventions && typeof input.interventions === 'object' ? input.interventions : {};
  const sourceVent = source.ventilator || {};
  const sourceVaso = source.vasoactive || {};
  const sourceSupport = source.support || {};
  const state = createSimulation(input.scenarioId || 'healthy');
  const migratedTime = input.timeS ?? input.time;
  if (finite(migratedTime) && migratedTime >= 0) state.timeS = migratedTime;
  if (input.patient && typeof input.patient === 'object') for (const [key, value] of Object.entries(input.patient)) setPatient(state, key, value);
  const aliases = { ...source, ...sourceVent, ...sourceVaso, ...sourceSupport };
  for (const [key, value] of Object.entries(aliases)) if (key !== 'ventilator' && key !== 'vasoactive' && key !== 'support' && key !== 'hypertonicSolution' && key !== 'fluidAmount' && key !== 'mode') setIntervention(state, key, value);
  if (allowedVentilatorModes.has(sourceVent.mode)) state.interventions.ventilator.mode = sourceVent.mode;
  if (finite(source.fluidAmount)) setIntervention(state, 'fluid', source.fluidAmount);
  if (input.visual?.opacity && typeof input.visual.opacity === 'object') state.visual.opacity = { ...state.visual.opacity, ...input.visual.opacity };
  return state;
}

export function createSimulation(scenarioId = 'healthy', patientOverrides = {}) {
  const id = getScenario(scenarioId).id;
  const patient = { ...DEFAULT_PATIENT, ...patientOverrides };
  for (const k of Object.keys(DEFAULT_PATIENT)) {
    if (k === 'autoregulation') patient[k] = typeof patient[k] === 'boolean' ? patient[k] : DEFAULT_PATIENT[k];
    else if (!finite(patient[k])) patient[k] = DEFAULT_PATIENT[k];
    else patient[k] = clamp(patient[k], ...PATIENT_LIMITS[k]);
  }
  const parameters = getScenario(id).parameters;
  const legacy = { ...DEFAULT_INTERVENTIONS, heartRate: parameters.hr ?? DEFAULT_INTERVENTIONS.heartRate, icp: parameters.icp ?? DEFAULT_INTERVENTIONS.icp };
  const state = { schemaVersion: SCHEMA_VERSION, timeS: 0, scenarioId: id, patient, interventions: {
    ...legacy,
  }, visual: { opacity: { brain: 1, lungs: 1, kidneys: 1 } }, metrics: {}, history: [], events: [] };
  Object.defineProperties(state.interventions, {
    fluidAmount: { enumerable: false, configurable: false, writable: true, value: legacy.fluid },
    vasoactive: { enumerable: false, configurable: false, writable: false, value: { norepinephrine: legacy.norepinephrine, dobutamine: legacy.dobutamine, epinephrine: 0, phenylephrine: 0, vasopressin: 0, milrinone: 0, nitroprusside: 0, nitroglycerin: 0, esmolol: 0, atropine: 0 } },
    hypertonicSolution: { enumerable: false, configurable: false, writable: true, value: null },
    ventilator: { enumerable: false, configurable: false, writable: false, value: { mode: 'volume-controlled', fio2: legacy.fio2, peep: legacy.peep, respiratoryRate: legacy.respiratoryRate, tidalVolume: legacy.tidalVolume, heartRate: legacy.heartRate, icp: legacy.icp, inspiratoryPressure: 15, pressureSupport: 8 } },
    support: { enumerable: false, configurable: false, writable: false, value: { albuterol: 0, inhaledNitricOxide: 0, furosemide: 0, sedation: 0, pronePositioning: 0 } },
  });
  Object.defineProperty(state, '_stepAccumulator', { enumerable: false, configurable: false, writable: true, value: 0 });
  installV2Compatibility(state);
  Object.assign(state.metrics, targetMetrics(state));
  updateCoupledViews(state);
  state.history.push(recordSnapshot(state));
  return state;
}

export function stepSimulation(state, dt) {
  if (!finite(dt) || dt <= 0) return state;
  dt = Math.min(dt, MAX_STEP_SECONDS);
  state._stepAccumulator = (state._stepAccumulator || 0) + dt;
  while (state._stepAccumulator + 1e-12 >= FIXED_STEP_SECONDS) {
    state._stepAccumulator -= FIXED_STEP_SECONDS;
    const target = targetMetrics(state); const alpha = 1 - Math.exp(-FIXED_STEP_SECONDS / 1.4);
    for (const k of metricKeys) state.metrics[k] = lerp(state.metrics[k], target[k], alpha);
    synchronizeMetrics(state);
    // A loop diuretic depletes modeled retained fluid over simulated time rather
    // than acting as an instantaneous input, so its effect on preload and venous
    // congestion is only visible after the simulation advances.
    const furosemideDose = state.interventions.support.furosemide;
    if (furosemideDose > 0) {
      const illustrativeMaxEliminationMlPerMin = 400;
      state.interventions.fluidAmount = Math.max(0, state.interventions.fluidAmount - (furosemideDose / 80) * illustrativeMaxEliminationMlPerMin / 60 * FIXED_STEP_SECONDS);
    }
    const previous = state.timeS;
    state.timeS = (Math.round(state.timeS / FIXED_STEP_SECONDS) + 1) * FIXED_STEP_SECONDS;
    updateCoupledViews(state);
    const warn = state.metrics.cpp < 50 ? 'CPP below 50 mmHg' : state.metrics.spo2 < 90 ? 'Oxygenation impaired' : state.metrics.lactate > 2.5 ? 'Oxygen debt accumulating' : null;
    if (warn && state.events[state.events.length - 1]?.label !== warn) state.events.push({ time: state.timeS, label: warn });
    if (Math.floor(state.timeS + 1e-9) > Math.floor(previous + 1e-9)) state.history.push(recordSnapshot(state));
  }
  state.timeS = Math.round(state.timeS / FIXED_STEP_SECONDS) * FIXED_STEP_SECONDS;
  if (state.history.length > 1800) state.history.splice(0, state.history.length - 1800);
  return state;
}

export function setIntervention(state, key, value) {
  if (!Object.prototype.hasOwnProperty.call(LIMITS, key) || !finite(value)) return state;
  const target = allowedVasoactive.has(key) ? state.interventions.vasoactive
    : allowedSupport.has(key) ? state.interventions.support
    : key === 'fluid' ? state.interventions
    : state.interventions.ventilator;
  const storageKey = key === 'fluid' ? 'fluidAmount' : key;
  const next = clamp(value, ...LIMITS[key]);
  if (target[storageKey] === next && !(key === 'fluid' && state.interventions.fluidAmount === next)) return state;
  if (key === 'fluid') state.interventions.fluidAmount = next; else target[storageKey] = next;
  state.events.push({ time: state.timeS, label: `${key}: ${next}` });
  return state;
}
export const VENTILATOR_MODES = Object.freeze([
  { id: 'volume-controlled', name: 'Volume control', help: 'Delivers a fixed tidal volume at a constant inspiratory flow. Airway pressure is the modeled output and rises with worsening compliance or resistance.' },
  { id: 'pressure-control', name: 'Pressure control', help: 'Holds a fixed inspiratory pressure above PEEP. Delivered tidal volume is the modeled output and falls when compliance worsens or resistance rises.' },
  { id: 'pressure-support', name: 'Pressure support / CPAP', help: 'A lower, patient-oriented support pressure above PEEP. With support at 0 cmH₂O this is CPAP. Patient inspiratory effort and triggering are not modeled.' },
]);
export function setVentilatorMode(state, mode) {
  if (!allowedVentilatorModes.has(mode)) return state;
  if (state.interventions.ventilator.mode === mode) return state;
  state.interventions.ventilator.mode = mode;
  state.events.push({ time: state.timeS, label: `ventilator mode: ${mode}` });
  return state;
}
export function setPatient(state, key, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_PATIENT, key) || (key !== 'autoregulation' && !finite(value))) return state;
  if (key === 'autoregulation') {
    if (typeof value !== 'boolean') return state;
    state.patient[key] = value;
  }
  else state.patient[key] = clamp(value, ...PATIENT_LIMITS[key]);
  state.events.push({ time: state.timeS, label: `${key}: ${state.patient[key]}` });
  return state;
}
export function resetInterventions(state) { for (const [key, value] of Object.entries(DEFAULT_INTERVENTIONS)) setIntervention(state, key, value); Object.assign(state.interventions.vasoactive, { epinephrine: 0, phenylephrine: 0, vasopressin: 0, milrinone: 0, nitroprusside: 0, nitroglycerin: 0, esmolol: 0, atropine: 0 }); Object.assign(state.interventions.support, { albuterol: 0, inhaledNitricOxide: 0, furosemide: 0, sedation: 0, pronePositioning: 0 }); state.interventions.hypertonicSolution = null; setVentilatorMode(state, 'volume-controlled'); setIntervention(state, 'inspiratoryPressure', 15); setIntervention(state, 'pressureSupport', 8); setIntervention(state, 'heartRate', getScenario(state.scenarioId).parameters.hr); setIntervention(state, 'icp', getScenario(state.scenarioId).parameters.icp ?? 5); return state; }
export function getInsights(state) {
  const m = state.metrics; const out = [];
  if (m.map < 65 || m.cpp < 50) out.push({ title: 'Perfusion pressure', text: `MAP ${m.map.toFixed(0)} / CPP ${m.cpp.toFixed(0)} mmHg: organ perfusion is threatened.`, tone: 'warning' });
  if (m.spo2 < 92) out.push({ title: 'Oxygenation', text: `SaO₂ ${m.spo2.toFixed(0)}% reflects impaired gas exchange and shunt.`, tone: 'danger' });
  if (m.co < 4 || m.svo2 < 60) out.push({ title: 'Oxygen delivery', text: `CO ${m.co.toFixed(1)} L/min and SvO₂ ${m.svo2.toFixed(0)}% suggest reduced delivery or increased extraction.`, tone: 'warning' });
  if (state.interventions.peep > 10) out.push({ title: 'PEEP tradeoff', text: 'Higher PEEP may recruit lung but reduce venous return and raise pulmonary vascular load.', tone: 'info' });
  if (!out.length) out.push({ title: 'Stable physiology', text: 'Flow, pressure, and oxygen delivery are within this teaching model’s normal range.', tone: 'success' });
  return out;
}
