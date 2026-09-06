# Phase 3 architecture synthesis

## Decision

Extend the current dependency-free native WebGL/ES-module architecture with a versioned semantic simulation state and named route graph. Keep model, renderer, monitors, metadata, content, and DOM adapter ownership in their existing modules; add no runtime dependency. Use local GLB only for provenance-verified surfaces/internal meshes, while code-owned semantic route data provides testable vessel topology and keeps the narrow GLB parser contract stable.

## Evidence and boundaries

- `src/physiology.js:8-19,45-82,103-151` owns defaults, limits, bounded target metrics, fixed relaxation, mutation validation, and reset. Existing identities include CO, MAP, SV/EDV/EF, CPP, oxygen content, DO2, `brainFlow`, and `renalFlow`.
- `src/anatomy.js:72-78,120-147,178-208` owns native WebGL assets, procedural routes, particles, one global `transparent` layer, and route-local flow scaling. Current brain routes are not a canonical Circle-of-Willis graph.
- `src/organ-assets.js:96-163` is the narrow local GLB parser/loader; tests already cover malformed headers, indices, normals, and fetched assets.
- `src/monitors.js:17-45` renders trends and an illustrative LV pressure-volume loop; a Frank-Starling view must be a different, model-backed data contract.
- `src/app.js:17-81,130-145` owns DOM composition, RAF timing, layer routing, session v1 export/import, and local persistence.
- `.specs/analysis/analysis-anatomic-multiorgan.md:9-55` identifies the cross-module surface, current global transparency, renal-output gap, missing named cerebral topology, monitor terminology gap, v1 persistence risk, and rendering/provenance risks.
- `.claude/skills/multiorgan-simulation/SKILL.md:14-78` requires the minimum cerebral graph, separate blood/urine paths, independent transparency, schematic Frank-Starling labeling, volume-control ventilation, GLB stability, and asset-license/version gates.

## Contracts to carry into decomposition

1. **State:** `schemaVersion: 2`; validated interventions/calibration records; independent organ opacity; explicit ventilator object; finite metrics/history.
2. **Units:** CO `L/min`; cerebral flow `mL/100 g/min`; renal perfusion `mL/min`; urine output `mL/h`; CPP/MAP/ICP `mmHg`; SV/EDV `mL`; ventilation units as specified by the task. No unit aliases or GFR wording.
3. **Solver:** fixed `1/30 s` substeps, 60 s per-call safety ceiling, 1 s history sampling, shared clock, explicit input -> cardiovascular -> ventilator -> ICP/CPP -> cerebral -> renal perfusion -> bounded filtering transition -> urine -> derived curve order; same forward SV drives Frank-Starling operating point.
4. **Anatomy:** named ICA/ACA/ACom/MCA/PCA/PCom/basilar/vertebral graph, venous sinuses, ACA/MCA/PCA territory endpoints, schematic capillary labels, separate renal collecting system, no artery-to-urine route.
5. **Rendering:** per-organ opacity with depth-safe translucent pass; tissue and low-flow cues remain visible; stable GLB manifest names/transforms; unresolved BodyParts3D provenance blocks derivative release.
6. **Persistence:** v1 migration to v2 defaults; validation and calibration gating on import; unit-bearing CSV columns for new outputs.
7. **Verification:** exact identity tolerance `1e-6`, finite/deterministic replay, directional margins, graph/asset checks, opacity isolation, import migration, and browser compositing/layout checks.

## Deliberate tradeoffs

- A semantic route graph is more inspectable and testable than embedding all topology in a large asset, but it remains schematic and must be labeled as such.
- Fixed substeps improve replay reproducibility and cross-view synchronization, at the cost of an accumulator/catch-up policy for background tabs.
- Calibration gating prevents unsupported numerical claims and may leave hypertonic controls disabled until records are reviewed; that disabled state is part of the release contract.
- Keeping existing flat metric identities minimizes migration risk, while the new typed groups/units require explicit export and documentation updates.
