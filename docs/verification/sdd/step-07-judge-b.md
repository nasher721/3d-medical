# Step 07 independent judge B: anatomy renderer

Date: 2026-09-05  
Disposition: FAIL (mandatory rendered-label and semantic-route gaps)

Evidence: fresh `npm test` (45/45 pass), `npm run check` (pass), and
`npm run build` (pass); source inspection of `src/anatomy.js`; live localhost
render at `http://localhost:5188/` in whole and brain views. The browser DOM
and screenshot showed only organ labels (Brain, Lungs, Heart, Kidneys), not
the canonical cerebral, capillary, or venous labels.

| Criterion | Evidence before score | Score |
|---|---|---:|
| Behavioral correctness (0.35) | Procedural fallback renders six identifiable shells and routes are animated; whole/brain views render successfully. Required learner-facing cerebral/capillary/venous/urine labels are absent from `getLabels()`/the live DOM. | 2.6 |
| Numerical/contract correctness (0.25) | Graph topology, opacity clamping, and route metadata tests pass. Runtime brain arterial and venous routes both use `group: 'brain'`/`id: 'vessels'`; urine routes are mutated from `group: 'urine'` to `renal` during kidney drawing. No real geometry/depth or zero-flow visual assertion exists. | 2.8 |
| Safety/educational boundary (0.20) | Fallback is correctly selected while manifest provenance is blocked; route colors and guide identify an illustrative model. The rendered view does not expose the required schematic-capillary/venous boundary labels. | 3.9 |
| Reproducible artifact evidence (0.20) | Automated tests are reproducible but inspect metadata/prototype mocks. Live screenshot directly demonstrates missing anatomy labels; browser opacity/depth and no-GLB-request evidence are not captured as executable checks. | 2.9 |

Weighted score: **2.97/5.0 — FAIL**.

Mandatory failures: (1) canonical cerebral/capillary/venous labels are not
rendered; (2) runtime route semantics collapse brain blood classes and mutate
urine into renal grouping; (3) real WebGL opacity/depth and zero-flow visual
behavior remain unproven.
