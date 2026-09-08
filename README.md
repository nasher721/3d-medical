# Flowstate

A local, interactive 3D physiology laboratory with Neuro ICU decision training.

## Run

Requires Node.js 22 or newer and a browser with WebGL enabled. There are no package dependencies, accounts, API keys, or installation steps.

```sh
npm start
```

Open **http://localhost:5188**. To use another port: `PORT=5190 npm start`.

```sh
npm test         # physiological identities, intervention responses and bounds
npm run check    # syntax validation of all application modules
npm run build    # standalone static application in dist/
```

The development server binds to `127.0.0.1`. The static `dist/` directory can be served by any ordinary static host. The application itself makes no network requests to external services; reference links open only when clicked.

## Explore

- **Actual 3D circulation:** orbit and zoom the heart, paired lungs, brain and kidneys; follow moving arterial and venous blood through shared vessel paths. Toggle anatomical layers and switch among oxygenation, pressure and flow colors. A sagittal, axial or coronal cutaway plane in Display settings slices open the live geometry (organs, vessels and particles alike) to reveal internal structure; the exposed cut surface is illustrative shading, not segmented internal anatomy.
- **Eight starting states:** healthy circulation, distributive shock, cardiogenic shock, hypovolemia, mechanical obstruction, ARDS, brain injury and right ventricular failure.
- **Interventions:** ten named vasoactive presets (norepinephrine, dobutamine, epinephrine, phenylephrine, vasopressin, milrinone, nitroprusside, nitroglycerin, esmolol and atropine), retained fluid and boluses, a gradual-acting diuretic, respiratory-support presets (bronchodilator, inhaled nitric oxide, prone positioning), sedation depth, and a full ventilator simulator with volume-control, pressure-control and pressure-support/CPAP modes (FiO₂, PEEP, respiratory rate, and a mode-specific drive control). Set intrinsic heart rate and core temperature in Patient settings; baseline ICP is in the Cerebral tab. Inputs are conceptual educational model values.
- **Custom physiology:** predicted body weight, hemoglobin, contractility, vascular tone, circulating volume, metabolic demand, core temperature and cerebral autoregulation.
- **Live monitoring:** a rate-realistic illustrative ECG (fixed absolute P/QRS/QT durations, not fixed fractions of the RR interval), arterial and plethysmographic traces; cardiac output, CVP and SVR; organ-specific oxygen, perfusion and volume measurements; cerebral territories and separate urine output; Frank–Starling curve, ventilator breath cycle for the active mode, trend charts and a schematic pressure–volume loop.
- **Teaching workflows:** capture a baseline, compare responses, inspect the event timeline and work through four guided experiments in Learning lab.
- **Neuro ICU workspace:** inspect a paused snapshot of MAP, ICP, CPP, CVP, PaCO₂ and cerebral flow, then explore the live brain. Practice severe TBI, delayed deterioration after SAH and brain injury with ARDS through nine sequential decisions with explanatory feedback and first-attempt scoring.
- **Bedside calculation practice:** perfusion pressure and the venous downstream gradient, GCS component scoring with non-testable handling, and calculated osmolarity with explicit units and equations. Worksheets are separate from model controls. Case progress lasts until page reload; export a Markdown debrief to keep answers, feedback and sources.
- **Save and export:** CSV observations, full JSON session exports, local browser storage and JSON setup import. Restore/import loads a fresh simulation with saved settings; it does not replay recorded history. JSON/CSV retain unrounded observations; displayed readings are rounded for teaching. See the [session schema and unit-bearing CSV columns](docs/physiology.md#session-and-export-contract).

Dialogs pause simulated time and resume the prior play/pause state when closed. `Space` plays/pauses, `1–6` selects a view, `R` resets the camera, `B` captures a baseline, `L` toggles labels and `C` toggles the cutaway cross-section. Focus the 3D canvas and use arrow keys to orbit, `+`/`−` to zoom. Reduced-motion users start paused. On smaller screens, Display settings contains the layer controls and a link to Patient settings.

## Model and limits

This is an **educational model, not a clinically validated simulator or treatment/dosing tool**. It uses coupled, bounded algebraic relationships with smooth transitions, not computational fluid dynamics or patient-specific anatomy. Drug-response curves, fluid retention, shock severity and organ flow are teaching approximations. Waveform morphology and the pressure–volume loop are schematic. The model guide is accessible in the app; [docs/physiology.md](docs/physiology.md) describes the equations and limitations.

All simulation data stays in memory unless saved or exported. Reloading discards an unsaved session. Browser saving uses the single `flowstate-session` local-storage slot and replaces its previous saved setup. The last 1,800 seconds of physiological samples are retained in memory; trends display the last five minutes.

## Customize the source

| File | Responsibility |
| --- | --- |
| `src/physiology.js` | Scenarios, input bounds, physiological equations, state transitions and event recording |
| `src/anatomy.js` | Anatomical organ rendering, vessel centerlines, particle paths, tissue lighting and camera |
| `src/math3d.js` | Camera and matrix operations |
| `src/monitors.js` | Canvas waveforms, trends and pressure–volume display |
| `src/ui.js` | Icons, field definitions and input formatting |
| `src/content.js` | Organ explanations, guided experiments and references |
| `src/app.js` | UI composition, controls, session lifecycle and export/import |
| `src/neuro-workspace.js` | Neuro ICU snapshots, worksheets, case progression and debrief exports |
| `src/neuro-tools.js` | Validated perfusion, GCS and osmolarity calculations |
| `src/neuro-cases.js` | Source-linked decision cases and immutable attempt scoring |
| `src/neuro-workspace.css` | Responsive Neuro ICU workspace styles |
| `src/styles.css` | Workstation design tokens and responsive layouts |

To add a scenario, extend `SCENARIOS` in `src/physiology.js` and add directional tests. To add a drug or patient parameter, update the model's default/bounds and the field definitions, describe the assumption, and verify interactions with the existing scenarios. Add a guided exercise in `src/content.js`. Vessel routes automatically produce both their geometry and animated particles.

The design concept in `assets/design-concept.png` was generated with the built-in image generator. It is a reference artifact, not part of the application UI or production build. The final anatomy is entirely interactive WebGL geometry.

## Anatomical assets

The local educational preview loads the detailed six-organ GLB with anatomical surface context while BodyParts3D provenance remains blocked: the archived README and current license page conflict. Release packaging still fails closed until that review is resolved; vessel routes and tissue beds remain schematic and no clinical claim is made. No model CDN or runtime package dependencies are used. Focused views expose numbered, accessible anatomy keys; narrow startup collapses the key and allows scrolling when opened. See [asset attribution and reproduction](assets/organs/README.md).
