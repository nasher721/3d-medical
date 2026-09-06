---
name: multiorgan-simulation
description: Evidence-grounded guidance for an educational browser simulator of coupled cerebral, pulmonary, renal, and cardiovascular physiology.
---

# Multiorgan simulation

Use this skill when extending an educational multiorgan circulation simulator. Show relationships without patient-specific advice, treatment instructions, or claims of clinical validation. Keep the model bounded and label the difference between anatomic structure, modeled tissue perfusion, and illustrative animation.

## Evidence baseline

The following sources were retrieved on 2026-09-05. NCBI Bookshelf links are StatPearls chapters. Guideline links are peer-reviewed articles hosted by PubMed Central.

### Cerebral circulation

- [Neuroanatomy, Cerebral Blood Supply](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-915/) (updated 2023-07-24) describes bilateral internal carotid and vertebral sources, anterior and posterior circulation, Circle of Willis connections, ACA/MCA/PCA segments, perforators, PICA, AICA, SCA, basilar supply, territories, and common variants.
- [Anatomy, Head and Neck: Cerebral Blood Flow](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19178/) (updated 2023-07-17) lists Circle of Willis components and describes autoregulation as keeping cerebral flow relatively constant across changing systemic pressure. This is a teaching principle, not a bedside target.
- [Neuroanatomy, Dural Venous Sinuses](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-20768/) (updated 2023-08-08) describes the sagittal, straight, transverse, sigmoid, cavernous, and superior petrosal sinuses and return through internal jugular veins, SVC, and heart.

Minimum educational graph: ICA -> ACA/MCA/anterior choroidal; vertebral -> PICA and basilar; basilar -> AICA, pontine branches, SCA, and PCA; ACom joins ACA; PCom links ICA and PCA. Keep arterial inflow, tissue or capillary proxy, and venous sinus return as different routes. Expose a variant or schematic label because the source describes hypoplasia, agenesis, duplication, and fenestration.

### Renal circulation and urine

- [Anatomy, Abdomen and Pelvis: Kidneys](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-28331/) (updated 2025-09-15) describes paired retroperitoneal kidneys, cortex and medulla, hilum, renal artery entry, renal vein and pelvis exit, and the vein anterior to the artery with the pelvis posterior to both.
- [Anatomy, Abdomen and Pelvis: Kidney Collecting Ducts](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19712/) (updated 2024-05-01) describes collecting ducts through calyces and renal pelvis. Urine must use a collecting-system route separate from renal blood particles.

Use separate channels for renal arterial inflow, tissue perfusion proxy, venous outflow, tubular or collecting-system flow, and urine through renal pelvis into ureter. A single red or blue vessel route cannot teach both blood and urine correctly.

### Cardiovascular, drugs, osmotherapy, and ventilation

- [Physiology, Cardiac Output](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-18897/) (updated 2023-07-17) describes CO and stroke volume and relates stroke volume to preload, contractility, and afterload.
- [Physiology, Cardiac Preload](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-27651/) (citation date 2022-09-26) describes preload as ventricular end-diastolic stretch or volume and explains EDV/ESV interpretation. Use a schematic Frank-Starling relationship; do not call a pressure-volume loop a Frank-Starling curve.
- [Surviving sepsis campaign 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8486643/) recommends norepinephrine first-line in septic shock, suggests vasopressin add-on for inadequate MAP on norepinephrine, and recommends an initial MAP target of 65 mmHg for the stated population. This supports intervention identity and ordering only.
- [Guidelines for the Acute Treatment of Cerebral Edema in Neurocritical Care Patients](https://pmc.ncbi.nlm.nih.gov/articles/PMC7272487/) (Neurocritical Care Society, 2020) discusses hypertonic sodium solutions and mannitol, rates key evidence low or very low, favors symptom-based rather than sodium-target dosing in SAH, and recommends monitoring renal function, sodium, and chloride.
- [Assist-Control Ventilation](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-17914/) describes tidal volume, respiratory rate, minute ventilation (VT x RR), FiO2, and PEEP.
- [Clinical review: Positive end-expiratory pressure and cardiac output](https://pmc.ncbi.nlm.nih.gov/articles/PMC1414045/) describes PEEP and intrathoracic pressure effects on venous return, RV output, LV filling, and LV output.

Do not enable numeric vasoactive dose-response until agent, concentration, route, time course, and effect calibration are supported by an explicit source and validation plan. Current evidence supports qualitative bounded effects, not simulator dosing. The reviewed cerebral-edema guideline includes examples around 7.2% and 23.5% sodium chloride, but does not establish universal 3%, 7.5%, or 23.4% protocols. Keep 3%, 7.5%, and 23.4% controls disabled or qualitative until concentration-specific sources and calibration evidence are reviewed. Show renal and electrolyte warnings without prescribing targets.

## Visualization and model rules

1. Represent anatomy as a named graph. Keep artery, capillary or tissue proxy, vein, sinus, ureter, and collecting-system routes distinct. Attach ACA, MCA, PCA, basilar, cerebellar, and perforator territory labels.
2. Treat tissue perfusion as a scalar teaching proxy. Animated particles in a trunk prove animation only; they do not prove capillary flow. Display the modeled quantity and units.
3. Give brain, lungs, and kidneys independent transparency state. Use an opaque shell, controlled alpha shell, and internal perfusion overlay. Use deliberate alpha render ordering and depth handling.
4. Keep brain venous drainage visible in brain view so blood does not appear to disappear at the tissue boundary.
5. Keep urine visually distinct from blood. Use collecting ducts -> calyces -> renal pelvis -> ureter and a legend separate from oxygenation colors.
6. Derive the Frank-Starling operating point from modeled preload, contractility, and afterload. Label the curve schematic and distinguish it from the LV pressure-volume loop.
7. Ventilator controls should expose mode, FiO2, respiratory rate, tidal volume, and PEEP where the selected mode supports them. Show modeled gas and hemodynamic responses together.

## Browser asset contract

Use GLB or glTF 2.0 with stable node names, normalized transforms, explicit pivots, and reused materials. For a dependency-free WebGL renderer, retain a narrow static GLB subset and validate before loading. Do not assume Three.js, React Three Fiber, Draco, KTX2, or external buffers are available.

- [Khronos glTF 2.0 specification](https://github.com/KhronosGroup/glTF/tree/main/specification/2.0) is the authoritative Khronos upstream source. It describes a JSON scene description plus binary resources, meshes, materials, hierarchy, and animations.
- [Blender 4.5 LTS glTF exporter](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) is the verified versioned exporter manual. The unversioned Blender URL returned 404 during research.
- [glTF Transform CLI](https://gltf-transform.dev/cli) documents validation and optimization functions such as prune and deduplication. Use only in the existing asset preparation workflow; do not add it as a runtime dependency.

## Provenance and licensing gate

The project organ GLB is sourced from BodyParts3D. Preserve source IDs and archive release in the manifest.

- [BodyParts3D database description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html) identifies a 3D human anatomy database and gives DOI 10.18908/lsdba.nbdc00837-000.
- [BodyParts3D 3.0 README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html) identifies the polygon-reduced 2011 archive materials.
- [Current BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) was retrieved with “Last updated: 2025/02/27” and states CC BY 4.0 plus required attribution: “BodyParts3D, (C) Database Center for Life Science licensed under CC Attribution 4.0 International.”
- [Historical CC BY-SA 2.1 Japan deed](https://creativecommons.org/licenses/by-sa/2.1/jp/) is the deed linked by existing project documentation. Its presence does not prove the terms attached to the downloaded 2011 archive.

Release gate: compare the exact downloaded archive, its release README, and the license applicable to that release. Until that comparison is recorded, describe the license as version-specific provenance under review. Do not distribute new derivatives with an assumed CC BY-SA 2.1 Japan or assumed CC BY 4.0 declaration.

## Validation expectations

- Check route topology, organ transparency isolation, urine-versus-blood identity, intervention bounds, curve operating-point directionality, and ventilator directionality.
- Check GLB parsing, stable names, valid indices and normals, normalized transforms, and transparent/opaque depth behavior.
- Test whole, brain, lung, and kidney views at desktop and narrow widths. Verify arterial and venous brain routes, urine outflow, curve, and ventilator response.
- Show approximation notices and source URLs with asset attribution in the model guide.

## Hard boundaries

Do not claim clinical validation, patient-specific anatomy, CFD hemodynamics, pharmacokinetics, dose safety, medical-device equivalence, or EHR integration. Label any anatomic or physiologic simplification.
