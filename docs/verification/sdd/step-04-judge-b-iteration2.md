# Step 4 independent judge B — iteration 2

Date: 2026-09-05. Threshold: 4.5/5. Model code and tests were read-only. This judge authored anatomy work, not physiology, and did not read Judge A. CLAUDE_PLUGIN_ROOT is unset; task rubric and Step 4 fixture contract used.

## Evidence before scores

Reviewed `src/physiology.js`, `tests/physiology.test.js`, `tests/model-consistency.test.js`, `step-04-fixture-contract.md`, and implementation evidence. Ran `node --test tests/physiology.test.js tests/model-consistency.test.js` successfully, plus independent Node assertions:

- **54 delivered-breath cases:** RR 6/16/35, VT 4/6/10 mL/kg PBW, PBW 40/70/150 kg, PEEP 0/20 in ARDS. Independently integrated signed flow at 12,000 midpoint samples/cycle. Inspired volume equaled VT; expired integral equaled negative VT; whole-cycle balance equaled zero. Maximum error **6.04814e-11 mL**, below 1e-6. Volume bounds, pressure equations, finite values, minute ventilation `RR*VT*PBW`, and alveolar ventilation `RR*(VT-2)*PBW` passed. Inspiratory pressure includes elastic and resistive components; expiration pressure is the explicitly documented PEEP boundary.
- **2,880 transient frames:** eight scenarios, paired minimum/maximum patient and intervention controls, 180 fixed frames each. Every frame maintained shared forward SV, CO/CPP/territory identities, curve-sample equality to `forwardStrokeVolume`, operating-point equality, and actual dimensionless afterload. Brain/renal/urine bounds and all numeric metrics remained finite.
- **32 independent replay comparisons:** eight scenarios; identical inputs with elapsed schedules `[3]`, `[1,1,1]`, 90×1/30, 300×0.01, and `[.017,.083,.7,.2,2]`. Metrics, history, and events were deeply equal, including timestamps.
- Paired healthy changes at 30 s: volume 130 raised SV **21.0 mL**; contractility 140 raised SV **28.0 mL**; vascular tone 180 lowered SV **10.4762 mL**. RR 28 lowered PaCO2 **17.1429 mmHg** and increased alveolar ventilation **3360 mL/min**; VT 10 lowered PaCO2 **20.0 mmHg** and increased alveolar ventilation **4480 mL/min**.
- Existing tests cover invalid elapsed no-ops, 60 s call ceiling, shunt oxygenation limits, PEEP tradeoffs, renal congestion, existing vasoactives, validation, and migration.

## Mandatory gates

| Gate | Result |
|---|---|
| Same forward SV function in target, transient metrics, curve, and marker | PASS |
| Actual dimensionless afterload, not SVR mislabeled | PASS |
| VC pressure/flow/volume cycle and independent signed VT integral | PASS |
| Minute/alveolar units and CO2 coupling | PASS |
| CPP, cerebral partition, CO and ventricular identities | PASS |
| Deterministic metrics/history/events across chunkings | PASS |
| Finite bounded extremes and documented input limits | PASS |
| Educational boundary; unreviewed hypertonic inputs excluded | PASS |

## Scores

| Criterion | Weight | Score | Rationale |
|---|---:|---:|---|
| Behavioral correctness | .35 | 4.65 | Independent transient, directional, and breath checks pass; dynamics remain intentionally idealized. |
| Numerical/contract correctness | .25 | 4.70 | Shared forward model and explicit units pass stringent independent identities/integrals/replay. |
| Safety/educational boundary | .20 | 4.65 | Schematic equations and uncalibrated boundary explicit; no clinical validity inferred. |
| Reproducible artifact evidence | .20 | 4.60 | Existing tests and independent cases agree; live monitor presentation belongs to later steps. |

Weighted overall: **4.6525/5 — PASS**. No blocking Step 4 finding.

Nonblocking limitations: waveform mechanics and coefficients are educational approximations; no physiological calibration is established. Regional metrics and ventilatorCycle use non-enumerable derived properties, so export/history consumers must explicitly include required fields (verify in persistence/UI step). No DONE marker changed.
