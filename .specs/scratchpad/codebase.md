# Phase 2b scratchpad

- Current app: native WebGL, dependency-free ES modules; no backend or EHR/device integration.
- Core source boundaries: `src/physiology.js` model; `src/anatomy.js` renderer/routes; `src/organ-assets.js` embedded-buffer GLB parser; `src/app.js` UI/lifecycle/I-O; `src/monitors.js` canvas displays; `src/ui.js` field metadata; `src/content.js` educational text; `src/styles.css` layout.
- Existing relevant state: interventions norepinephrine, dobutamine, retained fluid, FiO2, PEEP, RR, tidal volume, HR, ICP; patient Hb/contractility/tone/volume/demand/autoregulation; metrics include cerebral flow and renal flow.
- Existing visual gaps: only schematic hand-authored brain routes; one global translucent-organs switch; no urine/collecting system; no named vasopressor selection or hypertonic solution; no live Frank-Starling curve (only schematic LV PV loop); ventilator controls/model are partial.
- Assets: BodyParts3D GLB six external named surfaces, ~10 MB, no internal vasculature/renal pelvis. Custom parser rejects extensions/external buffers/transforms.
- Persistence: `sessionData()` format `flowstate-session`, version 1; restore requires exact version and known keys; JSON includes setup/history/events/layers/color/selected view/speed; CSV fixed columns. New state must migrate and export explicitly.
- Tests: physiology invariants/directions/bounds/extremes; GLB parser and anatomical bundle/index fallback; no browser integration tests for actual WebGL/UI persistence.
- Risk priority: high for anatomy fidelity, renal/urine semantics, intervention expansion, cerebral coupling, ventilator semantics, persistence compatibility; medium for rendering/performance, curve display, responsive UI.
- Recommended order: schema/tests -> model -> renderer/assets -> controls/monitors/persistence -> docs/build/browser QA.
