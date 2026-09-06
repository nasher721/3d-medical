# Step 02 independent judge A

Date: 2026-09-05
Reviewer: independent replay A
Scope: `src/physiology.js`, `tests/model-consistency.test.js`, `docs/verification/sdd/step-02-implementation.md`
Disposition: **FAIL** (High threshold 4.0/5.0)

## Fresh evidence

The existing `npm test` suite passes 37/37. A separate direct API replay produced:

- PASS: v2 state shape, nested `vasoactive`/`ventilator` views, legacy aliases, v1 flat migration, top-level unknown-key rejection, non-finite setter rejection, invalid elapsed no-op, deterministic replay, 60-second call ceiling, finite outputs.
- FAIL: `migrateState({ schemaVersion: 2, interventions: { unknown: 3 } })` does not reject the nested unknown key.
- FAIL: `validateSimulationState({ interventions: { ventilator: { mode: 'pressure-control' } } })` returns valid.
- FAIL: `validateSimulationState({ interventions: { hypertonicSolution: { id: 'hypertonic-3' } } })` returns valid, allowing an unreviewed option to pass this validator boundary.
- Timing is deterministic but `90 × 1/30` yields `2.999999999999999`; assertions need a tolerance rather than exact floating equality. The 60-second ceiling itself passes (delta 60; 64 history samples; all outputs finite).

## Rubric scores (justification precedes score)

| Component | Weight | Evidence and score |
| --- | ---: | --- |
| Behavioral correctness | 0.35 | Core stepping, migration, aliases, invalid elapsed handling, deterministic replay, and ceiling work. Nested invalid contracts remain accepted. **3.5/5** |
| Numerical/contract correctness | 0.25 | Fixed-step constants and finite metrics are correct; strict nested schema validation and unsupported-mode rejection are incomplete; floating cadence requires tolerance. **3.0/5** |
| Safety/educational boundary | 0.20 | The implementation keeps the educational approximation boundary and does not add hypertonic effects, but the validator accepts a hypertonic state payload and pressure-control mode. **4.0/5** |
| Reproducible artifact evidence | 0.20 | Existing tests and implementation evidence are reproducible, and fresh probes exposed concrete gaps. Missing regression assertions for nested unknown keys, unsupported mode, and unreviewed hypertonic payloads weakens the artifact. **3.5/5** |

Weighted score: `(3.5×0.35) + (3.0×0.25) + (4.0×0.20) + (3.5×0.20) = 3.475/5` → **3.5/5**, FAIL.

## Required fixes

1. Make migration/validation reject unknown nested keys and unsupported ventilator modes.
2. Reject or strip hypertonic payloads unless a reviewed calibration record is present; preserve state atomically.
3. Add focused regression assertions for those cases and use numeric tolerance for repeated `1/30 s` elapsed time.

No task marker was changed. No other judge report was read.
