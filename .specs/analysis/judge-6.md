# Judge 6: Verification and Promotion Gate

## Verdict

**PASS — 4.3/5.0 (threshold 3.5). Promotion-ready: YES.**

The verification contract is appropriately evidence-led for a plan-only artifact. Numerical fixtures, deterministic replays, parser assertions, and executable build/test output control the decision; clinical or LLM opinion cannot override a failed source, calibration, or license gate. The remaining deductions are implementation-facing precision gaps (exact browser frame target and some fixture tolerances), rather than a planning blocker. No new implementation test run is required at this planning gate.

## Weighted scoring

| Criterion | Weight | Score | Weighted | Evidence and residual gap |
|---|---:|---:|---:|---|
| Verification-level appropriateness | 0.30 | 4.5 | 1.350 | Critical is reserved for the coupled model, provenance/assets, final regression, and browser evidence; high/medium levels have focused assertion or replay expectations. The contract also defines independent replay plus panel sign-off for critical work. Step 3's medium level is defensible because its mandatory state-mutation and calibration gates are explicit, though intervention safety could justify a high-level replay during execution. |
| Artifact-specific rubric quality | 0.30 | 4.3 | 1.290 | Twelve per-step artifact rows specify source ledgers, migration/finite guards, intervention byte-equivalence, CPP `1e-6`, deterministic convergence, topology/asset parser failures, opacity isolation, JSON/CSV atomicity, documentation scans, fresh command output, and real device/browser evidence. The strongest rows separate engineering tolerances from clinical validation. A few UI/browser assertions still refer to a documented target that must be named before implementation exit. |
| Thresholds and mandatory gates | 0.20 | 4.2 | 0.840 | Critical panels require `>=4.2/5`; other panels require `>=4.0/5`; each row retains four component scores with weights summing to 1.00, and missing source/calibration/license gates are automatic failure regardless of score. Exact identities use `1e-6`, while balance/integral/time-step tolerances are required to be documented and source-reviewed. Exact FPS/update thresholds remain deferred to the supported baseline. |
| Complete 12-step coverage and write graph | 0.20 | 4.2 | 0.840 | Raw inspection confirms twelve decomposition rows (Steps 1–12) and twelve verification dispositions are required. The dependency graph reaches every step. Judge 5's corrections are now explicit: Step 2 starts only after Step 1 contract handoff; Step 4 is owned by one executor/test-engineer lane after the Step 3 physiology handoff and before metric-dependent Steps 7/9. Shared `src/physiology.js`, manifest/tests, and app/style integration are called out for serialization or isolated fixtures, so no concurrent write overlap is left as an unaddressed gate. The old Wave A enumeration remains readable but is superseded by the ownership-correction paragraph and should be treated as a documentation cleanup item. |
| **Total** | **1.00** |  | **4.320 → 4.3/5.0** | `(4.5 × 0.30) + (4.3 × 0.30) + (4.2 × 0.20) + (4.2 × 0.20) = 1.350 + 1.290 + 0.840 + 0.840 = 4.320`. |

## Genuine blockers

None for promotion of the plan. Before implementation completes, name the supported browser/device FPS target and finalize the documented engineering tolerances for volume balance, integrals, and time-step convergence. Preserve the mandatory source/calibration/license gates and the corrected Step 1 → Step 2 → Step 3 → Step 4 handoff sequence.

## Evidence anchors

- `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md:116-129` — twelve owned decomposition rows.
- `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md:138-150` — dependency gates, waves, and shared-file serialization.
- `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md:152-165` — complete dependency graph.
- `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md:170-172` — Step 2 gate and concrete Step 4 ownership correction.
- `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md:174-195` — levels, weighted rubric, artifact-specific checks, thresholds, numerical precedence, and twelve-row reporting requirement.
