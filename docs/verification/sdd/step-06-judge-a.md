# Step 6 independent judge A

Date: 2026-09-05  |  Reviewer: independent judge A

## Evidence and scores

Behavioral correctness: `node --test tests/organ-assets.test.js` passes 6 tests, including named mesh/index checks and blocked release loading. Parser code rejects extensions, external buffers, non-identity transforms, malformed indices, zero/non-finite normals, and accessor buffer overruns. Score: **4.1/5**.

Numerical/contract correctness: GLB 2.0 narrow parsing and `assertAssetReleaseAllowed` are clear. However, parser does not validate declared accessor geometric `min`/`max` against decoded positions, and adversarial tests do not exercise most required rejection classes. Score: **3.8/5**.

Safety and educational boundary: README and comments clearly mark anatomy schematic and provenance conflict. `scripts/prepare-organs.js` and `npm run build -- --release` enforce the gate. Score: **4.3/5**.

Reproducible artifact evidence: Fresh parser tests and `npm run check` are reproducible; implementation records release-mode failure. But default `scripts/build.js` still copies `assets/organs/anatomy.glb` into `dist`, and `src/anatomy.js` loads it, so a normal distributable build bypasses the provenance gate. Score: **3.2/5**.

Weighted overall: `(4.1×.35) + (3.8×.25) + (4.3×.20) + (3.2×.20) = 3.88/5`.

## Disposition

**FAIL** at the critical 4.5 threshold. Mandatory failure: unresolved provenance is not enforced for the default build/distributable artifact; only `--release` blocks it. A safe schematic fallback or default-build omission of the GLB is required. Add adversarial tests for extensions, external buffers, non-finite values, bounds, and transforms.
