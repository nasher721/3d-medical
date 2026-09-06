# Business Analysis Scratchpad: Improve anatomic accuracy and expand multiorgan ICU simulator

Task: `.specs/tasks/draft/anatomic-multiorgan-icu-simulator.feature.md`
Created: 2026-09-05

---

## Phase 1: Requirements Discovery

### Task Overview
- Initial request: improve vessel anatomy; show brain, lungs, and kidneys transparently so tissue perfusion is visible; add renal urine outflow; add vasopressor and hypertonic-solution options; live intracerebral flow; Frank-Starling curve; and live ventilator simulation.
- Current description: educational 3D ICU simulator, with explicit exclusion of clinical decision support, patient-specific recommendations, EHR/device integration, and claims of clinical validation.
- Task type: feature; complexity XL because it crosses anatomy, visualization, time-dependent physiology, interventions, and two interactive teaching views.

### Problem Definition
1. Surface request: add more anatomically faithful, inspectable organ and vessel visualizations plus interactive cardiovascular, cerebral, renal, and respiratory teaching controls.
2. Intended outcome: learners can connect interventions and ventilator settings to visible, bounded changes in modeled flow, tissue perfusion, cardiac performance, urine outflow, and respiratory variables.
3. Business/teaching value: the simulator should make physiology observable and reversible, supporting exploration and explanation rather than presenting opaque numeric outputs.
4. Primary actor: an educator or learner operating an adult educational simulation. Secondary actors are reviewers who need labels, units, reset/pause behavior, and documentation to make demonstrations reproducible.
5. Immediate scope: canonical adult anatomy with labeled major intracranial vessels, schematic tissue capillary beds, organ transparency, renal outflow, a small curated intervention set, cerebral-flow dynamics, Frank-Starling visualization, and a bounded live ventilator panel. Future scope may include additional pathologies, modes, drugs, validated patient data, and device/EHR connectivity.
6. Constraints: anatomy must be described as canonical/schematic where microscopic detail is abstracted; effects are modeled approximations; units must be explicit and internally consistent; controls must be safe for an educational simulator; existing functionality and persistence must continue working; no new dependencies or imaginary engine requirements are assumed.

Root problem: the current teaching model does not let a learner inspect anatomically meaningful circulation and see how selected physiologic inputs propagate through organs and coupled ICU variables.

### Scope and Ambiguities
- Included: the visual and interactive behaviors stated above, bounded first-release controls, labels/units, pause/reset, invalid-input handling, and regression documentation/tests.
- Excluded: diagnosis or treatment advice, patient-specific predictions, clinical decision support, real patient/device/EHR data, drug dosing recommendations, anatomically exhaustive microvasculature, and clinical validation claims.
- Ambiguities resolved by defaults below: “sterling” means Frank-Starling; “various” means a named, finite preset list; “live” means deterministic time-stepped updates while simulation is running; transparency is per organ and does not require arbitrary material authoring.

## Phase 2: Concept Extraction

### Concepts
- Actors: learner/educator; simulator runtime; accessibility/documentation reviewer.
- Behaviors: inspect, toggle transparency, select intervention, change bounded ventilator controls, run/pause/reset, observe coupled outputs, read labels and units.
- Entities: brain, lungs, kidneys, major intracranial arteries/venous structures, schematic tissue beds, renal pelvis/ureter/bladder outflow path, cerebral flow state, cardiovascular state, Frank-Starling curve, ventilator state, intervention preset.
- Constraints: canonical adult educational model; separate organ visibility controls; no unsupported input accepted; deterministic behavior under a fixed reset and input sequence; no silent state loss on pause or view changes.
- Implicit assumptions requiring validation: current simulator has an existing render/update loop and persistent settings/state; current units can be extended without breaking existing displays; the target viewport can render transparency and flow overlays acceptably.

### First-release defaults
- Anatomy: canonical adult circulation, labeled major vessels and circle-of-Willis connections, with explicit “schematic capillary bed” labeling where detail is abstracted.
- Interventions: preserve existing norepinephrine and dobutamine controls and semantics (`µg/kg/min`); add a finite selectable preset set of epinephrine, phenylephrine, and vasopressin where supported. Hypertonic solutions use explicit 3%, 7.5%, and 23.4% concentration labels and a displayed conceptual delivery input in mL per simulated minute, with a bounded range and no implied bedside dose recommendation.
- Dynamics: one deterministic educational model with a visible simulation clock and a fixed update cadence/step size documented in the UI/help text or task documentation. Effects may use first-order transitions rather than instantaneous jumps.
- Ventilation: first release covers a single adult lung model with adjustable respiratory rate, tidal volume or pressure target (one selected control mode), FiO2, and PEEP, plus live displayed pressure/volume/oxygenation proxies. Full ventilator mode catalog, gas exchange disease models, alarms, and waveform export are out of scope.
- State: pause freezes all modeled state and clock; resume continues; reset restores canonical baseline, default transparency, no active intervention, and default ventilator settings. View toggles alone do not reset physiology.

## Phase 3: Requirements Analysis

### Requirement-to-test mapping
1. Anatomy: compare required named structures and connections against an approved canonical anatomy checklist; no “accurate” criterion can rely on visual opinion alone.
2. Transparency/perfusion: toggle each organ independently and assert visibility/material state plus a visible flow path entering tissue; toggling one organ must not alter the other two.
3. Kidney: assert continuous labeled path from renal perfusion through nephron/collecting representation to ureter/bladder outlet; urine output must have a unit and respond to modeled state.
4. Interventions: assert only supported presets are selectable, controls are bounded, current selection/intensity is visible, and reset removes the intervention.
5. Time course: from reset, use a fixed input sequence and assert outputs change in the documented direction within the documented settling window, remain finite, and return to baseline after reset.
6. Cerebral dynamics: display MAP/ICP/CPP and cerebral-flow proxy with units and a visible relationship (CPP = MAP - ICP where those variables are used); changes must update while running and stop while paused.
7. Frank-Starling: plot axes/units, current operating point, and curve; changing preload/contractility/afterload or an intervention moves the operating point according to the documented model, without claiming patient calibration.
8. Ventilator: controls update live waveforms/values with coherent units; invalid/unsupported combinations are rejected or clamped with an explanatory message; pause/reset semantics match the global simulator.
9. Regression: existing simulator flows, import/export or persistence behavior, and baseline rendering remain available and pass focused regression checks.

### Non-functional requirements
- Accessibility: every control and visualization has a text label, unit, and non-color-only state indicator; flow must remain distinguishable in transparent mode.
- Performance: live views remain interactive at the existing simulator target frame rate on the supported baseline device; no new dependency is introduced.
- Safety/content: labels and documentation identify the model as educational approximation and state that it is not for clinical decisions; no output is phrased as a patient-specific recommendation.
- Consistency: all quantities use one documented unit system; conversions, rounding, and displayed precision are consistent across controls, charts, and overlays.

### Error and boundary cases
- Unsupported intervention or ventilator mode is absent/disabled and cannot mutate state.
- Out-of-range numeric input, blank input, NaN/Infinity, and conflicting mode settings produce a bounded validation message and preserve the last valid state.
- Rapid toggling of transparency, repeated pause/resume, reset during an active effect, and switching views while running do not throw, leak state, or desynchronize clock and displayed outputs.
- Zero/near-zero flow and high simulated ICP must remain finite and visually distinguishable; the model must clamp at documented safety bounds rather than produce negative nonsensical urine/flow values.
- Browser refresh or existing persistence/import paths must retain only supported persisted state and must not restore stale active interventions in a way that bypasses validation.

## Phase 4: Draft Output

### Refined description direction
Build a bounded, reversible adult educational ICU physiology experience that combines canonical labeled circulation with inspectable organ perfusion. Learners can independently make the brain, lungs, and kidneys transparent, follow schematic blood flow into tissue, and trace kidney urine outflow. They can then select supported conceptual vasopressor/hypertonic presets and adjust the live ventilator panel to observe time-dependent changes in cerebral flow, organ perfusion proxies, urine output, cardiovascular performance, and respiratory displays.

The feature must make the model’s limits visible: anatomy is canonical and schematic at capillary scale, physiology is an educational approximation, units and equations are disclosed, and no result is a clinical recommendation. First release is a single adult baseline scenario with deterministic updates, bounded controls, pause/resume/reset, validation feedback, and regression coverage for existing simulator functionality.

### Acceptance criteria draft
The task file is updated with 17 functional criteria, 5 non-functional criteria, explicit scenarios, scope, assumptions, and definition of done. Criteria use pass/fail observations and fixed sequences rather than subjective claims.

## Self-Critique

### Verification Results
| Question | Result | Evidence |
|---|---|---|
| Requirements completeness | COMPLETE | Anatomy, three organ views, renal outflow, two intervention classes, cerebral flow, Frank-Starling, ventilator, timing, controls, and regression are covered. |
| Scope clarity | COMPLETE | First-release defaults and explicit exclusions bound anatomy, interventions, ventilation, and clinical use. |
| Acceptance testability | COMPLETE | Criteria specify named structures, units, fixed sequences, pause/reset, bounded inputs, and observable outcomes. |
| Business-value traceability | COMPLETE | Each feature supports inspectable, reversible physiology teaching. |
| Implementation independence | COMPLETE | Requirements avoid framework, engine, API, and dependency choices. |

### Gaps and revisions
- Anatomy “accuracy” needed a test oracle: added named-structure/checklist requirement and schematic-capillary labeling.
- “Various” interventions needed a finite boundary: added curated preset list with UI exposure limited to implemented presets.
- “Live” and effects needed timing semantics: added deterministic clock/update behavior, pause/resume/reset, and settling-window verification.
- “Sterling” ambiguity needed resolution: interpreted as Frank-Starling and required explicit labeled curve.
- Clinical-risk language needed operational guardrails: added educational approximation labels, no recommendations, and bounded non-prescriptive controls.
- Ventilator request needed first-release bounds: selected one adult model and limited controls/waveforms while excluding full mode catalog and alarms.

### Judge 2c Revision (3.54/5.0 feedback)
- Replaced the generic vessel checklist with explicit bilateral internal carotid, anterior cerebral, anterior communicating, middle cerebral, posterior cerebral, posterior communicating, basilar, vertebral, and venous return/sinus structures.
- Locked hypertonic scope to exactly 3%, 7.5%, and 23.4% presets with a 0–500 mL per simulated minute conceptual input; preserved the no-dosing-advice boundary.
- Locked the ventilator release to volume-controlled mode with explicit bounds: RR 6–35 /min, tidal volume 4–10 mL/kg PBW, FiO2 21–100%, PEEP 0–20 cmH2O. Pressure-control and other modes are excluded.
- Defined validation semantics: range sliders clamp to the nearest bound; direct invalid/conflicting/nonfinite text input rejects and preserves the last valid state; unsupported options are unavailable.
- Added a measurable UI behavior: dynamic values refresh at least every 250 ms while running and stop while paused. Repeated-run solver tolerance remains an architecture-defined gate to avoid inventing numerical implementation details in business requirements.

### Final Judge Revision
- Reconstructed the task file as clean Markdown after malformed merged lines were detected; every scenario and acceptance criterion is now a separate readable item.
- Removed the arbitrary universal hypertonic volume range. The three requested concentration labels remain, but each is disabled until a source-reviewed calibration record defines conceptual units, time basis, bounds, and modeled effect.
- Made volume-controlled ventilation and PBW meaning explicit, retained the existing displayed bounds, and separated business requirements from architecture-owned solver tolerances.
- Final cleanup verification confirms one occurrence each of all required section headings, three complete scenarios, 17 functional criteria, 5 non-functional criteria, and no merged-line corruption markers.
