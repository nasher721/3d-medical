# Phase 6 verification handoff

- Spec: `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md`
- Added one Phase 6 evaluation for each of Steps 1–12 (12 total), with level, artifact, evidence, and threshold.
- Rubric weights: behavior .35, numerical/contracts .25, safety/educational boundary .20, reproducibility .20; total 1.00. Thresholds: 4.2/5 for critical Steps 1, 4, 6, 11, 12; 4.0/5 for remaining steps.
- Mandatory gates: source review, calibration records, and exact asset archive/license comparison. Reviewer judgment cannot waive a failed gate; executable tests and real browser/device evidence dominate.
- Required numerical evidence includes unit conversion and volume balance tolerances, fixed-step comparison, finite extreme controls, zero/reverse-flow semantics, CPP identity at `1e-6`, regional flow sum, shared Frank-Starling SV/marker, VC pressure-flow-volume integral and CO2 coupling, and atomic persistence/import invalidation.
- Browser evidence includes opacity isolation, camera matrices for whole/brain/lung/kidney views, UI cadence ≤250 ms, pause freeze, and real supported-device/browser FPS.
- Judge5 fixes recorded: Step 2 begins after Step 1 contract handoff; Step 4 has concrete `executor`/`test-engineer` ownership and is serialized after Step 3 before Steps 7/9.
- Baseline `npm test`, `npm run check`, and `npm run build` passed before these documentation-only additions; Phase 6 checks are planned and were not run.
