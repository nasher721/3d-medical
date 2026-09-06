# Step 08 independent judge B: UI and app adapter

Date: 2026-09-05  
Disposition: FAIL (standard threshold 4.0/5; mandatory interaction gaps)

Evidence was gathered from `src/ui.js`, `src/app.js`, `tests/ui-contract.test.js`,
and fresh commands: `npm test` (45/45 pass), `npm run check` (pass), and
`npm run build` (pass). The app-level browser behavior remains unverified.

| Criterion | Evidence before score | Score |
|---|---|---:|
| Behavioral correctness (0.35) | Five vasoactive controls, disabled 3/7.5/23.4% options, VC bounds, opacity controls, restart baseline/history reset, and pause `dt=0` paths are wired. Invalid number input has no rejection feedback, and restart leaves selected view/speed/running state untouched. | 3.2 |
| Numerical/contract correctness (0.25) | Metadata bounds and opacity range pass contract tests. `sessionData()` serializes `{...state.interventions}` while epinephrine/phenylephrine/vasopressin aliases are non-enumerable, so those three controls are dropped from saved persistence; export remains legacy `version: 1`. | 3.0 |
| Safety/educational boundary (0.20) | Hypertonic UI is visibly disabled with calibration-required copy; labels/units and educational notices are present. | 4.4 |
| Reproducible artifact evidence (0.20) | Full automated suite/check/build are reproducible, but only metadata tests cover UI; no executable browser evidence proves actual controls, reset/pause freeze, feedback, or persistence. | 3.5 |

Weighted score: **3.45/5.0 — FAIL**.

Mandatory failures: (1) blank/non-numeric/NaN/Infinity and out-of-range
number-input paths silently ignore or clamp without explanatory feedback;
(2) saved sessions omit epinephrine, phenylephrine, and vasopressin due to
non-enumerable aliases, so persistence is not complete; (3) app-level browser
proof is still missing.
