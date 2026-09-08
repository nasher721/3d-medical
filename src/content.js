export const ORGAN_INFO = {
  whole: {name:'Whole circulation',subtitle:'One circuit. Connected consequences.',text:'Follow oxygen-poor blood through the right heart and lungs, then oxygen-rich blood through the left heart to the brain, kidneys and systemic circulation.',metrics:[['co','Cardiac output','L/min',1],['do2','Oxygen delivery','mL/min',0],['svo2','Mixed venous O₂','%',0]],lesson:'Pressure is not flow. Compare MAP with cardiac output and oxygen delivery when you change vascular tone.'},
  heart: {name:'Heart',subtitle:'The pressure–flow engine',text:'The right ventricle drives pulmonary flow; the left ventricle drives systemic flow. Preload, contractility and afterload determine stroke volume.',metrics:[['sv','Stroke volume','mL',0],['ef','Ejection fraction','%',0],['edv','End-diastolic volume','mL',0]],lesson:'Try dobutamine in cardiogenic shock. Follow cardiac output, then compare the pressure–volume loop.'},
  lungs: {name:'Lungs',subtitle:'Gas exchange meets hemodynamics',text:'Blood receives oxygen across the pulmonary circulation. Shunt limits oxygenation; PEEP trades recruitment against venous return and right ventricular load.',metrics:[['pao2','PaO₂','mmHg',0],['paco2','PaCO₂','mmHg',0],['pvr','Pulmonary resistance','dyn·s/cm⁵',0]],lesson:'In ARDS, increase PEEP in steps. Watch oxygenation and cardiac output together, rather than treating either in isolation.'},
  brain: {name:'Brain',subtitle:'Perfusion beyond the MAP',text:'Cerebral perfusion pressure is MAP minus intracranial pressure. Autoregulation buffers pressure changes, while PaCO₂ alters cerebral vascular tone.',metrics:[['cpp','Cerebral perfusion','mmHg',0],['icp','Intracranial pressure','mmHg',0],['brainFlow','Cerebral blood flow','mL/100 g/min',0]],lesson:'Compare the effects of raising MAP and lowering baseline ICP. Then change ventilation to see the CO₂–flow relationship.'},
  kidneys: {name:'Kidneys',subtitle:'Forward flow and venous congestion',text:'Renal flow depends on systemic perfusion and the venous pressure opposing it. Higher blood pressure does not always mean better organ flow.',metrics:[['renalFlow','Renal blood flow','mL/min',0],['cvp','Venous pressure','mmHg',1],['map','Mean arterial pressure','mmHg',0]],lesson:'In RV failure, compare a fluid bolus with a change in contractility. Follow CVP and renal flow, not MAP alone.'},
  systemic: {name:'Systemic vessels',subtitle:'Resistance, capacitance and delivery',text:'Arteries distribute flow and veins hold the majority of circulating volume. Vascular resistance links flow to pressure; hemoglobin links blood flow to oxygen delivery.',metrics:[['svr','Systemic resistance','dyn·s/cm⁵',0],['do2','Oxygen delivery','mL/min',0],['lactate','Lactate estimate','mmol/L',1]],lesson:'Reduce hemoglobin in Patient settings. Oxygen saturation may stay normal while oxygen delivery falls.'},
};

export const LESSONS = [
  {id:'pressure-flow',title:'Pressure is not flow',category:'Circulation',duration:'4 min',scenario:'septic',description:'Explore the difference between restoring vascular tone and restoring oxygen delivery.',steps:[{title:'Observe distributive shock',text:'Start with the low vascular resistance and MAP. Note cardiac output, mixed venous saturation and oxygen delivery.',action:'Capture a baseline before intervening.'},{title:'Restore vascular tone',text:'Select norepinephrine and make a small conceptual change, then let the model settle. Compare MAP and cardiac output against baseline.',action:'A rise in pressure can exceed the improvement in forward flow.'},{title:'Challenge the oxygen budget',text:'Open Patient settings and reduce hemoglobin to 7 g/dL. Watch oxygen delivery even if arterial saturation stays high.',action:'Explain why a normal saturation does not guarantee adequate oxygen delivery.'}]},
  {id:'preload',title:'When fluid stops helping',category:'Hemodynamics',duration:'5 min',scenario:'cardiogenic',description:'See the Frank–Starling relationship and the cost of venous congestion.',steps:[{title:'Recognize pump failure',text:'Compare low cardiac output with elevated filling pressure. Switch to the pressure–volume loop.',action:'Capture baseline CO, CVP and end-diastolic volume.'},{title:'Test the fluid response',text:'Add a 250 mL bolus and let the model settle. Then repeat and watch how flow and venous pressure change.',action:'Does each bolus give the same improvement in forward flow?'},{title:'Change contractility',text:'Increase dobutamine in small steps. Compare ejection fraction, stroke volume and the loop against baseline.',action:'Explain how congestion and contractility change the fluid response.'}]},
  {id:'peep',title:'The two sides of PEEP',category:'Heart–lung interaction',duration:'5 min',scenario:'ards',description:'Balance alveolar recruitment against right-heart loading and preload.',steps:[{title:'Understand the shunt',text:'Raise inspired oxygen with PEEP unchanged. Look at the incomplete saturation response.',action:'Why does increasing FiO₂ have diminishing returns in shunt physiology?'},{title:'Recruit the lung',text:'Increase PEEP from 5 to 10 cmH₂O. Follow both arterial saturation and cardiac output.',action:'Switch between lung and heart views to compare the effects.'},{title:'Find the tradeoff',text:'Increase PEEP further and compare oxygen delivery with oxygen saturation. These estimates are illustrative, not a bedside PEEP prescription.',action:'Describe how improved oxygenation can coexist with lower systemic flow.'}]},
  {id:'cpp',title:'Protect cerebral perfusion',category:'Neurocritical care',duration:'4 min',scenario:'brain-injury',description:'Connect MAP, intracranial pressure, autoregulation and carbon dioxide.',steps:[{title:'Look beyond systemic pressure',text:'Select the brain and identify the gap between MAP and CPP. Capture the baseline.',action:'Compute CPP from the two modeled pressure estimates.'},{title:'Change intracranial pressure',text:'Lower baseline ICP in the Cerebral tab. Compare CPP and brain flow after the model settles.',action:'Explain the effect without assuming that blood pressure changed.'},{title:'Ventilate and compare',text:'Increase respiratory rate and follow PaCO₂ and cerebral blood flow. Toggle autoregulation in Patient settings.',action:'Explain why a higher CPP does not always produce higher cerebral blood flow.'}]},
];

export const REFERENCES = [
  {title:'Cardiovascular physiology: cardiac output',url:'https://www.ncbi.nlm.nih.gov/books/NBK470455/',note:'Cardiac output, stroke volume and determinants of forward flow.'},
  {title:'Mean arterial pressure — CV Physiology',url:'https://cvphysiology.com/blood-pressure/bp006',note:'Relationship between arterial pressure, cardiac output and resistance.'},
  {title:'Clinical review: positive end-expiratory pressure and cardiac output',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC1414045/',note:'Heart–lung interactions, venous return and right ventricular afterload.'},
  {title:'Increased intracranial pressure — NCBI Bookshelf',url:'https://www.ncbi.nlm.nih.gov/books/NBK482119/',note:'Cerebral perfusion pressure and downstream venous pressure.'},
  {title:'Physiology, oxygen transport — NCBI Bookshelf',url:'https://www.ncbi.nlm.nih.gov/books/NBK538336/',note:'Oxygen content, delivery and extraction.'},
  {title:'Oxygen transport in normal and pathological situations',url:'https://www.ncbi.nlm.nih.gov/books/NBK54113/',note:'The Fick principle and oxygenation in shunt physiology.'},
];
// Evidence metadata only. These records deliberately cannot be consumed as
// interventions until a concentration-specific educational calibration review
// supplies finite bounds, effects, reviewer/date, and a versioned decision.
const HYPERTONIC_SOURCE_URLS = Object.freeze([
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7272487/',
  'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-28331/',
  'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19712/',
]);

const makeHypertonicRecord = concentrationPercent => Object.freeze({
  id: `hypertonic-${String(concentrationPercent).replace('.', '-')}`,
  displayName: `${concentrationPercent}% hypertonic solution`,
  concentrationPercent,
  conceptualUnit: 'conceptual model units (unassigned)',
  timeBasis: 'unassigned until source-reviewed calibration',
  bounds: Object.freeze({ min: null, max: null, unit: 'unassigned' }),
  effectDimensions: Object.freeze([]),
  educationalCopy: 'Unavailable: this concentration has no source-reviewed simulator calibration record.',
  calibrationStatus: 'unreviewed',
  reviewedOn: null,
  sourceUrls: HYPERTONIC_SOURCE_URLS,
  calibrationVersion: null,
  enabled: false,
  solverConsumable: false,
  solverEffect: null,
  calibrationGate: Object.freeze({
    status: 'blocked',
    requiredFields: Object.freeze(['conceptualUnit', 'timeBasis', 'bounds', 'effectDimensions', 'reviewedOn', 'sourceUrls', 'calibrationVersion']),
    reason: 'No concentration-specific source-reviewed educational calibration exists.',
  }),
});

export const HYPERTONIC_CALIBRATION_RECORDS = Object.freeze(
  [3, 7.5, 23.4].map(makeHypertonicRecord),
);

export const SOURCE_LEDGER = Object.freeze({
  retrievedOn: '2026-09-05',
  modelStatus: 'educational-approximation',
  calibrationStatus: 'hypertonic-records-unreviewed',
  assetReleaseStatus: 'blocked-pending-provenance-review',
  calibrationBoundary: 'General physiology and cerebral-edema references provide context only; they do not calibrate concentration-specific effects, bounds, rates, or targets.',
  illustrativeCoefficients: Object.freeze({
    oxygenContentHb: 1.34,
    oxygenContentDissolved: 0.003,
    oxygenDissociationP50MmHg: 25.5,
    oxygenDissociationHillExponent: 2.9,
    cerebralAutoregulationLowerMmHg: 50,
    cerebralAutoregulationUpperMmHg: 150,
    cerebralCo2FlowPercentPerMmHg: 2.5,
    cerebralIcpCo2MmHgPerMmHg: 0.1,
  }),
  units: Object.freeze({
    cardiacOutput: 'L/min',
    brainFlow: 'mL/100 g/min',
    renalFlow: 'mL/min',
    urineOutput: 'mL/h',
    pressure: 'mmHg',
    norepinephrine: 'µg/kg/min',
    dobutamine: 'µg/kg/min',
    epinephrine: 'µg/kg/min',
    phenylephrine: 'µg/kg/min',
    vasopressin: 'conceptual model units',
    milrinone: 'µg/kg/min',
    nitroprusside: 'µg/kg/min',
    nitroglycerin: 'µg/min',
    esmolol: 'µg/kg/min',
    atropine: 'mg (bolus)',
    furosemide: 'mg',
    albuterol: 'conceptual doses',
    inhaledNitricOxide: 'ppm',
    sedation: 'conceptual scale (0-100)',
    pronePositioning: 'boolean (0 or 1)',
    temperature: '°C',
    fio2: '%',
    peep: 'cmH₂O',
    respiratoryRate: '/min',
    tidalVolume: 'mL/kg PBW',
    inspiratoryPressure: 'cmH₂O above PEEP',
    pressureSupport: 'cmH₂O above PEEP',
  }),
  timing: Object.freeze({
    fixedSubstep: '1/30 s',
    maxElapsedPerCall: '60 s',
    historyCadence: '1 s',
    uiRefreshCadence: '250 ms',
  }),
  sources: Object.freeze([
    { title: 'Cerebral blood supply', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-915/', date: '2023-07-24' },
    { title: 'Cerebral blood flow', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19178/', date: '2023-07-17' },
    { title: 'Dural venous sinuses', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-20768/', date: '2023-08-08' },
    { title: 'Kidney and nephron', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-28331/', date: '2025-09-15' },
    { title: 'Collecting ducts', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19712/', date: '2024-05-01' },
    { title: 'Cardiac output', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-18897/', date: '2023-07-17' },
    { title: 'Cardiac preload', url: 'https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-27651/', date: '2022-09-26' },
    { title: 'Acute cerebral edema guideline', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7272487/', date: '2020' },
    { title: 'BodyParts3D 3.0 README', url: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html', date: '2013 page; release 2011-09-15' },
    { title: 'Current BodyParts3D license', url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html', date: '2025-02-27' },
  ]),
});
