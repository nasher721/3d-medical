# Step 8 final DoD remediation

2026-09-05. Implementation evidence; independent judge confirmation pending.

## Changes and regression sequence

Owned app reset/restore/validation handlers, three UI opacity metadata records, and `tests/app-handlers.test.js`. No unrelated source or other agents' label edits changed.

Added actual-handler tests first: v2 five-agent round trip failed on `mode`; captured-baseline reset failed on stale button text. Tests load production function bodies from app.js into an isolated VM with actual physiology/UI modules, substituting only DOM/browser surfaces. They do not duplicate implementation logic.

- V2 restore now excludes the already-validated mode string before numeric control iteration. All five vasoactive settings and VC parameters survive serialization, local save/load and file import. Malformed input retains byte-equivalent active state.
- Restart calls existing `clearBaseline`, resets monitor cursors, draws canonical model immediately, and restores label visibility. Imported setups also clear comparison labels.
- Opacity numeric commits reject blank/nonnumeric/non-finite/out-of-range values. Valid number/range edits synchronize both controls, retain two decimals and isolate peers. Model visual state mirrors layers. All three metadata defaults now equal 1, matching startup/createSimulation, reset and legacy defaults.

## Verification

`node --test tests/app-handlers.test.js`: **6/6 PASS**. Covers actual serialization→restore/file import, legacy defaults, invalid opacity/mode/calibration rejection, repeated captured-baseline reset, direct numeric feedback, paired opacity controls and actual animation-frame pause/resume.

`npm test`: **59/59 PASS**; raw output `step-08-dod-tests.log`. `npm run check` and `npm run build` also passed.

Native Chrome at localhost:5188 independently replayed five-agent save→reload→restore: visible norepinephrine .2, dobutamine 5, epinephrine .3, phenylephrine .4, vasopressin .5, with successful restore message. Capture→Restart showed 00:00/live, zero agents/events, Capture baseline and no comparison deltas. Display after reset showed all opacities 1. Entering brain .35 updated both number/range to .35 while lung/kidney remained 1; blank retained .35 with explanatory dialog feedback.

No new dependencies, calibration claims or DONE markers. Test-only browser substitutes do not replace the later full responsive/browser gate.


## Import-envelope addendum

2026-09-05: `validateSessionEnvelope` now checks the complete supplied object before projecting restoration fields. Explicit supported root keys match existing v1/v2 exports; unknown root, visual, layer and opacity keys fail. Patient, vasoactive and ventilator keys still use the shared model validator. Optional schema version, speed, view, color, timestamp and description metadata are checked; recognized archival metrics/baseline/history must contain finite numeric records and events must contain finite nonnegative time plus text label.

Finite recorded measurements are retained only in the export and never restored as live state: an independent production-handler fixture supplies archived CO=1234/history time500 and verifies a fresh baseline model/time0/events-empty. Null, string and non-finite metric values are rejected rather than silently discarded. Unknown root/visual/patient/vasoactive/ventilator/layer, incomplete/unknown/non-finite opacity, invalid mode/calibration, conflicting schema and NaN/Infinity archival fixtures all reject before mutation, checked against byte-equivalent prior model/display state.

`node --test tests/app-handlers.test.js`: **7/7 PASS**. Full `npm test`: **60/60 PASS**, raw log `step-08-envelope-tests.log`. `npm run check` and `npm run build` pass. Existing five-agent/VC round trip, valid file import, legacy defaults, repeated reset, opacity synchronization and pause/resume remain covered. Source frozen for independent recheck; no DONE marker changed.
