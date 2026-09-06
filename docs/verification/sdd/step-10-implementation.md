# Step 10 implementation

Date: 2026-09-05

Updated `src/content.js`, `docs/physiology.md`, `README.md`, and the Model Guide copy in `src/app.js`.

- Documented the single canonical adult baseline and PBW as the simulator’s predicted-body-weight setting used for illustrative tidal-volume conversion.
- Recorded exact identities, units, fixed `1/30 s` stepping, 60 s call ceiling, 1 s history cadence, 250 ms UI cadence, input bounds, shared Frank–Starling forward function, VC cycle timing and engineering waveform quantities.
- Described cerebral territory/venous labels and separate renal perfusion, collecting-system, ureter, bladder/outlet, and urine-output teaching paths.
- Updated content metadata for all five vasoactive conceptual units and removed dose-like norepinephrine lesson wording. Kept 3%, 7.5%, and 23.4% hypertonic records visibly unreviewed/disabled with required calibration fields and no effects or targets.
- Preserved the source ledger and explicitly separated illustrative coefficients from clinical calibration or validation.
- Documented the BodyParts3D provenance conflict, blocked derived GLB/procedural schematic fallback, and focused anatomy-key behavior. The Model Guide now states the procedural-shell fallback and keeps urine output separate from renal perfusion, GFR, and clearance. Exact CSV column names remain deferred to Step 9.

Verification:

- `npm test` → **60 passed, 0 failed**.
- `npm run check` → passed.
- `npm run build` → passed; provenance-blocked GLB remains omitted.
- `node --test tests/ui-contract.test.js` → 3/3 passed.
