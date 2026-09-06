# Step 9 implementation evidence

Source: `src/monitors.js`, `src/session.js`, `src/app.js`, `src/styles.css`, and a narrow archival addition in `src/physiology.js`. Tests: `tests/monitor-export.test.js` and the existing production-handler harness in `tests/app-handlers.test.js`. No dependencies added. The parent approved the physiology history addition; solver equations, fixed-step cadence and bounded history remain unchanged.

## Implemented behavior

Three additional monitor tabs preserve ECG, trends, and pressure–volume. Frank–Starling uses the shared model samples and exact EDV/SV operating point, with relative contractility and dimensionless afterload captions. The volume-control panel samples the shared breath function into synchronized airway pressure [cmH2O], flow [mL/s], and volume [mL] traces against breath time [s]; the live marker follows the simulation clock. It reports VT/PBW, RR, PEEP, FiO2, minute/alveolar ventilation and PaCO2, with the fixed-I:E/prescribed-expiration approximation notice. Organ perfusion shows independent cerebral [mL/100 g/min], renal [mL/min], and urine [mL/h] plots, plus ACA/MCA/PCA and CPP/MAP/ICP readings. The existing 80ms UI update loop drives all monitors.

Pause leaves the model clock and plot pixels unchanged. Restart creates fresh model/history/curve values and clears the captured baseline and monitor cursor. Import remains setup restoration, with time zero and no historical replay.

## Export and input contract

`serializeSession` and `serializeCSV` are actual production functions used by download/local persistence. JSON v2 preserves all five agents, complete patient/volume-control settings, independent opacity, explicit derived territories, current Starling curve/operating point and ventilator cycle. `calibration` contains modelVersion `2` and canonical hypertonic IDs/status/version; all remain unreviewed with null calibrationVersion. Imported metadata cannot override those states. Earlier v2 envelopes without the new optional archive metadata remain supported, as do v1 flat norepinephrine/dobutamine settings.

Each existing 1-second history sample now explicitly captures territory flows, sampled airway pressure/flow/volume, RR/PEEP/FiO2/VT, and Starling operating values. Previous observations retain their original values after later control changes. CSV preserves old columns and adds explicit unit-bearing cerebral territory, renal, urine, ventilation, and Starling columns. Numeric values use full finite precision, so round trips do not introduce artificial decimal truncation. `CSV_COLUMNS` is the authoritative column contract. The serializer returns detached snapshots.

Strict envelope validation remains atomic: unknown root/nested settings, malformed opacity, unsupported modes, nonfinite archive values, uncalibrated selections, altered calibration metadata, and malformed derived structures reject before replacing app state. Derived archives validate but are never consumed as live solver inputs. Metadata object key ordering does not affect acceptance.

## Verification

- `node --test tests/monitor-export.test.js tests/app-handlers.test.js`: **12/12 passed** (`step-09-tests.log`). Tests execute production serializers and handlers; the browser surfaces alone are stubbed in the VM harness. They cover all-five export/save/import restoration, v1 migration, atomic invalid imports, reset/baseline and numeric validation, snapshot retention, parsed CSV exactness, plot/model agreement, directional Starling response and actual monitor drawing stability when paused.
- `npm test`: **65/65 passed** (`step-09-full-tests.log`). This reconciles the separate documentation lane's older 60-test evidence.
- `npm run check`: 13 modules passed (`step-09-check.log`). `npm run build`: passed (`step-09-build.log`).
- Actual isolated Chromium through the already-installed Python Playwright runtime: `python3 docs/verification/sdd/step-09-browser/verify.py` passed. `results.json` records all six tabs pixel-identical during pause, actual control changes, downloaded JSON/CSV, five-agent reimport, fresh clock/baseline reset, no page exceptions, and no horizontal overflow at 390px. Downloaded artifacts are `session.json` and `session.csv`.
- Real screenshots include all old monitor tabs and new Starling/ventilator/perfusion panels at desktop and narrow widths. Initial plot clipping was found visually and repaired by removing the inherited fixed-height grid constraint for the new model panels. Iteration verdict is `.omx/state/step-09/ralph-progress.json`.

## Limitations

Native Chrome was unavailable because macOS was locked; Chrome DevTools reported an existing profile conflict. Browser evidence therefore comes from isolated headless Chromium with software WebGL, not a physical-device performance certification. A startup cadence probe during concurrent CPU test load observed 456ms and 269ms gaps before settling; the source schedules monitor updates at 80ms but cannot guarantee wall-clock timing during shader compilation or browser scheduling stalls. See the separate warmed live-check results for observed steady-state cadence and live control-response evidence.

All model/plot values remain educational approximations, not clinically validated quantities or dosing guidance. No hypertonic calibration or asset provenance gate was changed.

### Final steady-state and live browser result

`python3 docs/verification/sdd/step-09-browser/live-check.py` passed after a 3-second software-renderer warmup with the concurrent unit suite finished. Thirteen observed monitor update gaps ranged **102.2–121.9ms**, below 250ms (`live-results.json`). Actual fluid control raised EDV/SV from 120.0/70.0 to 136.4/79.6mL; contractility control raised SV to 109.6mL; vascular tone control lowered SV to 96.7mL. The final Starling desktop screenshot shows the resulting curve/marker with both axes unobscured. Startup/concurrent-load failure is retained separately in `startup-cadence.json`; Step12 should repeat controlled timing and report environment limits.

Source frozen after these checks. No task completion marker was changed.
