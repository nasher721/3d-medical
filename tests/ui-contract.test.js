import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORGAN_VISUALS,
  VOLUME_CONTROL_VENTILATOR,
  HYPERTONIC_UI_PRESETS,
  UI_VASOACTIVE_PRESETS,
  visualOpacityMarkup,
  ventilatorMarkup,
  hypertonicOptionMarkup,
} from '../src/ui.js';

test('organ opacity contract isolates the three bounded controls', () => {
  assert.deepEqual(ORGAN_VISUALS.map(({ key }) => key), ['brain', 'lungs', 'kidneys']);
  for (const field of ORGAN_VISUALS) assert.deepEqual([field.min, field.max], [0, 1]);
  const markup = visualOpacityMarkup({ brain: 0.2, lungs: 0.4, kidneys: 0.6 });
  for (const key of ['brain', 'lungs', 'kidneys']) assert.match(markup, new RegExp(`data-opacity="${key}"`));
});

test('ventilator contract exposes volume control and only specified bounds', () => {
  assert.equal(VOLUME_CONTROL_VENTILATOR.mode, 'volume-control');
  assert.deepEqual(VOLUME_CONTROL_VENTILATOR.fields.map(({ key }) => key), ['respiratoryRate', 'tidalVolume', 'fio2', 'peep']);
  assert.deepEqual(VOLUME_CONTROL_VENTILATOR.fields.map(({ min, max }) => [min, max]), [[6, 35], [4, 10], [21, 100], [0, 20]]);
  assert.match(ventilatorMarkup(), /data-ventilator="tidalVolume"/);
});

test('hypertonic placeholders are finite, visibly gated, and disabled', () => {
  assert.deepEqual(HYPERTONIC_UI_PRESETS.map(({ concentrationPercent }) => concentrationPercent), [3, 7.5, 23.4]);
  assert.ok(HYPERTONIC_UI_PRESETS.every(option => option.enabled === false && option.calibrationStatus === 'unreviewed'));
  assert.equal((hypertonicOptionMarkup().match(/ disabled/g) ?? []).length, 3);
  assert.deepEqual(UI_VASOACTIVE_PRESETS.map(({ key }) => key), ['norepinephrine', 'dobutamine', 'epinephrine', 'phenylephrine', 'vasopressin']);
});
