# Verification record

## September 5, 2026 — current multiorgan implementation

[Step 11](sdd/step-11-report.md): 68/68 tests, 13-module syntax check, preview build, current hashes, and expected asset-provenance release block. [Step 12](sdd/step-12-report.md): refreshed desktop/narrow browser matrix passes executor checks; independent final judges pending. Maximum post-ready publication interval 209.2 ms; warmed maximum 173.5 ms. CSV now has 39 columns. Software-WebGL measurements and retained original startup failures are documented with raw evidence.

## September 4, 2026 — historical baseline

Verified locally on September 4, 2026, using Node.js 24.13.0 and the Codex in-app Chromium browser.

## Automated checks

- **20 tests passed; zero failures.** See `tests.txt`.
- All ten application/server/build JavaScript modules passed syntax validation. See `syntax.txt`.
- The dependency-free static build completed in `dist/`. See `build.txt`.
- Application and production-build HTML, modules and favicon returned HTTP 200 with correct content types. Hidden project paths returned 403; a missing route returned 404. See `http.json`.
- There is no TypeScript or external lint toolchain in this native-JavaScript, zero-dependency project. Syntax checks and model tests are the automated checks; they are not a claim of formal type verification.

The model tests exercise numerical identities throughout transitions, all eight scenarios, drug directionality, fluid responsiveness, ARDS/shunt, PEEP tradeoffs, hemoglobin/oxygen delivery, CO₂ reactivity, autoregulation, bounds, resets, pause semantics, time-step behavior and finite long runs under extreme settings.

## Browser scenarios exercised

| Workflow | Observed result |
| --- | --- |
| Start healthy circulation | Live WebGL anatomy, moving blood, heartbeat, lung motion and monitor traces render without console errors |
| Pause | Simulation clock and physiology remain fixed; camera and display controls continue to work |
| Septic shock and norepinephrine | Starting MAP 57 mmHg; after 0.20 µg/kg/min and settling, MAP 77 mmHg and CO 5.8 L/min; baseline comparison updates |
| Direct numeric entry | Numeric dose fields and slider values synchronize and change the model |
| Keyboard slider | Arrow-right changes the dose and records an event |
| Fluid bolus in cardiogenic shock | +250 mL changes retained volume to 250 and updates CVP and stroke-volume readings |
| ARDS ventilation | FiO₂ 60% and PEEP 10 accepted; oxygenation rises while output falls relative to the starting state |
| Trends | Recorded signals display in a bounded 181px monitor panel; the original intrinsic-canvas sizing problem was repaired |
| Pressure–volume | Loop and EDV/ESV/EF readings render; a captured baseline adds a comparison envelope |
| Organ focus | Heart, lungs, brain, kidneys and systemic views all show the correct heading and finite organ metrics |
| Camera and color | Pointer drag visibly rotates the actual 3D scene; flow mode changes vessel colors while the simulation is paused |
| Patient customization | Hemoglobin 8.5 persists with fractional precision; autoregulation toggle persists |
| Browser save/restore | Saved cardiogenic setup restores hemoglobin 8.5, disabled autoregulation and retained fluid 250 mL |
| CSV and JSON download | Both files exist and parse; 95 physiological rows, 18 CSV columns and five recorded events. Copies are retained here as `export-example.*` |
| JSON import | Downloaded setup restores successfully and starts a new history |
| Malformed import | Invalid format is rejected with an inline accessible message; the current session remains intact |
| Learning lab | Cerebral-perfusion experiment loads the brain-injury scenario, advances through all three steps and opens the reflection view |
| Scenario library | Eight distinct selectable scenarios are present |
| Compact laptop | At 1280×800, the complete page fits the viewport and bedside monitors remain visible |
| Mobile | At 390×844, no horizontal overflow; stacked intervention controls and monitor panels are usable. Display settings exposes hidden sidebar layers and Patient settings |

Screenshots are in `assets/qa-desktop.png`, `assets/qa-laptop.png`, `assets/qa-mobile.png` and `assets/qa-mobile-monitors.png`. The initial concept is `assets/design-concept.png`. A visual iteration verdict is stored in `.omx/state/flowstate/ralph-progress.json`.

## Scope of the evidence

Browser interactions were executed manually through the computer-use API, rather than a committed automated end-to-end suite. Screen-reader testing, cross-browser certification, GPU/device benchmarking and clinical validation have not been performed. Physiological equations are source-informed; drug responses and organ effects remain educational approximations. Procedural anatomy intentionally differs from the detailed raster design concept. No hosted production deployment was requested or performed.
