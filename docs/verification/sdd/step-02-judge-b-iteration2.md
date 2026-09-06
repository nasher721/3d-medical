# Step 2 judge B — iteration 2

Evidence: `npm test` reports 38/38 passing and `tests/model-consistency.test.js` now covers nested validation, pressure-control rejection, non-finite values, hypertonic blocking, accumulator stepping, migration, and deterministic history. Independent reproducers now reject unknown nested intervention/ventilator keys, `NaN`, non-finite opacity, non-null hypertonic objects, and `pressure-control` with explicit errors. A tampered v2 candidate passed to `validateSimulationState` returns invalid for both unsupported mode and non-finite ventilator input. Thirty `0.01 s` calls advance exactly `0.3 s` with a residual accumulator near machine epsilon, demonstrating actual `1/30 s` fixed substeps. Legacy aliases, 60-second ceiling, invalid elapsed no-op, and CPP identity remain intact.

Scores (evidence before score):

- Behavioral correctness: 4.6/5 — lifecycle, migration, atomic rejection, and legacy compatibility pass adversarial checks.
- Numerical/contract correctness: 4.6/5 — fixed-step accumulator, one-second history cadence, bounds, finite outputs, and algebraic identities pass.
- Safety/educational boundary: 4.7/5 — bounded approximation framing and unsupported-input protection are explicit.
- Reproducible artifact evidence: 4.6/5 — focused tests, full suite, and direct failure reproducers are recorded.

Weighted total: **4.63/5.00 — PASS** (standard threshold 4.0). Mandatory nested-validation, hypertonic, pressure-mode, and fixed-step gates pass. Minor residual risk: direct callers can mutate exposed objects without invoking validators; persistence/import paths are the protected boundary.
