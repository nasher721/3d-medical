# Step 06 independent judge B — iteration 2

Date: 2026-09-05
Scope: asset build/preparation gate, GLB parser, manifest, fallback, tests
Disposition: **PASS** (critical threshold 4.5/5.0)

Fresh evidence:

- Default `npm run build` produces `dist/assets/organs/README.md` and `manifest.json` but omits blocked `anatomy.glb`; the code-owned schematic route fallback remains in `src/anatomy.js` and is initialized before optional surface loading.
- `npm run build -- --release` exits 1 with the expected provenance-blocking error. `scripts/prepare-organs.js` also stops before derivative generation against the blocked manifest.
- Manifest replay passes six stable names, BodyParts3D 3.0/99% archive metadata, normalized transform intent, and `provenanceStatus: blocked-pending-review` plus `derivativeReleaseAllowed: false` for every record. No checksum claim is present.
- Adversarial parser replay rejects extensions, external buffers, non-identity transforms, accessor bounds mismatch, out-of-range indices, and zero normals. Actual GLB parses to six meshes. `npm test` passes 40/40.

| Component | Weight | Justification then score |
| --- | ---: | --- |
| Behavioral correctness | 0.35 | Default distribution omits blocked derived GLB while schematic routes remain available; release/preparation gates stop correctly. **4.6/5** |
| Numerical/contract correctness | 0.25 | GLB 2.0, bounds, finite positions/normals, indices, transforms, and manifest contracts are enforced. **4.5/5** |
| Safety/educational boundary | 0.20 | Unresolved provenance cannot distribute a derivative; local preview is clearly the fallback. **4.8/5** |
| Reproducible artifact evidence | 0.20 | Build outputs, expected failures, parser adversarial checks, actual bundle parse, and 40/40 tests are repeatable. **4.5/5** |

Weighted score: `(4.6×0.35) + (4.5×0.25) + (4.8×0.20) + (4.5×0.20) = 4.605/5` → **4.61/5, PASS**.

Mandatory default-distribution and provenance gates pass. No task marker changed and no other Step 6 judge report was read. `CLAUDE_PLUGIN_ROOT` remains unset/unavailable.
