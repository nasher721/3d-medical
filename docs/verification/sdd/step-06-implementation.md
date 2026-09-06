# Step 6 asset pipeline and provenance evidence

`src/organ-assets.js` now exposes `assertAssetReleaseAllowed(manifest)`. Release loading rejects any manifest record that is not explicitly `provenanceStatus: reviewed` with `derivativeReleaseAllowed: true`; ordinary local loading remains available for the educational preview. `scripts/build.js --release` applies the same gate and fails against the current blocked manifest, while the default local build remains usable. `scripts/prepare-organs.js` refuses to prepare new derivatives until the existing provenance gate is reviewed. No mesh or dependency was added.

Existing parser behavior remains strict for GLB 2.0: unsupported extensions, external or multiple buffers, non-identity transforms, malformed indices, out-of-bounds accessors, non-finite positions/normals, zero normals, and invalid primitive modes/features are rejected. Existing tests continue to cover named meshes, indices, normals, malformed headers, and fetched loading; the new test covers release blocking and reviewed-manifest acceptance.

Verification: `npm test` → 38 passed; `npm run check` passed; `npm run build` passed as local educational preview; `npm run build -- --release` failed as expected with `Organ asset release blocked by provenance record: brain.` The manifest retains six stable named records, normalized transform intent, source/archive metadata, and `derivativeReleaseAllowed: false`. Exact archive SHA-256 was not added because the 134 MB source archive was not retained; the unresolved license conflict remains the safe release blocker.

## Iteration 2 remediation

The normal build now copies only the manifest and README, so `dist/assets/organs/anatomy.glb` is omitted while the native code-owned route schematic remains available. The renderer treats a missing surface bundle as a normal `schematic-fallback` path without invoking the error UI. Release mode still fails closed. The parser compares declared POSITION accessor min/max values with decoded vertices and rejects mismatches; adversarial tests cover extensions, external buffers, non-identity transforms, and bad bounds.

Fresh verification: `npm test` → 40 passed; `npm run check` → passed; `npm run build` → passed with `dist anatomy.glb omitted` and manifest retained; `npm run build -- --release` → expected provenance-blocking failure.
