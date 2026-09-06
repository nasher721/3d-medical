# Step 7 label integration

Date: 2026-09-05

Implemented in `src/app.js` and `src/styles.css`:

- Reconciles dynamic `AnatomyRenderer.getLabels()` entries on every frame, removing stale labels when views change and preserving organ anchor labels.
- Renders numbered, positioned anatomy/flow markers at projected `anchorX`/`anchorY` coordinates with accessible full-name/title text.
- Adds a compact scrollable anatomy key for brain and kidney views. It exposes all canonical cerebral structures and flow-status cues, plus collecting ducts, calyces, renal pelvis, ureter, bladder, outlet, renal blood bed, and separate urine outflow. Whole/systemic views retain the four organ labels without the key.
- Keeps semantic markers separate from `data-organ` navigation, so clicking or focusing labels cannot change the selected organ.

Verification:

- `npm test` → **49/49 passed**.
- `npm run check` → passed; modified app/style modules included.
- Browser DevTools served `http://localhost:5188/`: brain view returned `brain-markers=20` and key text containing “Left internal carotid artery”; kidney view key exposed the six collecting/outlet labels plus renal and separate urine flow rows. At narrow viewport 390×844, the key remained visible (`narrow-key=visible`).
- No anatomy or physiology source files were modified in this integration slice.
