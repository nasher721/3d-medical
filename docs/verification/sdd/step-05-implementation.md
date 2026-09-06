# Step 5 named anatomy graph

`src/anatomy.js` now exports a code-owned adult teaching topology with bilateral internal carotids, ACA/ACom/MCA, PCA/PCom, basilar, vertebral arteries, named schematic capillary territories, and dural venous/internal jugular return. The renderer stores this graph and separate arterial, venous, and renal collecting-system route collections for later label/legend integration. No mesh or derivative asset was added.

Verification: `node --test tests/anatomical-bundle.test.js` and `npm run check` pass. Tests machine-check required node labels, connected Circle of Willis edges, explicit schematic-capillary labels, and disjoint arterial/venous/urine semantic route collections.

Self-critique: existing procedural vessel coordinates remain a compatibility renderer; this step supplies stable topology metadata and does not claim geometric or clinical anatomic fidelity. Step 7 owns visual labels, opacity, and depth-aware route rendering.
