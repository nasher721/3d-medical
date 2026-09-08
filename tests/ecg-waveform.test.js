import test from 'node:test';
import assert from 'node:assert/strict';
import { ecg } from '../src/monitors.js';

// Locate the R-wave peak (the single global maximum of one cardiac cycle).
function findRPeak(rr, samples = 4000) {
  let bestP = 0, bestV = -Infinity;
  for (let i = 0; i < samples; i++) { const p = i / samples, v = ecg(p, rr); if (v > bestV) { bestV = v; bestP = p; } }
  return { p: bestP, v: bestV };
}
// Full width (in ms) of the trace above half the R-wave amplitude, found by
// walking outward from the peak. This isolates the QRS spike's own width.
function halfMaxWidthMs(rr, peak, samples = 20000) {
  const step = 1 / samples, half = peak.v / 2;
  let lo = peak.p, hi = peak.p;
  while (ecg(lo - step, rr) > half && peak.p - lo < .2) lo -= step;
  while (ecg(hi + step, rr) > half && hi - peak.p < .2) hi += step;
  return (hi - lo) * rr * 1000;
}
// The T wave is the second-highest peak once a window around the R wave is excluded
// (T's illustrative amplitude of .30 exceeds the P wave's .18).
function findTPeak(rr, rP, samples = 4000) {
  let bestP = -1, bestV = -Infinity;
  for (let i = 0; i < samples; i++) {
    const p = i / samples;
    const wrapped = Math.min(Math.abs(p - rP), 1 - Math.abs(p - rP));
    if (wrapped < .06) continue;
    const v = ecg(p, rr);
    if (v > bestV) { bestV = v; bestP = p; }
  }
  return bestP;
}

test('ECG is periodic and finite across a wide range of heart rates', () => {
  for (const hr of [40, 72, 100, 150, 160]) {
    const rr = 60 / hr;
    for (let i = 0; i <= 20; i++) assert.ok(Number.isFinite(ecg(i / 20, rr)), `hr=${hr}`);
    // The waveform is built from periodic (wrapped) components, so the two
    // ends of one cycle should meet smoothly rather than jump.
    assert.ok(Math.abs(ecg(0, rr) - ecg(1, rr)) < 1e-9, `seam continuity at hr=${hr}`);
  }
});

test('R-wave amplitude and location are stable and physiologic across heart rates', () => {
  for (const hr of [40, 72, 100, 150, 160]) {
    const rr = 60 / hr;
    const peak = findRPeak(rr);
    assert.ok(peak.v > .9 && peak.v <= 1.001, `R amplitude at hr=${hr}`);
    // R sits shortly after the PR interval (170 ms into the cycle), never at
    // the very start or end of the trace.
    assert.ok(peak.p > .05 && peak.p < .6, `R location at hr=${hr}`);
  }
});

test('QRS width stays clinically narrow and rate-independent in absolute time', () => {
  // This is the core realism fix: a naive phase-only model whose gaussian
  // widths are fixed FRACTIONS of the RR interval would show the QRS complex
  // stretching at slow rates and vanishing to a sliver at fast rates. Here the
  // component widths are fixed absolute milliseconds, so the measured width
  // barely moves across a 4x heart-rate range.
  const widths = [40, 60, 72, 100, 130, 160].map(hr => {
    const rr = 60 / hr;
    return halfMaxWidthMs(rr, findRPeak(rr));
  });
  for (const width of widths) assert.ok(width > 5 && width < 40, `width ${width}`);
  const spread = Math.max(...widths) - Math.min(...widths);
  assert.ok(spread < 3, `QRS half-max width varies by only a few ms across heart rates, got spread ${spread}`);
});

test('the T wave sits well after the R wave and its timing shortens as heart rate rises (Bazett direction)', () => {
  const slow = 60 / 50, fast = 60 / 130;
  const rSlow = findRPeak(slow), rFast = findRPeak(fast);
  const tSlow = findTPeak(slow, rSlow.p), tFast = findTPeak(fast, rFast.p);
  assert.ok(tSlow > rSlow.p && tFast > rFast.p);
  const offsetSlowMs = (tSlow - rSlow.p) * slow * 1000;
  const offsetFastMs = (tFast - rFast.p) * fast * 1000;
  assert.ok(offsetSlowMs > offsetFastMs, `R-to-T interval shortens with faster heart rate: ${offsetSlowMs} vs ${offsetFastMs}`);
  assert.ok(offsetSlowMs > 150 && offsetSlowMs < 400 && offsetFastMs > 80 && offsetFastMs < 300);
});

test('the P wave precedes the QRS by a fixed, physiologic PR interval', () => {
  for (const hr of [45, 72, 140]) {
    const rr = 60 / hr, rrMs = rr * 1000;
    const peak = findRPeak(rr);
    // Search just before the R wave for the P wave, excluding the whole QRS
    // complex (an absolute-ms window, since that's what stays fixed-width).
    let bestP = -1, bestV = -Infinity;
    for (let i = 0; i < 8000; i++) {
      const p = i / 8000;
      let deltaMs = (peak.p - p) * rrMs; if (deltaMs < 0) deltaMs += rrMs;
      if (deltaMs < 60 || deltaMs > 200) continue;
      const v = ecg(p, rr);
      if (v > bestV) { bestV = v; bestP = p; }
    }
    let prMs = (peak.p - bestP); if (prMs < 0) prMs += 1; prMs *= rrMs;
    assert.ok(prMs > 100 && prMs < 220, `PR interval at hr=${hr}: ${prMs} ms`);
  }
});
