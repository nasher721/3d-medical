# Step 9 judge

Date: 2026-09-05
Reviewer: independent Step 9 verification lane
Disposition: PASS

## Weighted score

| Dimension | Weight | Score | Evidence |
|---|---:|---:|---|
| Behavioral correctness | 0.35 | 4.6 | `tests/monitor-export.test.js` and `tests/app-handlers.test.js` pass 12/12; production handlers cover pause freeze, reset, five-agent restore, invalid-input retention, and atomic import rejection. |
| Numerical/contract correctness | 0.25 | 4.5 | Shared `frankStarling` samples/operating point and `volumeControlledBreath` traces are used by monitors and exports. Independent serializer checks passed with 38 authoritative CSV columns, finite history fields, territory/cycle/Starling fields, and non-enumerable source cycle state. |
| Safety and educational boundary | 0.20 | 4.5 | Export declares an educational lumped-parameter approximation; derived archives are validated but do not activate solver options; unreviewed hypertonic metadata remains gated. Monitor captions identify units and approximation boundaries. |
| Reproducible artifact evidence | 0.20 | 4.3 | Fresh `npm test` passed 65/65; focused Step 9 tests passed 12/12; `npm run check` and `npm run build` passed in the recorded Step 9 evidence; isolated Chromium `results.json` and `live-results.json` independently parsed with six tabs pause-stable, no errors, export/restore success, and maximum steady-state update interval 121.9 ms. |

Weighted result: **4.49/5.0 — PASS** (standard threshold 4.0).

## Verification details

- `serializeSession` preserves v2 patient/intervention/opacity state, all five vasoactive settings, volume-control settings, history, event log, cerebral territories, Frank–Starling data, ventilator cycle data, and calibration metadata.
- `serializeCSV` uses `CSV_COLUMNS` as the source of truth and emits unit-bearing columns for cerebral territories, renal perfusion, urine output, ventilator quantities, and Starling values. Production tests parse every emitted value back against the original history observations.
- `validateDerivedArchive` rejects unknown, nonfinite, altered-calibration, malformed-Starling, and malformed-ventilator archives. Production restore tests verify state remains unchanged after invalid envelopes.
- `recordSnapshot` captures coupled territory, waveform, ventilator-setting, and Starling values per history row, preserving prior observations after later interventions.
- `monitorPlots` obtains Starling points from `state.frankStarling` and ventilator points from `volumeControlledBreath(state, t)`; tests verify markers and plotted values against the shared model.
- Browser artifacts show all six monitor tabs, labeled axes/units, stable paused pixels, downloaded JSON/CSV, five-agent restoration, fresh reset clock, and no page errors or narrow-layout overflow. The live check records 102.2–121.9 ms update gaps and directional fluid, contractility, and afterload responses.

## Limitation

Browser evidence comes from isolated headless Chromium with software WebGL because native Chrome was unavailable. It verifies behavior and layout, but does not establish physical-device GPU performance certification. Startup cadence under concurrent CPU load had outlier gaps and is retained in `startup-cadence.json`; warmed steady-state cadence met the 250 ms target.
