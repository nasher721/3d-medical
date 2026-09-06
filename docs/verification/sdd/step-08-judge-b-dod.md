# Step 8 independent judge B — DoD remediation

Date: 2026-09-05. Threshold: 4.0/5. CLAUDE_PLUGIN_ROOT unset; task rubric used. Code read-only; no other judge consulted. This reviewer authored the label overlay, not the reset/restore/numeric handlers evaluated here.

## Evidence

`node --test tests/app-handlers.test.js` passed 6/6. These tests execute extracted production function bodies with actual physiology/UI modules and substitute browser surfaces; they do not reimplement handler logic.

Independent probes used the same production handler loader with different values: all five agents `.27/7/.61/.13/.89`, RR31, VT9, FiO2 88, PEEP17 survived saveLocal→new state→loadLocal. After advancing9s and capturing baseline, reset exactly matched a fresh canonical state's metrics, history, Frank-Starling object and ventilator cycle; baseline, monitor baseline/cursors and button cleared. Thirty-eight paused frame calls preserved model, breath snapshot, regional metrics and history. Existing actual-handler tests confirmed direct invalid-input feedback and decimal opacity pairing/isolation.

A fresh IAB replay was attempted but provider returned `Browser is not available: iab`. No browser flow is claimed by this judge. The production-handler failure below is independently reproducible without browser automation.

## Mandatory failing finding

`restoreSetup` (`src/app.js:194`) reconstructs a reduced `imported` object before validation. Unknown envelope keys and unknown `visual` keys are discarded rather than rejected. A valid serialized session with `unknown:1` is accepted and replaces the active state; `visual:{opacity:valid,unknown:1}` is also accepted. `metrics:{...validMetrics,co:Infinity}` is accepted because metrics are omitted from validation. These are failures of the requested strict unknown/non-finite import contract, even where ignored metadata does not enter the solver.

Independent matrix:

| Mutation | Rejected | Byte-equivalent state preserved |
|---|---|---|
| Unknown root key | NO | NO |
| Unknown visual key | NO | YES (same settings happened to be active) |
| Unknown patient key | YES | YES |
| Unknown vasoactive key | YES | YES |
| Non-finite metric | NO | YES (same settings happened to be active) |
| Non-finite vasoactive input | YES | YES |

Fix: validate the full session envelope and nested object allowlists/non-finite values before constructing or committing replacement state. Retain supported metadata keys explicitly. Add rejected-import regression cases and replay this focused matrix.

## Gates and scores

Five-agent/ventilator restore, legacy opacity defaults, canonical baseline reset, direct numeric feedback, opacity pairing/defaults, and pause freeze: **PASS**. Strict unknown/non-finite atomic import rejection: **FAIL**.

| Criterion | Weight | Score | Evidence-based rationale |
|---|---:|---:|---|
| Behavioral correctness | .35 | 4.30 | Ordinary handler paths pass; invalid-envelope import can reset active state. |
| Numerical/contract correctness | .25 | 3.50 | Strict import validation is incomplete despite correct supported numeric paths. |
| Safety/educational boundary | .20 | 4.30 | Educational/calibration boundary retained; trust-boundary validation incomplete. |
| Reproducible artifact evidence | .20 | 4.55 | Actual production-handler matrix and extended reset/pause checks reproduced. |

Weighted overall: **4.15/5 — FAIL (mandatory gate)**. Score cannot waive required rejection. No DONE marker changed.
