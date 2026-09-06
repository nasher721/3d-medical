# Phase 4 decomposition scratchpad

Task: `anatomic-multiorgan-icu-simulator.feature.md`

Evidence anchors: [skill](../../.claude/skills/multiorgan-simulation/SKILL.md), [analysis](../analysis/analysis-anatomic-multiorgan.md), [architecture judge](../analysis/judge-3.md).

Critical path: evidence/provenance and calibration gates -> v2 schema/validation -> intervention registry -> coupled physiology -> named anatomy and asset validation -> per-organ renderer -> app/UI -> monitors and persistence -> docs -> build/tests -> browser QA.

The 12 steps in the task decomposition assign ownership for `src/content.js`, `src/styles.css`, `README.md`, `scripts/build.js`, `assets/organs/*`, `src/organ-assets.js`, and each existing test file. Hypertonic 3%, 7.5%, and 23.4% controls stay disabled until concentration-specific calibration records are source-reviewed. BodyParts3D derivatives stay blocked until exact archive, README, and applicable license are compared. Code-owned schematic routes are the fallback.

Definition of Done: all task acceptance criteria, `npm test`, `npm run check`, `npm run build`, deterministic replay and identity tolerance evidence, validated JSON/CSV round trips, and desktop/narrow browser checks with explicit educational-approximation language and no clinical validation claim.
