# Judge 5 — Parallelization and Execution Readiness

## Verdict

**PASS — 3.8/5.0, above the 3.5 threshold.** The specification has an evidence-backed dependency graph, explicit gates, wave ownership, and a clear mandatory execution rule. Two sequencing details require correction before execution: Step 4 has no wave owner, and Step 2 is shown in Wave A alongside the Step 1 contract gate it depends on.

## Weighted scoring

| Criterion | Weight | Score | Weighted | Evidence / gap |
|---|---:|---:|---:|---|
| Dependency accuracy | 0.35 | 3.8 | 1.330 | The Mermaid graph correctly routes 1→2→3→4→7→9→10→11→12, with 5/6 joining 7 and 8 feeding 9. The prose correctly gates calibration/source review, contracts, derived meshes, metric-dependent UI, and final verification. Deduction: Step 4 is omitted from all named wave ownership despite being a required predecessor of 7 and 9; Step 2 is listed beside Step 1 even though Step 1 contract findings gate Step 2. |
| Parallelization maximized | 0.30 | 3.4 | 1.020 | Valid independent work is exposed: Step 8 can use disabled placeholders while evidence is unresolved, and Steps 5 and 6 have disjoint ownership after applicable gates. Shared `src/physiology.js`, `src/app.js`, `src/monitors.js`, manifest, and tests are explicitly serialized. Deduction: the missing Step 4 lane makes the proposed waves incomplete, and the Wave A Step 1/2 pairing cannot be launched concurrently under the stated gate. |
| Agent selection | 0.20 | 4.2 | 0.840 | Role choices fit the work: researcher/architect for evidence, executor/test-engineer for model and intervention work, executor for anatomy/assets, designer for UI/browser concerns, planner/executor for documentation, and verifier/test-engineer for release checks. Slash-separated alternatives are somewhat ambiguous about which concrete agent is launched, and Step 4 lacks a selected owner. |
| MUST execution directive | 0.15 | 4.4 | 0.660 | Phase 5 explicitly says the coordinator **MUST** launch only independent steps per wave, preserve gates, and keep one owner for shared files. It also states final verification follows the merged Steps 7–10 and browser fixes return to the owning lane before verification reruns. The directive is strong, but the unassigned Step 4 leaves one required execution path underspecified. |
| **Total** | **1.00** |  | **3.850 → 3.8/5.0** | `(3.8 × .35) + (3.4 × .30) + (4.2 × .20) + (4.4 × .15) = 1.330 + 1.020 + 0.840 + 0.660 = 3.850`. |

## Dependency and merge findings

- **Actual blocker before launch:** assign Step 4 (coupled physiology) to a concrete owner/wave after Step 3 and before Step 7/9. Its outputs include CPP, cerebral flow, urine, Frank-Starling, and ventilator dynamics, so it cannot be silently skipped or treated as part of Step 2.
- **Gate correction:** launch Step 2 only after Step 1 produces the contract findings required by the gate, or split Step 1 into independently launchable evidence and contract substeps with an explicit handoff.
- **Merge path is otherwise adequate:** complete Steps 3–6 under their gates, then merge the single-owner Step 7 renderer, Step 9 monitor/export integration, and Step 10 docs; run Step 11 checks (`npm test`, `npm run check`, `npm run build`) and recorded browser QA in Step 12. Shared-file changes and browser fixes are routed back to owners before the verification rerun.

## Acceptance checks for the parallel plan

1. Every Step 1–12 row appears exactly once in a wave/serialized sequence and has one concrete owner.
2. No wave launches a step before its stated evidence, contract, calibration, metric, or terminology gate.
3. Concurrent lanes have disjoint write ownership; shared files have an explicit serialization or isolated-fixture rule.
4. The final merge order produces a single verification pass after Steps 7–10, followed by browser evidence and any owner-routed fix reruns.
