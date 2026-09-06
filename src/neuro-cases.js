/**
 * Source-grounded, deliberately bounded Neuro ICU decision cases.
 * These teach assessment and tradeoffs; they are not a dosing or treatment simulator.
 */

const BTF = 'https://braintrauma.org/coma/guidelines-current';
const NCS_EDEMA = 'https://www.neurocriticalcare.org/Portals/0/Docs/Resources/Cook2020_Article_GuidelinesForTheAcuteTreatment.pdf';
const NCS_SAH = 'https://www.neurocriticalcare.org/Portals/0/Docs/Resources/Critical_Care_Management_of_Patients_Following_Aneurysmal.pdf';
const ARDS_GUIDELINE = 'https://www.atsjournals.org/doi/10.1164/rccm.201703-0548ST';

const freezeDeep = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
};

const CASES = [
  {
    id: 'tbi-perfusion-co2', title: 'The pressure–perfusion trap', tag: 'Severe TBI', duration: '8 min', scenarioId: 'brain-injury',
    brief: 'A patient with severe traumatic brain injury becomes less interactive. The monitor shows MAP 78 mmHg, ICP 24 mmHg, and PaCO₂ 52 mmHg. Work from physiology before reaching for a single number.',
    objectives: ['Calculate and interpret CPP in context.', 'Recognize how CO₂ and ICP interact with cerebral perfusion.', 'Choose monitoring priorities without reflexive hyperventilation.'],
    steps: [
      { prompt: 'Which finding most directly describes the immediate perfusion concern?', options: [
        { text: 'CPP is approximately 54 mmHg because CPP = MAP − ICP', correct: true, feedback: 'Correct. The calculated CPP is 78 − 24 = 54 mmHg; trend, examination, ICP, MAP, and the whole clinical picture matter together.' },
        { text: 'The MAP value is reassuring enough to defer looking for a cause of the elevated ICP', correct: false, feedback: 'MAP alone cannot establish cerebral perfusion when ICP is elevated, and a new change still needs evaluation.' },
        { text: 'PaCO₂ has no bearing on cerebral blood flow once ICP is monitored', correct: false, feedback: 'CO₂ is a potent cerebral vasomodulator and can alter cerebral blood volume and ICP.' },
      ] },
      { prompt: 'The patient is ventilated and has no sign of impending herniation. Which reasoning best addresses the CO₂ result?', options: [
        { text: 'Treat sustained hypercapnia as a possible contributor to cerebral vasodilation and investigate reversible causes while avoiding abrupt indiscriminate hypocapnia', correct: true, feedback: 'Correct. CO₂ management should be deliberate and tied to examination, ICP, oxygenation, and the cause of hypoventilation; routine prolonged prophylactic hyperventilation can compromise cerebral blood flow.' },
        { text: 'Drive PaCO₂ as low as possible in every severe TBI patient', correct: false, feedback: 'Marked hypocapnia can reduce cerebral blood flow; routine prophylactic hyperventilation is not a safe default.' },
        { text: 'Prioritize the pressure calculation and defer considering ventilation until the next trend', correct: false, feedback: 'CPP is useful but does not capture CO₂-mediated vascular effects or tissue oxygen delivery; the ventilation change needs review now.' },
      ] },
      { prompt: 'Which next data bundle most improves the decision?', options: [
        { text: 'Repeat neurologic examination and review ICP/MAP/CPP trends, ventilator data, oxygenation, imaging, and sedation', correct: true, feedback: 'Correct. Neurocritical decisions are trend- and context-dependent; a single CPP or PaCO₂ value should not replace reassessment.' },
        { text: 'Use one isolated CPP value to select an intervention and stop reassessing', correct: false, feedback: 'An isolated value can miss evolving edema, loss of autoregulation, hypoxemia, seizures, or measurement error.' },
        { text: 'Lower PaCO₂ without checking why ventilation changed or how the examination responds', correct: false, feedback: 'That risks treating a number while missing the cause and may reduce cerebral blood flow.' },
      ] },
    ],
    debrief: 'CPP is MAP minus ICP, but it is a bedside anchor rather than a complete surrogate for cerebral oxygen delivery. TBI care benefits from serial examinations, multimodal trends, avoidance of hypotension and hypoxemia, and cautious CO₂ reasoning. This case intentionally omits treatment doses and does not model patient-specific care.',
    sourceUrls: [BTF, NCS_EDEMA],
  },
  {
    id: 'sah-delayed-deterioration', title: 'Day seven: one change, several threats', tag: 'Aneurysmal SAH', duration: '9 min', scenarioId: 'brain-injury',
    brief: 'On day 7 after aneurysmal subarachnoid hemorrhage, a previously stable patient develops a new headache, inattentiveness, and subtle left arm drift. Blood pressure and oxygen saturation are unchanged.',
    objectives: ['Build a differential for delayed neurologic deterioration after SAH.', 'Separate time-course clues from diagnostic proof.', 'Use examination, imaging, and monitoring as complementary evidence.'],
    steps: [
      { prompt: 'Which first framing is safest?', options: [
        { text: 'Delayed cerebral ischemia is a key concern, but rebleeding, hydrocephalus, seizure, metabolic causes, and other structural problems remain possible', correct: true, feedback: 'Correct. Timing and a focal change raise concern for delayed cerebral ischemia, but they do not establish the diagnosis.' },
        { text: 'The day-seven timing makes vasospasm the leading explanation, so competing causes can be assessed later', correct: false, feedback: 'Timing raises suspicion but is not proof; delaying assessment can miss hydrocephalus, seizure, rebleeding, or systemic problems.' },
        { text: 'A stable blood pressure rules out a neurologic complication', correct: false, feedback: 'Stable systemic vitals do not exclude evolving cerebral ischemia or another intracranial complication.' },
      ] },
      { prompt: 'Which assessment sequence best tests the differential?', options: [
        { text: 'Repeat focused examination, review prior imaging and trends, and obtain urgent structural and vascular evaluation guided by the patient’s presentation', correct: true, feedback: 'Correct. New deficits warrant prompt reassessment and targeted testing; structural, vascular, seizure, and systemic explanations may overlap.' },
        { text: 'Wait for a later routine scan because delayed deterioration is expected', correct: false, feedback: 'A new focal deficit is an actionable change, not a reason to defer evaluation.' },
        { text: 'Label the event as delirium from the bedside appearance alone', correct: false, feedback: 'Appearance alone cannot distinguish delirium from ischemia, hydrocephalus, seizure, or another acute brain insult.' },
      ] },
      { prompt: 'What makes a monitoring plan more useful over the next several hours?', options: [
        { text: 'Trend serial examinations with appropriate multimodal monitoring and explicitly reassess if the deficit evolves', correct: true, feedback: 'Correct. Serial change is often more informative than a single snapshot, and multimodal data should support—not replace—the examination.' },
        { text: 'Use a single normal examination to close the case permanently', correct: false, feedback: 'A transiently normal examination does not eliminate future delayed deterioration.' },
        { text: 'Treat a monitor-derived surrogate as definitive even when it conflicts with the examination', correct: false, feedback: 'Surrogates have limits; discordance should trigger review of the patient and the measurement.' },
      ] },
    ],
    debrief: 'Delayed cerebral ischemia after SAH is a clinical and diagnostic reasoning problem. A time window can raise suspicion, while serial examinations and appropriately selected structural, vascular, and physiologic assessments help separate competing causes. The case teaches escalation of evaluation, not a prescriptive treatment algorithm.',
    sourceUrls: [NCS_SAH, BTF],
  },
  {
    id: 'ards-oxygenation-tradeoffs', title: 'Oxygenation without losing the brain', tag: 'Brain injury + ARDS', duration: '10 min', scenarioId: 'ards',
    brief: 'A patient with acute brain injury develops worsening bilateral infiltrates and impaired oxygenation. Higher airway pressures improve the pulse oximeter reading, while the team is watching ICP and venous return.',
    objectives: ['Balance oxygenation goals with intracranial and circulatory consequences.', 'Recognize why ventilator changes need measured reassessment.', 'Apply lung-protective reasoning without turning a teaching model into a dosing protocol.'],
    steps: [
      { prompt: 'Which tradeoff should guide the next ventilator discussion?', options: [
        { text: 'Improve oxygenation while tracking ICP, CPP, hemodynamics, mechanics, and delivered ventilation together', correct: true, feedback: 'Correct. Airway pressure can affect oxygenation, intrathoracic pressure, venous return, and potentially intracranial dynamics; reassessment is essential.' },
        { text: 'Optimize SpO₂ alone because cerebral effects are unrelated to airway pressure', correct: false, feedback: 'Oxygenation is vital, but airway pressure and gas exchange can influence several connected physiologic systems.' },
        { text: 'Keep PEEP unchanged until ICP rises, even if oxygenation remains inadequate', correct: false, feedback: 'Waiting for an ICP change can prolong hypoxemia; airway pressure and brain effects should be assessed together.' },
      ] },
      { prompt: 'Which strategy best expresses lung-protective reasoning in this educational scenario?', options: [
        { text: 'Use a lung-protective approach with measured oxygenation targets and reassess brain and circulation after changes', correct: true, feedback: 'Correct. ARDS guidance emphasizes lung-protective ventilation; neurocritical care adds the need to watch ICP/CPP and systemic consequences.' },
        { text: 'Escalate tidal volume until the oxygen saturation is normal', correct: false, feedback: 'Increasing tidal volume indiscriminately can increase ventilator-associated lung stress and does not address the full tradeoff.' },
        { text: 'Accept severe hypoxemia to preserve a fixed ICP number', correct: false, feedback: 'Hypoxemia can injure the brain; the right response is coordinated optimization and frequent reassessment.' },
      ] },
      { prompt: 'After an airway-pressure change, which response best tests whether it helped?', options: [
        { text: 'Recheck oxygenation, blood gases, ventilator mechanics, blood pressure/venous return, ICP/CPP, and the neurologic examination', correct: true, feedback: 'Correct. The intervention is judged by integrated physiologic response, not by SpO₂ alone.' },
        { text: 'Assume benefit from a higher pulse oximeter value and make no further checks', correct: false, feedback: 'A higher saturation can coexist with worsening compliance, circulation, CO₂, or intracranial dynamics.' },
        { text: 'Change several ventilator settings at once so the cause of any response is unknowable', correct: false, feedback: 'Multiple simultaneous changes reduce interpretability and can make adverse effects harder to detect.' },
      ] },
    ],
    debrief: 'Brain injury and ARDS create competing priorities. Lung-protective ventilation and adequate oxygenation must be integrated with CO₂, venous return, blood pressure, ICP, CPP, and the neurologic examination. The educational model supports reasoning about tradeoffs and deliberately excludes patient-specific settings or doses.',
    sourceUrls: [ARDS_GUIDELINE, BTF, NCS_EDEMA],
  },
];

// Keep the correct choice position varied so learners must reason through every option.
const correctPositions = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
for (let caseIndex = 0; caseIndex < CASES.length; caseIndex += 1) {
  for (let stepIndex = 0; stepIndex < CASES[caseIndex].steps.length; stepIndex += 1) {
    const options = CASES[caseIndex].steps[stepIndex].options;
    const current = options.findIndex((option) => option.correct);
    const target = correctPositions[caseIndex][stepIndex];
    [options[current], options[target]] = [options[target], options[current]];
  }
}

export const NEURO_CASES = freezeDeep(CASES);
const findCase = (caseId) => {
  const item = NEURO_CASES.find((candidate) => candidate.id === caseId);
  if (!item) throw new RangeError(`Unknown case: ${caseId}`);
  return item;
};

const validateAnswers = (item, answers) => {
  if (answers.length > item.steps.length || answers.some((choice, index) => !Number.isInteger(choice) || choice < 0 || choice >= item.steps[index].options.length)) {
    throw new RangeError('Invalid attempt answers');
  }
};

export function createCaseAttempt(caseId) {
  findCase(caseId);
  return Object.freeze({ caseId, answers: Object.freeze([]) });
}

export function answerCase(attempt, optionIndex) {
  if (!attempt || typeof attempt.caseId !== 'string' || !Array.isArray(attempt.answers)) throw new TypeError('Invalid attempt');
  const item = findCase(attempt.caseId);
  validateAnswers(item, attempt.answers);
  const stepIndex = attempt.answers.length;
  if (stepIndex >= item.steps.length) throw new Error('Attempt is already completed');
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= item.steps[stepIndex].options.length) throw new RangeError('Invalid option');
  const answers = [...attempt.answers, optionIndex];
  return Object.freeze({ caseId: attempt.caseId, answers: Object.freeze(answers) });
}

export function caseSummary(attempt) {
  if (!attempt || typeof attempt.caseId !== 'string' || !Array.isArray(attempt.answers)) throw new TypeError('Invalid attempt');
  const item = findCase(attempt.caseId);
  validateAnswers(item, attempt.answers);
  const correct = attempt.answers.reduce((total, choice, index) => total + (item.steps[index].options[choice]?.correct ? 1 : 0), 0);
  return { completed: attempt.answers.length === item.steps.length, correct, total: item.steps.length, answered: attempt.answers.length };
}
