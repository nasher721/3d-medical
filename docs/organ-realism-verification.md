# Anatomical organ replacement

Replaced procedural ellipsoids and decorative brain ridges with BodyParts3D anatomical surfaces. The brain assembles cortical gyri, cerebellum, and brainstem; lungs retain separate lobes; the heart and kidneys use source-derived contours. Source coordinates are rotated and uniformly scaled offline, with paired organs sharing a scale.

The GLB has six named meshes, 432,094 triangles, and a size of 10,181,828 bytes. glTF Transform 4.5.0 welding, deduplication, and pruning preserve anatomical detail. The runtime retains 219,636 shared vertices and indexed rendering, using approximately 10.18 MB of organ GPU buffers instead of 31.11 MB of expanded vertex buffers. WebGL 1 devices without 32-bit index support retain a tested expanded fallback. No runtime dependencies or model CDN were added.

## Changed files

- `src/anatomy.js`: replaced procedural organ construction with local asset loading; tissue lighting, solid/translucent passes, organ-centered cameras, and local vessel visibility.
- `src/organ-assets.js`: validated static GLB parser and fetch loader for the existing WebGL renderer.
- `src/app.js`: asynchronous loading status, solid default, source credits, and collapsed physiology details.
- `src/styles.css`: detail disclosure positioning that leaves organ close-ups visible.
- `scripts/prepare-organs.js`: reproducible source assembly, coordinate normalization, triangle cleanup, normal generation, and GLB export.
- `scripts/build.js`: includes anatomical assets in the standalone build.
- `assets/organs/anatomy.glb`, `manifest.json`, and `README.md`: runtime meshes, source metadata, attribution, licensing, and preparation instructions.
- `tests/organ-assets.test.js`: parser validation and malformed-input regressions.
- `tests/anatomical-bundle.test.js`: real asset size, names, bounds, normals, and heartbeat/respiration behavior, shared indices, and the WebGL 1 fallback.
- `README.md`: updated renderer and asset documentation.

## Verification

- 28 Node tests passed, zero failed.
- Syntax checks passed for all 12 JavaScript source/build modules.
- Standalone build succeeded.
- Khronos glTF validation via glTF Transform reported no errors, warnings, infos, or hints.
- Built renderer, loader, GLB, and attribution files served over HTTP with byte-for-byte matches to source.
- Browser review covered all four organ views, whole circulation, solid and translucent lungs, brain orbit, and opening physiology details.
- Responsive review covered the default 1280×720 viewport and 390×844 mobile viewport.
- The static build rendered the anatomical brain without browser warnings or errors.

## Scope and limitations

These are anatomical teaching meshes with illustrative tissue materials. Pigmentation and lighting are procedural; they are not photographic tissue scans. Organs are separated and scaled for the teaching diagram; vessel paths and physiological deformation remain schematic. This work does not establish clinical validation or a hosted deployment.

See `assets/organs/README.md` for the BodyParts3D CC BY-SA 2.1 Japan attribution and license applicable to the adapted mesh assets.

Focused code review findings were resolved: lung normals use the inverse-transpose of the diagonal animation scale, and the runtime preserves indexed geometry. Browser rendering was rechecked for both 16-bit lung and 32-bit brain indices without warnings or errors.


## Continued fidelity work — 2026-09-05

This section supersedes the counts and group-scaling description above. The optimized local bundle now has 454,298 triangles and 230,738 vertices in 10,581,512 bytes. Both kidneys use the official 95% reduction archive, retaining 12,394 / 15,358 triangles instead of 2,478 / 3,070. The other surfaces are unchanged source selections.

One uniform scale now preserves relative source organ dimensions. Source-derived bilateral vertical offsets restore the right kidney below the left. The preparation script writes source hashes, source bounds and baked centers without discarding attribution or provenance restrictions. The renderer reads those centers for tissue animation. Cerebral labels now follow patient left +X, and the Circle of Willis occupies a transverse basal layout; the vertebral/basilar route lies anterior to the source pons rather than behind it.

Changed files in this continuation: `scripts/prepare-organs.js`, `src/anatomy.js`, `assets/organs/anatomy.glb`, `assets/organs/manifest.json`, `assets/organs/README.md`, `tests/anatomical-bundle.test.js`, `tests/source-proportions.test.js`, and this report. The pipeline reuses the installed glTF Transform 4.5.0 and native loader; no dependency was added.

Verification: 84 Node tests passed; all 16 JavaScript modules passed syntax checks; the standalone local-preview build passed. Khronos validation via glTF Transform reported no errors, warnings, infos or hints. Browser review covered solid brain, translucent brain, oblique brain orbit, kidneys, lungs, and zero-flow controls, with no captured warning/error logs. Structured visual verdict is saved in `.omx/state/anatomical-fidelity/ralph-progress.json`.

Limitations: this is still an exploded teaching layout with schematic circulation and urinary overlays, not source-registered full-body anatomy or clinical validation. The heart surface is specifically the wall of heart. The source license conflict remains unresolved; local preview is available, while distribution remains gated. No deployment was performed.
