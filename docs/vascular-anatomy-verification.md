# Vascular anatomy correction

The primary rendering uses BodyParts3D vascular surfaces in the same source coordinate frame as the six organ surfaces. The original organ GLB remains unchanged. Runtime translations restore original organ positions relative to the heart; no organ is independently resized and no source vascular mesh is stretched to fit the former exploded layout.

The second GLB covers the source's available major systemic, pulmonary, renal and coronary vessels. Named carotid and jugular surfaces connect to the code-owned intracranial teaching overlay. Arterial/venous identity is separate from oxygenation: pulmonary arteries are venous-oxygenation blue, and pulmonary veins are arterial-oxygenation red.

## Cerebral overlay and fallback

The intracranial network includes separate bilateral ACA, MCA and PCA territories; communicating arteries; a shared vertebrobasilar junction and basilar trunk; sagittal, straight, transverse and sigmoid sinus pathways; and bilateral jugular drainage. Distal beds and short cervical connections remain schematic. The source archive does not supply those intracranial vessels, and topology checks do not establish their patient-specific shape or caliber.

If the vascular asset cannot load, the application retains a corrected named teaching network with a left aortic arch and separate arch branches, four pulmonary veins, renal hilar laterality, coronary supply and separate iliac arteries and veins. It removes the former direct artery-to-vein U-turns and cross-hemisphere territory shortcuts.

Flow particles remain on schematic cerebral/urinary paths. They are suppressed on replaced major-vessel centerlines because those guessed paths would run outside the source surfaces. Physiology controls, regional flow/pressure colors, organ selection, camera orbit, opacity and zero-flow behavior remain available.

## Source references

- [BodyParts3D Release 3.0 archive and documentation](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html): source IDs and coordinate data; exact OBJ hashes are retained in the vascular manifest.
- [NCBI: Aortic Arch](https://www.ncbi.nlm.nih.gov/books/NBK563170/): normal left arch and its three branches.
- [OpenStax: Heart Anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy): pulmonary venous return and coronary circulation.
- [Renal hilar anatomy study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4994971/): renal hilar relationships and variation.

## Limits

This is one source anatomy with a schematic cerebral overlay, not exhaustive vasculature or an anatomical certification. Source reductions, absent capillary beds, normal variation, approximate neck connectors and animated tissue deformation limit fidelity. The pre-existing BodyParts3D license conflict remains recorded; local preview works, and release packaging remains gated. No deployment is part of this change.


## Final verification

- 56 vascular meshes; 91,710 triangles; 45,985 vertices; optimized GLB 2,239,448 bytes.
- 100 Node tests pass, including source alignment, oxygenation identity, basal circle geometry, upload-failure rollback and blocked release preparation.
- Syntax checks pass for 19 JavaScript modules. The project has no separate lint/typecheck configuration or external runtime dependencies.
- Local-preview build succeeds and packages both GLBs and both manifests.
- glTF Transform dedup/prune completed; Khronos validation reports zero errors, warnings, infos or hints.
- Browser review covered source pulmonary branching, renal vessel alignment, solid/translucent cerebral anatomy, full-body framing and zero flow. The harness reported 56 loaded source meshes, finite particle coordinates, GL error 0, and all regional route rates 0 after zero-flow selection. No browser warnings/errors were captured.
- Visual review record: `.omx/state/vascular-anatomy/ralph-progress.json`. The numerical verdict concerns implementation presentation, not anatomical certification.

Primary changed files: `src/anatomy.js`, `src/vascular-registration.js`, `src/vascular-routes.js`, `src/app.js`, `scripts/prepare-vasculature.js`, `scripts/build.js`, the vascular asset/manifest and focused vascular tests. The named fallback replaces anonymous route loops; superseded GPU buffers and particle paths are disposed after a successful source replacement, with rollback on interrupted upload.
