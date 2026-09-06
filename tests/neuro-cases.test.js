import test from 'node:test';
import assert from 'node:assert/strict';
import { NEURO_CASES, createCaseAttempt, answerCase, caseSummary } from '../src/neuro-cases.js';

test('publishes three complete, source-grounded Neuro ICU cases', () => {
  assert.equal(NEURO_CASES.length, 3);
  assert.deepEqual(NEURO_CASES.map((item) => item.id), ['tbi-perfusion-co2', 'sah-delayed-deterioration', 'ards-oxygenation-tradeoffs']);
  assert.deepEqual(NEURO_CASES.map((item) => item.steps.map((step) => step.options.findIndex((option) => option.correct))), [[0, 1, 2], [1, 2, 0], [2, 0, 1]]);
  for (const item of NEURO_CASES) {
    assert.match(item.title, /\S/);
    assert.match(item.tag, /\S/);
    assert.match(item.duration, /\S/);
    assert.ok(['brain-injury', 'ards'].includes(item.scenarioId));
    assert.match(item.brief, /\S/);
    assert.ok(item.objectives.length >= 3);
    assert.equal(item.steps.length, 3);
    assert.match(item.debrief, /\S/);
    assert.ok(item.sourceUrls.length >= 1);
    for (const step of item.steps) {
      assert.match(step.prompt, /\S/);
      assert.ok(step.options.length >= 3);
      assert.equal(step.options.filter((option) => option.correct).length, 1);
      for (const option of step.options) {
        assert.match(option.text, /\S/);
        assert.match(option.feedback, /\S/);
      }
    }
  }
});

test('creates a fresh attempt and scores each sequential answer once', () => {
  const attempt = createCaseAttempt('tbi-perfusion-co2');
  assert.deepEqual(attempt, { caseId: 'tbi-perfusion-co2', answers: [] });
  assert.deepEqual(caseSummary(attempt), { completed: false, correct: 0, total: 3, answered: 0 });

  const next = answerCase(attempt, 0);
  assert.deepEqual(attempt, { caseId: 'tbi-perfusion-co2', answers: [] });
  assert.deepEqual(next, { caseId: 'tbi-perfusion-co2', answers: [0] });
  assert.deepEqual(caseSummary(next), { completed: false, correct: 1, total: 3, answered: 1 });
  const finished = answerCase(answerCase(next, 1), 2);
  assert.deepEqual(finished, { caseId: 'tbi-perfusion-co2', answers: [0, 1, 2] });
  assert.deepEqual(caseSummary(finished), { completed: true, correct: 3, total: 3, answered: 3 });
});

test('rejects unknown cases, invalid choices, skips, and reanswers', () => {
  assert.throws(() => createCaseAttempt('missing'), /Unknown case/);
  const attempt = createCaseAttempt('sah-delayed-deterioration');
  assert.throws(() => answerCase(attempt, 3), /Invalid option/);
  assert.throws(() => answerCase(attempt, -1), /Invalid option/);
  const answered = answerCase(attempt, 0);
  assert.throws(() => answerCase(answered, undefined), /Invalid option/);
  assert.throws(() => answerCase(answered, '1'), /Invalid option/);
  const complete = answerCase(answerCase(answered, 1), 2);
  assert.throws(() => answerCase(complete, 0), /already completed/);
  assert.throws(() => caseSummary({ caseId: 'missing', answers: [] }), /Unknown case/);
  assert.throws(() => answerCase({ caseId: 'tbi-perfusion-co2', answers: [NaN] }, 0), /Invalid attempt answers/);
  assert.throws(() => answerCase({ caseId: 'tbi-perfusion-co2', answers: ['0'] }, 0), /Invalid attempt answers/);
  assert.throws(() => answerCase({ caseId: 'tbi-perfusion-co2', answers: [99] }, 0), /Invalid attempt answers/);
  assert.throws(() => caseSummary({ caseId: 'tbi-perfusion-co2', answers: [NaN] }), /Invalid attempt answers/);
});
