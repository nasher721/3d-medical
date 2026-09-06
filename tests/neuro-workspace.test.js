import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/physiology.js';
import { createNeuroWorkspace } from '../src/neuro-workspace.js';
import { NEURO_CASES } from '../src/neuro-cases.js';

test('training home samples the actual scenario and labels its frozen snapshot', () => {
  let rendered;
  const state = createSimulation('brain-injury');
  const workspace = createNeuroWorkspace({ getState: () => state, getElement: () => null, showDialog: (title, body) => { rendered = { title, body }; } });
  workspace.open();
  assert.equal(rendered?.title, 'The Neuro ICU');
  assert.match(rendered.body, /Snapshot/);
  assert.match(rendered.body, /Brain injury/);
  assert.match(rendered.body, /Practice utilities/);
  assert.match(rendered.body, /<span>CVP<\/span>/);
});

test('switching training pages resets dialog scroll and gives the new page a focus target', () => {
  const body = { scrollTop: 250 }, title = { focus() { this.focused = true; } };
  const workspace = createNeuroWorkspace({ getState: () => createSimulation(), showDialog() {},
    getElement: selector => selector === '#dialog-body' ? body : selector === '#dialog-title' ? title : null });
  workspace.open();
  assert.equal(body.scrollTop, 0);
  assert.equal(title.focused, true);
});

test('GCS and osmolarity UI output uses component semantics and explicit units', () => {
  const elements = new Map();
  const getElement = selector => { if (!elements.has(selector)) elements.set(selector, { value: '', textContent: '' }); return elements.get(selector); };
  const workspace = createNeuroWorkspace({ getState: () => createSimulation(), getElement, showDialog() {} });
  workspace.click({ neuro: 'gcs' });
  for (const [id, value] of [['eye', '2'], ['verbal', 'NT'], ['motor', '5']]) getElement(`#neuro-${id}`).value = value;
  workspace.change();
  assert.equal(getElement('#neuro-result').textContent, 'E2 VNT M5 · Total not reported: component not testable');
  workspace.click({ neuro: 'osmolarity' });
  for (const [id, value] of [['sodium', '140'], ['glucose', '90'], ['bun', '14']]) getElement(`#neuro-${id}`).value = value;
  workspace.change();
  assert.equal(getElement('#neuro-result').textContent, 'Calculated osmolarity 290.0 mOsm/L');
  getElement('#neuro-sodium').value = '500';
  workspace.change();
  assert.match(getElement('#neuro-result').textContent, /Sodium must be a finite number/);
});

test('case decisions require feedback acknowledgement, resist duplicate answers, and export a completed debrief', () => {
  let title, body, report;
  const c = NEURO_CASES[0];
  const workspace = createNeuroWorkspace({ getState: () => createSimulation(), getElement: () => null,
    showDialog: (t, b) => { title = t; body = b; }, exportReport: text => { report = text; } });
  workspace.click({ neuro: 'case', caseId: c.id });
  assert.equal(title, c.title);
  for (let i = 0; i < c.steps.length; i++) {
    const choice = c.steps[i].options.findIndex(option => option.correct);
    workspace.click({ neuro: 'answer', step: String(i), option: String(choice) });
    assert.match(body, /Reasoning feedback/);
    const feedback = body;
    workspace.click({ neuro: 'answer', step: String(i), option: String(choice) });
    assert.equal(body, feedback);
    workspace.click({ neuro: 'next' });
  }
  assert.match(body, /3 of 3/);
  workspace.click({ neuro: 'report' });
  assert.match(report, /First-attempt score: 3\/3/);
  workspace.open();
  assert.match(body, /Review debrief/);
});

test('practice utilities calculate, reject empty inputs, and leave simulator state unchanged', () => {
  const state = createSimulation('brain-injury'), before = JSON.stringify(state);
  let body = '';
  const elements = new Map();
  const getElement = selector => { if (!elements.has(selector)) elements.set(selector, { value: '', textContent: '' }); return elements.get(selector); };
  const workspace = createNeuroWorkspace({ getState: () => state, getElement, showDialog: (_title, markup) => { body = markup; } });
  workspace.click({ neuro: 'perfusion' });
  assert.match(body, /Perfusion worksheet/);
  for (const [id, value] of [['map', '80'], ['icp', '20'], ['cvp', '8']]) getElement(`#neuro-${id}`).value = value;
  workspace.change();
  assert.match(getElement('#neuro-result').textContent, /CPP 60.0 mmHg/);
  getElement('#neuro-map').value = '';
  workspace.change();
  assert.match(getElement('#neuro-result').textContent, /Enter/);
  assert.equal(JSON.stringify(state), before);
});
