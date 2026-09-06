# Step 06 independent judge B

Date: 2026-09-05
Scope: `src/organ-assets.js`, `scripts/build.js`, `scripts/prepare-organs.js`, `assets/organs/manifest.json`, `tests/organ-assets.test.js`
Disposition: **PASS** (Critical threshold 4.5/5.0)

Fresh evidence:

- Manifest assertion passed: six stable organ names, BodyParts3D 3.0/99% source archive, 134113358-byte archive metadata, normalized Y-up/Z-anterior transform intent, and all records `blocked-pending-review` with `derivativeReleaseAllowed: false`.
- `assertAssetReleaseAllowed(manifest)` rejects the current manifest. `npm run build` succeeds as local educational preview; `npm run build -- --release` exits 1 with the expected provenance-blocked error. `scripts/prepare-organs.js` also exits 1 before derivative generation for the blocked manifest.
- Actual `anatomy.glb` parses into six meshes with non-empty positions, matching normals, and triangle-aligned indices.
- Adversarial parser replay rejects unsupported extensions, external buffers, non-identity transforms, buffer-view bounds violations, out-of-range indices, and zero normals.
- `npm test` passes 38/38.

| Component | Weight | Justification then score |
| --- | ---: | --- |
| Behavioral correctness | 0.35 | Local preview remains usable; release and preparation paths stop on unresolved provenance; actual GLB parses. **4.6/5** |
| Numerical/contract correctness | 0.25 | Static GLB 2.0, single BIN, indices, finite/non-zero normals, accessor bounds, and identity transforms are enforced. **4.4/5** |
| Safety/educational boundary | 0.20 | Derivative release is blocked until review; no provenance conflict is silently licensed. **4.7/5** |
| Reproducible artifact evidence | 0.20 | Manifest assertions, adversarial parser replay, release/preparation failures, actual bundle parse, and 38/38 tests are repeatable. **4.5/5** |

Weighted score: `(4.6×0.35) + (4.4×0.25) + (4.7×0.20) + (4.5×0.20) = 4.55/5` → **4.55/5, PASS**.

Mandatory provenance gate passes by blocking unresolved records. No checksum was asserted; the asset lane owns that follow-up. No task marker changed and no other Step 6 judge report was read.
