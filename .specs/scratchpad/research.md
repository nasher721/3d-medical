# Phase 2a research: multiorgan ICU simulator

Research completed 2026-09-05. This is the external-evidence handoff and does not modify the draft task.

## Classification

Comprehensive research: the request combines anatomy, browser asset delivery, cardiovascular and renal physiology, intervention modeling, ventilation, and asset licensing.

## Runtime facts checked locally

- `package.json` declares a dependency-free Node >=22 app with `test`, `check`, and `build` scripts. There is no Three.js package.
- `src/anatomy.js` owns a custom WebGL renderer and local GLB loading. It already has a transparency flag, named organ meshes, schematic brain/pulmonary/renal route groups, particles, and live metrics.
- `src/organ-assets.js` is a static GLB parser. `assets/organs/anatomy.glb` contains six BodyParts3D-derived organ surfaces. `assets/organs/README.md` records node names, source archive, and preparation commands.
- `src/physiology.js` already exposes CPP, ICP, PaCO2, brainFlow, renalFlow, CO, EDV, ESV, PEEP, respiratory rate, tidal volume, and intervention state. Existing values are bounded algebraic teaching relationships.

Implementation implication: preserve the custom WebGL and static GLB path. Do not assume a new runtime dependency.

## Source and claim mapping

### Cerebral arterial and venous anatomy

1. [Neuroanatomy, Cerebral Blood Supply](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-915/) (NCBI Bookshelf; updated 2023-07-24) establishes bilateral ICA and vertebral sources, anterior and posterior circulation, Circle of Willis connections, ACA/MCA/PCA segments and territories, perforators, PICA/AICA/SCA, basilar supply, and common variants.
2. [Anatomy, Head and Neck: Cerebral Blood Flow](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19178/) (NCBI Bookshelf; updated 2023-07-17) lists Circle of Willis vessels and describes cerebral autoregulation.
3. [Neuroanatomy, Dural Venous Sinuses](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-20768/) (NCBI Bookshelf; updated 2023-08-08) establishes named dural sinuses and venous return through internal jugular veins, SVC, and heart.

Minimum graph: ICA -> ACA/MCA/anterior choroidal; vertebral -> PICA and basilar; basilar -> AICA/pontine/SCA/PCA; ACom between ACA; PCom between ICA and PCA. Add territory labels and a schematic or variant flag. Do not terminate brain flow at the tissue surface.

### Renal blood and urine

1. [Anatomy, Abdomen and Pelvis: Kidneys](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-28331/) (updated 2025-09-15) establishes cortex/medulla, hilum, renal artery entry, renal vein and pelvis exit, and their spatial ordering.
2. [Anatomy, Abdomen and Pelvis: Kidney Collecting Ducts](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19712/) (updated 2024-05-01) establishes collecting ducts -> calyces -> renal pelvis fluid routing.

Use separate renal arterial, tissue, venous, tubular, and urine state channels. Urine must travel into the ureter and use a distinct visual legend.

### Cardiovascular and interventions

1. [Physiology, Cardiac Output](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-18897/) (updated 2023-07-17) supports CO and stroke-volume teaching tied to preload, contractility, and afterload.
2. [Physiology, Cardiac Preload](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-27651/) (citation date 2022-09-26) supports preload as EDV or ventricular stretch and EDV/ESV interpretation.
3. [Surviving sepsis campaign 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8486643/) supports norepinephrine first-line, vasopressin add-on when MAP remains inadequate on norepinephrine, and initial MAP 65 mmHg for the stated septic-shock population. It does not calibrate this simulator dose-response.
4. [Neurocritical Care Society cerebral edema guideline](https://pmc.ncbi.nlm.nih.gov/articles/PMC7272487/) (2020) discusses hypertonic sodium solutions and mannitol, low or very low evidence quality, symptom-based rather than sodium-target dosing in SAH, and monitoring renal function, sodium, and chloride.

Calibration prerequisite: no numeric vasoactive response may be enabled without agent, concentration, route, time-course, and effect calibration evidence. The reviewed osmotherapy guideline includes examples around 7.2% and 23.5% sodium chloride; it does not establish universal 3%, 7.5%, or 23.4% protocols. Keep 3%, 7.5%, and 23.4% controls disabled or qualitative until concentration-specific sources and calibration evidence are reviewed.

### Ventilation and coupling

1. [Assist-Control Ventilation](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-17914/) supports tidal volume, respiratory rate, minute ventilation (VT x RR), FiO2, and PEEP controls.
2. [Positive end-expiratory pressure and cardiac output](https://pmc.ncbi.nlm.nih.gov/articles/PMC1414045/) supports a bounded PEEP link to venous return, RV output, LV filling, and LV output.

## Technical and asset evidence

- [Khronos glTF 2.0 specification](https://github.com/KhronosGroup/glTF/tree/main/specification/2.0) is the official Khronos upstream source. Retrieved specification text describes JSON scene data plus binary resources, meshes, materials, hierarchy, and animations.
- [Blender 4.5 LTS glTF exporter](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) is the verified versioned exporter manual. The unversioned Blender URL returned 404.
- [glTF Transform CLI](https://gltf-transform.dev/cli) documents validation, prune, and deduplication. Existing preparation uses glTF Transform 4.5.0; no runtime dependency is needed.

## Provenance and license evidence

- [BodyParts3D database description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html) identifies the 3D anatomy database and DOI 10.18908/lsdba.nbdc00837-000.
- [BodyParts3D 3.0 README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html) identifies the polygon-reduced 2011 archive materials.
- [Current BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) was retrieved and states “Last updated: 2025/02/27” and CC BY 4.0 with required attribution wording.
- [Historical CC BY-SA 2.1 Japan deed](https://creativecommons.org/licenses/by-sa/2.1/jp/) is linked by the existing README, but does not prove the terms attached to the exact 2011 archive.

Release gate: compare the exact downloaded archive and release README against the applicable version-specific license before distributing new derivatives. Record source IDs, archive release, license URL, and the resolution in the manifest. Do not silently select either historical or current terms.

## Merge recommendations

1. Add a named Circle of Willis, vertebrobasilar, cerebellar, perforator, territorial, dural-sinus, and internal-jugular graph.
2. Add independent brain, lung, and kidney transparency with internal perfusion overlays and deliberate alpha ordering.
3. Add collecting ducts, calyces, renal pelvis, and ureter route separate from renal blood.
4. Keep vasoactive and osmotherapy effects qualitative and bounded until concentration-specific calibration exists; include renal/electrolyte cues.
5. Add live CPP/ICP/PaCO2/autoregulation flow dynamics and a schematic Frank-Starling curve with an operating point.
6. Couple mode, FiO2, RR, VT, and PEEP to gas exchange and bounded heart-lung response.
7. Preserve custom WebGL/static GLB parser and resolve the BodyParts3D license gate.

## Evidence limits

- StatPearls chapters are updated 2023-2025; guidelines are 2020-2021. They ground concepts but do not validate simulator equations or visual scale.
- Sources do not justify CFD, histologic capillary visualization, pharmacokinetics, dosing safety, or patient-specific prediction.
- Khronos registry URL returned 403, so the official Khronos GitHub specification repository was used. The unversioned Blender manual returned 404; Blender 4.5 LTS was verified.
- BodyParts3D current CC BY 4.0 wording conflicts with the project’s historical CC BY-SA 2.1 Japan wording. This is a release gate, not a resolved license determination.
