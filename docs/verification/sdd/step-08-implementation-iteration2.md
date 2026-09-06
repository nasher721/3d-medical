# Step 8 implementation iteration 2

Date: 2026-09-05

Changed:

- `src/app.js` — unified Restart/reset into a canonical `createSimulation` reset; restores time/history/metrics, baseline, speed, visual defaults, whole view, and running state. Direct number inputs now reject blank, nonnumeric, non-finite, and out-of-range values with visible toast feedback while preserving the last valid value; range inputs continue clamping through the model setter. Session export is schema v2 with explicit nested vasoactive (all five agents), ventilator, fluid, and visual opacity state. Import validates nested state and opacity atomically before mutation. Model guide now states the BodyParts3D provenance/license conflict and blocked derived surfaces.
- `src/ui.js`/`src/styles.css` — existing volume-control and five-vasoactive controls remain authoritative and usable; reset wording now matches canonical restart semantics.

Verification:

- `node --check src/app.js && node --check src/ui.js` → passed.
- `node --test tests/ui-contract.test.js` → 3/3 passed.
- `npm run check` → passed.
- `npm run build` → passed; blocked GLB remains omitted.
- Chrome DevTools served `http://localhost:5188/`: desktop 1440×900 and narrow 390×844 loaded with no console messages. Browser replay returned `Step8:00:08->00:00:vc=35` after restart, `Step8:version=2:ep=0.3:opacity=3` after save, `Step8:reload-saved-v2:ep=0.3` after reload, and `Step8:invalid=feedback:kept=0` for blank/out-of-range input.
- Full `npm test` is temporarily blocked by the concurrent Step 4 lane: `tests/physiology.test.js` imports `forwardStrokeVolume`, which is not yet exported. UI-focused checks above pass independently.
