# Flowstate design and delivery plan

Build a dependency-free, local-first ICU teaching application from the complete workstation concept in `assets/design-concept.png`.

## Visual system

Ink background #080e17; panels #101a27; divider #263344; primary text #edf3f9; secondary #92a2b6; mint accent #5de6c1; arterial coral #ff716e; venous blue #63aaff. System sans-serif typography and tabular monospaced physiological measurements. UI type 12–14px, panel headings 16px, brand 20px, monitor values 36px. Hairline rails, 6–10px radius controls, 8px spacing scale. Header 64px, session bar 62px, 230px explorer, flexible 3D center, 310px intervention inspector, 205px bedside strip. Compact laptop responsive layout and stacked mobile layout.

## Components and visible copy

Header: FLOWSTATE; Simulator, Scenarios, Learning lab; Model guide, Export session. Session: scenario selector, description, live/paused status, elapsed time, pause/play, simulation speed. Explorer: Whole circulation, Heart, Lungs, Brain, Kidneys, Systemic vessels. Layers: Blood particles, Organ labels, Vessel network, Translucent organs. Inspector: Interventions; Vasoactive, Fluids, Ventilation; Norepinephrine, Dobutamine; Reset interventions. Monitor: ECG II, Arterial pressure, Oxygen saturation, Cardiac output, Central venous pressure, Systemic vascular resistance.

Functional additions required by the teaching scope: Patient settings; Cerebral intervention tab; physiological color mode and camera controls; Waveforms, Trends, Pressure–volume tabs; scenario library with eight states; learning exercises; explanatory organ inspector; JSON/CSV export and local save/import; baseline comparison and event log. Healthy baseline starts with zero vasoactive infusions, a deliberate correction to the illustrative concept's nonzero drugs. All values derive from the live model.

## Implementation boundaries

- Native ES modules, DOM, Canvas 2D and WebGL. No dependencies, remote services, accounts or keys. This intentionally replaces the skill's default React/Vite stack to honor the workspace's no-new-dependencies rule.
- Actual interactive procedural 3D anatomical schematic, never a raster mockup as product UI. Procedural anatomy is an intentional functional deviation from the concept's more detailed render. No claim of patient-specific anatomical accuracy.
- Separate physics, renderer, monitor and app UI modules. Structured model assumptions and references visible in the app.
- Physics: scenario-based lumped-parameter teaching approximations with dynamic transitions. Protect algebraic relationships and directionality using native Node tests. No clinical calibration claims.

## Verification plan

1. Unit tests for physiology identities, intervention responses, scenarios, bounds and long-run stability.
2. Syntax checks and dependency-free production build.
3. Browser verification of WebGL, scenario change, intervention responses, pause/speed/reset, navigation, overlays, exports and responsive behavior.
4. Compare full desktop render against concept; inspect copy, layout, typography, palette, spacing and scene. Persist visual verdict and documented deviations.
