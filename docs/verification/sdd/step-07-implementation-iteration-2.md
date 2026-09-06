# Step 7 remediation — iteration 2

Implemented the canonical graph as actual named shared-endpoint geometry (24 edges), semantic arterial/venous/urine runtime routes, independent regional particle rates, renal tissue beds, complete collecting/calyces/pelvis/ureter/bladder/outlet geometry, deformed procedural shells, and learner labels through the app overlay. Removed camera-driven mutation of urine identity and legacy global transparency filtering. Opaque geometry writes depth before sorted translucent shells; corrected premultiplied framebuffer alpha so translucent tissue remains visible.

Files: `src/anatomy.js`, `tests/anatomical-bundle.test.js`, `tests/browser/anatomy-harness.html`; authorized label-only integration in `src/app.js` and `src/styles.css`.

Verification: `node --test tests/anatomical-bundle.test.js`, `npm test`, `npm run check`, and `npm run build` passed. Actual CUA IAB captures used 1440×900 and390×844. ChromeDevTools profile was occupied; no user browser was stopped.

Evidence in `anatomy-browser/`:
- `brain-narrow-final.png`: fresh390px reload then Brain; collapsed key and all19 canonical markers.
- `brain-key-narrow-final.png`: explicitly open key and scroll; venous/capillary labels and cerebral units readable.
- `brain-transparent-narrow-final.png`: Display settings, Brain0.35, peers1; compare opaque capture for depth visibility.
- `brain-desktop-final.png`: complete desktop graph with20 markers/key rows (19 anatomy plus flow), no horizontal overflow.
- `kidneys-narrow-final.png`: distinct six urine path markers, renal blood and urine flow markers.
- `lungs-desktop-final.png` versus `lungs-transparent-desktop-final.png`: lungs1→0.35 reveals internal blood beds while brain/kidneys controls remain1.
- `zero-flow.json`/`zero-flow-summary.json`: harness zero input freezes every route phase, finite particles, GL error0, immutable urine group. Manifest-only resource request; noGLBfetch.

Key default is evaluated at creation: fresh narrow reload is collapsed; resizing an already-open desktop key preserves deliberate open state. Known limitation: geometry is canonical/schematic, not patient-specific anatomy. Visual verdict91 persisted under `.omx/state/anatomic-multiorgan/ralph-progress.json`. No new dependency, mesh distribution, clinical claim, or DONE marker.
