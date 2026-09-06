# Step 3 intervention registry evidence

Date: 2026-09-05
Owner: physiology/UI registry lane

## Completion

`src/physiology.js` now exports one authoritative `VASOACTIVE_REGISTRY` containing exactly five IDs: norepinephrine, dobutamine, epinephrine, phenylephrine, and vasopressin. Every record includes display name, conceptual unit, time basis, finite bounds, effect dimensions, and educational copy. Existing norepinephrine and dobutamine retain `µg/kg/min`; vasopressin is explicitly `conceptual model units`. The legacy `setIntervention(state, key, value)` API remains intact and now routes all five named vasoactive keys into the nested registry-backed state.

`src/ui.js` derives vasoactive control metadata from `VASOACTIVE_REGISTRY`, eliminating duplicated names, units, and bounds. Hypertonic UI options derive from `HYPERTONIC_CALIBRATION_RECORDS`; all three remain disabled because their records are unreviewed and not solver-consumable. A non-null hypertonic direct input is rejected without mutating state. No Step 4 physiological drug effects were added.

## Verification

`npm test` → 39 passed, 0 failed. `npm run check` → passed. `npm run build` → passed. Registry tests assert exact IDs, units, finite bounds, required metadata, and atomic hypertonic rejection.

## Self-critique / handoff

The named new vasoactive controls are writable as conceptual bounded inputs but intentionally have no modeled effect until the coupled-physiology lane supplies reviewed response behavior. Step 4 must consume registry metadata and add effects only with documented educational assumptions; hypertonic records remain blocked unless all required reviewed calibration fields are present.
