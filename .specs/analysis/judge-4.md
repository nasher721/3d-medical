# Judge 4 — Implementation Process / Decomposition Readiness

Artifact reviewed: `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md`, Phase 4 decomposition (lines 112–133).

## Verdict

**PASS — 4.1/5.0, above the 3.5 threshold.** The decomposition is implementation-ready at the planning level: it has 12 ordered rows, explicit file ownership, concrete outputs, dependency gates, and a critical path. A few numerical and browser-evidence contracts still need to be made more objective during implementation planning.

## Integrity evidence

To avoid display-compression artifacts, the source was inspected through `rtk proxy python3`. The table header is line 116 and separator line 117. Each claimed data row 1–12 is present at lines 118–129; every row has exactly 6 pipe delimiters, 5 cells, and these raw lengths: `541, 407, 484, 493, 452, 496, 437, 429, 432, 424, 444, 475` bytes/chars respectively. The earlier apparent truncation was terminal output compression, not file damage.

## Weighted scoring

| Criterion | Weight | Score | Weighted | Evidence / remaining gap |
|---|---:|---:|---:|---|
| Step quality | 0.30 | 4.2 | 1.26 | Steps 1–12 progress evidence gates → schema → calibration → coupled model → anatomy/assets → rendering/UI → monitors/docs → regression/browser verification. Owners and paths are named per row, and the critical path is explicit. Step 11/12 are verification-heavy but appropriately downstream. |
| Success-criteria testability | 0.25 | 3.9 | 0.975 | Strong checks include `1/30 s`, `60 s`, `CPP = MAP - ICP` within `1e-6`, finite/bounded outputs, deterministic replay, machine-testable anatomy labels/connectivity, `<=250 ms` updates, migration/gating, npm commands, and browser console/layout checks. Remaining gaps are canonical baseline values, solver/directional margins, exact frame-rate target, and a named browser automation/evidence format. |
| Risk coverage | 0.25 | 4.2 | 1.05 | Covers calibration/source/license gates, dose-like copy, v1 persistence drift, disconnected metrics, graph provenance, GLB validation, GPU/draw-call cost, WebGL compositing, invalid-state retention, unit drift, accessibility, and device-specific residual risk. Some risks lack a named escalation owner, but the relevant step and blocker are generally clear. |
| Completeness | 0.20 | 4.1 | 0.82 | All architecture components are represented: physiology, anatomy, monitors, UI, app, styles, content/docs, assets/parser/preparation, build/check/dist, existing tests, and browser verification. Persistence, imports/exports, prior vasoactive behavior, responsive layout, and educational boundary all have a home. A dedicated DOM/integration test path remains intentionally dependent on the current Node-only test strategy. |
| **Total** | **1.00** |  | **4.105 → 4.1/5.0** |  |

Weighted arithmetic: `(4.2 × 0.30) + (3.9 × 0.25) + (4.2 × 0.25) + (4.1 × 0.20) = 1.260 + 0.975 + 1.050 + 0.820 = 4.105`, reported as **4.1/5.0**.

## Ordered goals, outputs, subtasks, blockers, and risks

| Order | Goal / output | Testable subtask or evidence | Blocker / risk |
|---:|---|---|---|
| 1 | Evidence gates in docs/content/asset records | Dated direct sources, approximation boundary, calibration schema, exact BodyParts3D archive/license comparison | Missing source or unresolved license blocks derivatives; avoid clinical/licensing claims |
| 2 | V2 schema and validation in `src/physiology.js` | Migration, units/bounds, finite guards, fixed stepping and ceiling; preserve lifecycle identities and last valid state | V1 persistence/control drift |
| 3 | Intervention registry in physiology/UI | Five named vasoactives plus gated 3%/7.5%/23.4% records; preserve norepinephrine/dobutamine units; reject unreviewed hypertonic state | Step 1 review; dose-like or unsupported effects |
| 4 | One coupled physiology model | `CPP` identity, finite bounds, deterministic replay, directional margins, urine `mL/h`, Frank-Starling series | Disconnected metrics; numerical baselines/margins need exact values |
| 5 | Named anatomy graph | Machine-test required arteries, venous return/sinuses, territories, capillary labels and separate urine collection | Source/asset gate for mesh; stable labels/topology |
| 6 | Asset pipeline/provenance | Parser tests reject bad extensions, external buffers, indices, normals, bounds, transforms; manifest attribution precedes distribution | Provenance and GPU/performance failure |
| 7 | Per-organ rendering | Migrated brain/lung/kidney opacity isolation, route/overlay labels, renal calyx→pelvis→ureter→outlet, depth passes, no blood-particle reuse | WebGL compositing/draw calls require browser proof |
| 8 | UI/app adapter | Bounded volume-control UI, validation, views, clock, pause/resume/reset, <=250 ms refresh and frozen pause | Rapid toggles and invalid-state handling |
| 9 | Monitors/exports | Frank-Starling operating point derives from model; v2 JSON/CSV round trips, units, migration, calibration clearing/rejection | Unit drift; test surface for DOM panels needs selection |
| 10 | Educational docs/content | PBW, equations, cadence, bounds, assumptions, sources, schematic boundaries and clinical exclusion; labels/units/approximation notice | Prevent patient-specific, dosing, GFR/clearance, validation framing |
| 11 | Build/regression verification | `npm test`, `npm run check`, `npm run build`; dist and four existing test files; prior import/export and vasoactive behavior | Generated output and evidence recording must remain synchronized |
| 12 | Browser/responsive verification | Desktop/narrow whole and organ views, labels, depth, live/pause/reset/error flows, console/runtime and frame/update checks | Device-specific GPU behavior remains residual; no clinical validation claim |

## Architecture coverage and handoff blockers

The rows cover the architecture’s existing dependency-free ES modules: physiology owns validated deterministic state and metrics; anatomy owns WebGL shells/routes/particles/labels/compositing; monitors own canvas plots; UI owns control metadata; app owns DOM, clock, display, migration, persistence, and exports. Content/docs/README own the educational boundary; styles own responsive layout; manifest/README/preparation/parser own asset provenance and narrow GLB validation; scripts/dist and the four existing test files own build/regression evidence; step 12 owns browser verification.

Before execution, make four planning contracts explicit: canonical baseline values; solver tolerance and directional margins for deterministic replay; exact venous labels/topology assertions; and the browser test/evidence mechanism plus frame-rate target. These are nonblocking for decomposition readiness because the rows identify where they belong, but they are implementation exit criteria rather than safe assumptions.

## Definition of Done

All 12 row criteria pass with recorded evidence; `npm test`, `npm run check`, and `npm run build` pass; browser checks cover desktop/narrow WebGL and error/pause/reset flows; JSON/CSV round trips preserve units and migration/gating behavior; deterministic replay evidence exists; prior norepinephrine/dobutamine interactions/import/export/persistence remain green; documentation states the simulator is an educational approximation without clinical validation; no new dependency or clinical claim is introduced.

## Final verdict

**4.1/5.0 — PASS.** No decomposition blocker. Resolve the four explicit numerical/browser evidence contracts before implementation begins, and preserve the calibration and asset provenance gates as release prerequisites.
