# Step 1 judge A — iteration 2

Evidence: `docs/physiology.md` explicitly labels the simulator an adult educational approximation, separates implementation coefficients from clinical calibration, and records units, bounds, timing, assumptions, and direct dated sources retrieved 2026-09-05. `src/content.js` runtime inspection returns exactly 3%, 7.5%, and 23.4% records; each has `enabled: false`, `solverConsumable: false`, `solverEffect: null`, `calibrationStatus: 'unreviewed'`, null bounds/review/version, and a blocked required-field gate. The ledger exposes the same boundary and labels coefficients as illustrative.

`assets/organs/README.md` and `manifest.json` retain exact archive endpoint metadata and compare archived 2011 README CC BY-SA 2.1 Japan terms with current CC BY 4.0 terms dated 2025-02-27. All six records remain `blocked-pending-review` and `derivativeReleaseAllowed: false`. Fresh default build inspection confirms `dist/assets/organs/anatomy.glb` is omitted; release mode fails closed, preserving the code-owned schematic fallback.

Scores (evidence before score):

- Behavioral correctness: 4.7/5 — executable calibration and derivative gates are consistent.
- Numerical/contract correctness: 4.6/5 — bounds, units, coefficient disclosure, and timing contracts are explicit.
- Safety/educational boundary: 4.8/5 — no clinical targets, dosing claims, or unsupported calibration.
- Reproducible artifact evidence: 4.7/5 — runtime assertions, syntax/check, source snapshots, and build behavior recorded.

Weighted total: **4.70/5.00 — PASS** (critical threshold 4.5). Mandatory source, calibration, and provenance gates pass; exact archive SHA-256 remains unavailable because the archive was not retained.
