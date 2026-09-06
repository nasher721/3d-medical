import { getScenario } from './physiology.js';
import { escapeHTML as esc, formatTime } from './ui.js';
import { calculatePerfusion, calculateGCS, calculateOsmolarity } from './neuro-tools.js';
import { NEURO_CASES, createCaseAttempt, answerCase, caseSummary } from './neuro-cases.js';

const reading = (label, value, unit) => `<div class="neuro-reading"><span>${label}</span><strong>${value.toFixed(0)}</strong><small>${unit}</small></div>`;
const button = (action, text, extra = '') => `<button class="button" data-neuro="${action}" ${extra}>${text}</button>`;
const back = () => button('home', '← Training home');

function downloadReport(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'flowstate-neuro-debrief.md'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createNeuroWorkspace({ getState, showDialog: publishDialog, exploreBrain, loadRelatedScenario, exportReport = downloadReport, getElement = selector => document.querySelector(selector) }) {
  let utility = null;
  let activeCase = null, stepIndex = 0;
  const attempts = new Map();
  function showDialog(title, body, eyebrow) {
    publishDialog(title, body, eyebrow);
    const container = getElement('#dialog-body'), heading = getElement('#dialog-title');
    if (container) container.scrollTop = 0;
    if (heading) { heading.tabIndex = -1; heading.focus?.(); }
  }
  function open() {
    utility = null;
    const state = getState(), m = state.metrics;
    const perfusion = calculatePerfusion(m);
    showDialog('The Neuro ICU', `<div class="neuro-home">
      <div class="neuro-intro"><span class="neuro-kicker">BEDSIDE REASONING / INTERACTIVE PRACTICE</span><p>Understand the physiology.<br><em>Practice the next decision.</em></p><span>Connect the brain, circulation and ventilator in one training workspace.</span></div>
      <section class="neuro-snapshot" aria-label="Paused physiology snapshot"><div class="neuro-section-heading"><h3>Snapshot · ${esc(getScenario(state.scenarioId).name)}</h3><span>${formatTime(state.timeS)} · paused while open</span></div>
        <div class="neuro-readings">${reading('MAP', m.map, 'mmHg')}${reading('ICP', m.icp, 'mmHg')}${reading('CPP', m.cpp, 'mmHg')}${reading('CVP', m.cvp, 'mmHg')}${reading('PaCO₂', m.paco2, 'mmHg')}${reading('Brain flow', m.brainFlow, 'mL/100 g/min')}</div>
        <div class="neuro-interpretation"><strong>Pressure is only part of the story</strong><p>CPP = MAP − ICP: ${m.map.toFixed(1)} − ${m.icp.toFixed(1)} = ${m.cpp.toFixed(1)} mmHg. With CVP ${m.cvp.toFixed(1)} mmHg, the model’s downstream gradient is ${perfusion.effectiveGradient.toFixed(1)} mmHg (MAP − max[ICP, CVP]).</p><p>Autoregulation is <b>${state.patient.autoregulation ? 'on' : 'off'}</b>. Lowering PaCO₂ constricts cerebral vessels in this model: flow can fall even when CPP rises. Compare both after a ventilation change.</p></div>
        ${button('brain', 'Explore the live brain →')}
      </section>
      <div class="neuro-section-heading"><h3>Practice utilities</h3><span>Work through the numbers</span></div>
      <div class="neuro-utility-grid">${[['perfusion', '01', 'Perfusion worksheet', 'MAP, ICP and the venous pressure caveat.'], ['gcs', '02', 'Glasgow Coma Scale', 'Record components, including not testable.'], ['osmolarity', '03', 'Osmolarity worksheet', 'See the equation, assumptions and units.']].map(([id, n, title, description]) => `<button class="neuro-utility" data-neuro="${id}"><span>${n} / PRACTICE</span><h4>${title}</h4><p>${description}</p><b aria-hidden="true">↗</b></button>`).join('')}</div>
      <div class="neuro-section-heading"><h3>On call · decision cases</h3><span>3 cases / 9 decisions</span></div>
      <div class="neuro-case-grid">${NEURO_CASES.map(item => {
        const attempt = attempts.get(item.id), summary = attempt && caseSummary(attempt);
        return `<article class="neuro-case-card"><span>${esc(item.tag)} · ${esc(item.duration)}</span><h4>${esc(item.title)}</h4><p>${esc(item.brief)}</p>${button('case', summary?.completed ? `Review debrief · ${summary.correct}/${summary.total}` : summary?.answered ? `Continue · ${summary.answered}/${summary.total} answered` : 'Begin case →', `data-case-id="${item.id}"`)}</article>`;
      }).join('')}</div>
      <p class="neuro-footnote">Case progress is kept during this page session. Export a debrief to keep it before reloading. Case vignettes are authored exercises, separate from the live model.</p>
      <p class="neuro-footnote">Educational practice. Worksheets do not alter the simulator or prescribe treatment.</p>
    </div>`, 'NEUROCRITICAL CARE');
  }
  function field(id, label, value, min, max) {
    return `<label class="neuro-field" for="neuro-${id}"><span>${label}</span><input id="neuro-${id}" data-neuro-field type="number" value="${value}" min="${min}" max="${max}" step="any" inputmode="decimal"></label>`;
  }
  function showUtility(id) {
    utility = id;
    const m = getState().metrics;
    let title, fields, formula, note;
    const source = {perfusion: ['https://www.ncbi.nlm.nih.gov/books/NBK482119/', 'Intracranial pressure and perfusion'], gcs: ['https://glasgowcomascale.org/downloads/GCS-Assessment-Aid-English.pdf?v=3', 'Glasgow Coma Scale assessment aid'], osmolarity: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC11393721/', 'Conventional calculated serum osmolality equation']}[id];
    if (id === 'perfusion') {
      title = 'Perfusion worksheet';
      fields = field('map', 'MAP · mmHg', m.map.toFixed(1), 0, 250) + field('icp', 'ICP · mmHg', m.icp.toFixed(1), 0, 100) + field('cvp', 'CVP · mmHg', m.cvp.toFixed(1), 0, 60);
      formula = 'CPP = MAP − ICP';
      note = 'Prefilled from the paused model. The alternate gradient uses MAP − max(ICP, CVP), reflecting the model’s downstream pressure assumption. Pressure transducer level and reference matter; these arithmetic values are not treatment targets.';
    } else if (id === 'gcs') {
      title = 'Glasgow Coma Scale';
      fields = [['eye', 'Eye opening', ['None', 'To pressure', 'To sound', 'Spontaneous']], ['verbal', 'Verbal response', ['None', 'Sounds', 'Words', 'Confused', 'Orientated']], ['motor', 'Best motor response', ['None', 'Extension', 'Abnormal flexion', 'Normal flexion', 'Localising', 'Obeys commands']]].map(([key, label, options]) => `<label class="neuro-field" for="neuro-${key}"><span>${label}</span><select id="neuro-${key}" aria-label="${label}" data-neuro-field>${options.map((text, i) => `<option value="${i + 1}" ${i === options.length - 1 ? 'selected' : ''}>${i + 1} · ${text}</option>`).join('')}<option value="NT">NT · Not testable</option></select></label>`).join('');
      formula = 'GCS = eye + verbal + motor';
      note = 'Check for factors interfering with assessment, observe, stimulate and rate. Record the components and confounders. If a component cannot be assessed (for example verbal response with an endotracheal tube), select NT; a total is not reported. This worksheet does not infer an examination from the simulator.';
    } else {
      title = 'Osmolarity worksheet';
      fields = field('sodium', 'Sodium · mmol/L', 140, 80, 220) + field('glucose', 'Glucose · mg/dL', 90, 0, 2000) + field('bun', 'BUN · mg/dL', 14, 0, 300);
      formula = '2 × Na + glucose / 18 + BUN / 2.8';
      note = 'Calculated osmolarity in mOsm/L, using glucose and BUN in mg/dL. BUN is not total urea. This estimate is not measured osmolality, effective tonicity, or a hypertonic therapy target. Sodium is a practice input; sodium kinetics are not simulated.';
    }
    showDialog(title, `<div class="neuro-tool">${back()}<p class="lead">${title} · educational calculation practice</p><div class="neuro-formula">${formula}</div><div class="neuro-fields">${fields}</div><output id="neuro-result" class="neuro-result" aria-live="polite" aria-atomic="true"></output><p class="neuro-footnote">${note}</p><p class="neuro-footnote"><a href="${source[0]}" target="_blank" rel="noopener noreferrer">Reference · ${source[1]} ↗</a></p></div>`, 'PRACTICE UTILITY');
    change();
  }
  function change() {
    if (!utility) return;
    const output = getElement('#neuro-result');
    const value = id => {
      const raw = getElement(`#neuro-${id}`).value.trim();
      if (!raw) throw new Error('Enter a value for every field.');
      return raw === 'NT' ? null : Number(raw);
    };
    try {
      if (utility === 'perfusion') {
        const result = calculatePerfusion({ map: value('map'), icp: value('icp'), cvp: value('cvp') });
        output.textContent = `CPP ${result.cpp.toFixed(1)} mmHg · Downstream gradient ${result.effectiveGradient.toFixed(1)} mmHg`;
      } else if (utility === 'gcs') {
        const result = calculateGCS({ eye: value('eye'), verbal: value('verbal'), motor: value('motor') });
        output.textContent = `${result.components} · ${result.total === null ? 'Total not reported: component not testable' : `GCS ${result.total} / 15`}`;
      } else {
        output.textContent = `Calculated osmolarity ${calculateOsmolarity({ sodium: value('sodium'), glucose: value('glucose'), bun: value('bun') }).toFixed(1)} mOsm/L`;
      }
    } catch (error) { output.textContent = error.message; }
  }
  function click(data) {
    if (data.neuro === 'home') open();
    if (data.neuro === 'brain') exploreBrain?.();
    if (['perfusion', 'gcs', 'osmolarity'].includes(data.neuro)) showUtility(data.neuro);
    if (data.neuro === 'case') {
      const item = NEURO_CASES.find(item => item.id === data.caseId);
      if (!item) return;
      utility = null; activeCase = item;
      if (!attempts.has(item.id)) attempts.set(item.id, createCaseAttempt(item.id));
      stepIndex = attempts.get(item.id).answers.length;
      renderCase();
    }
    if (!activeCase) return;
    const attempt = attempts.get(activeCase.id);
    if (data.neuro === 'answer' && Number(data.step) === stepIndex && attempt.answers.length === stepIndex) {
      const option = Number(data.option);
      if (!Number.isInteger(option) || option < 0 || option >= (activeCase.steps[stepIndex]?.options.length ?? 0)) return;
      attempts.set(activeCase.id, answerCase(attempt, option)); renderCase();
    }
    if (data.neuro === 'next' && attempt.answers.length === stepIndex + 1) { stepIndex++; renderCase(); }
    if (data.neuro === 'retry') { attempts.set(activeCase.id, createCaseAttempt(activeCase.id)); stepIndex = 0; renderCase(); }
    if (data.neuro === 'related') loadRelatedScenario?.(activeCase.scenarioId);
    if (data.neuro === 'report' && caseSummary(attempt).completed) exportReport(reportFor(activeCase, attempt));
  }
  function renderCase() {
    const item = activeCase, attempt = attempts.get(item.id), summary = caseSummary(attempt);
    let content;
    if (stepIndex >= item.steps.length) {
      content = `<span class="neuro-step-label">CASE COMPLETE / DEBRIEF</span><h3>${summary.correct} of ${summary.total} decisions correct on first attempt</h3><p class="lead">${esc(item.debrief)}</p>${item.steps.map((step, index) => `<details><summary>Decision ${index + 1} · ${step.options[attempt.answers[index]].correct ? 'Correct' : 'Review reasoning'}</summary><p>${esc(step.prompt)}</p><p>Your choice: ${esc(step.options[attempt.answers[index]].text)}</p><p>${esc(step.options[attempt.answers[index]].feedback)}</p><p>Best answer: ${esc(step.options.find(option => option.correct).text)}</p></details>`).join('')}<div class="neuro-case-actions">${button('report', 'Export debrief')}${button('retry', 'Start a fresh attempt')}${button('related', `Reset simulator to ${esc(getScenario(item.scenarioId).name)} →`)}</div><p class="neuro-footnote">The related baseline resets the current simulator. It illustrates shared physiology; it does not reproduce this vignette or simulate SAH vasospasm.</p>`;
    } else {
      const step = item.steps[stepIndex], choice = attempt.answers[stepIndex], answered = choice !== undefined;
      content = `<span class="neuro-step-label">DECISION ${stepIndex + 1} / ${item.steps.length} · ${esc(item.tag)}</span><progress class="neuro-progress" value="${summary.answered}" max="${summary.total}" aria-label="Decisions answered"></progress><p class="lead">${esc(item.brief)}</p><h3 id="neuro-case-heading" tabindex="-1">${esc(step.prompt)}</h3><div class="neuro-options">${step.options.map((option, index) => `<button class="neuro-option ${choice === index ? 'selected' : ''}" data-neuro="answer" data-step="${stepIndex}" data-option="${index}" ${answered ? 'disabled' : ''}><b>${String.fromCharCode(65 + index)}</b><span>${esc(option.text)}</span></button>`).join('')}</div>${answered ? `<div class="neuro-feedback ${step.options[choice].correct ? 'correct' : ''}" role="status"><strong>Reasoning feedback · ${step.options[choice].correct ? 'Correct' : 'Reconsider the mechanism'}</strong><p>${esc(step.options[choice].feedback)}</p>${!step.options[choice].correct ? `<p>Best answer: ${esc(step.options.find(option => option.correct).text)}</p>` : ''}</div>${button('next', stepIndex === item.steps.length - 1 ? 'Open debrief →' : 'Next decision →', 'id="neuro-continue"')}` : ''}`;
    }
    showDialog(item.title, `<div class="neuro-case">${back()}<div style="margin-top:24px">${content}</div><details><summary>Learning objectives & sources</summary><ul>${item.objectives.map(text => `<li>${esc(text)}</li>`).join('')}</ul>${item.sourceUrls.map((url, index) => `<p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Source ${index + 1} · ${esc(new URL(url).hostname)}</a></p>`).join('')}<p>References support teaching principles; they do not validate this simulator.</p></details></div>`, 'ON CALL / NEURO ICU');
    (getElement('#neuro-continue') || getElement('#neuro-case-heading'))?.focus?.();
  }
  function reportFor(item, attempt) {
    const summary = caseSummary(attempt);
    return `# Flowstate Neuro ICU debrief\n\n${item.title}\n\nFirst-attempt score: ${summary.correct}/${summary.total}\n\n${item.brief}\n\n${item.steps.map((step, index) => `## Decision ${index + 1}\n\n${step.prompt}\n\nYour choice: ${step.options[attempt.answers[index]].text}\n\n${step.options[attempt.answers[index]].feedback}\n\nBest answer: ${step.options.find(option => option.correct).text}`).join('\n\n')}\n\n## Reflection\n\n${item.debrief}\n\nSources:\n${item.sourceUrls.join('\n')}\n\nEducational practice, not a credential or clinical recommendation.\n`;
  }
  return { open, click, change };
}
