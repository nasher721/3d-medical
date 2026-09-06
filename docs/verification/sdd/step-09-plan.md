# Step 9 implementation handoff

Gate: Step 8 panel PASS and stabilized Step 7 integration. No source mutations yet; preserve existing ECG/trends/PV/export behavior and add no dependencies.

- Add separate Frank–Starling, volume-control, and organ-perfusion tabs. Starling reads `state.frankStarling.samples`/`operatingPoint`: EDV [mL] x-axis, SV [mL] y-axis, effective inotropy/afterload captions and current marker. Keep pressure–volume distinct.
- VC samples shared `volumeControlledBreath(state,timeS)` for synchronized time [s] versus pressure [cmH2O], flow [mL/s], volume [mL]. Mark current phase; show VT/PBW, RR, PEEP, FiO2, minute/alveolar ventilation and PaCO2. Model time freezes plots while paused and resets with the clock.
- Perfusion plots cerebral proxy [mL/100 g/min], renal perfusion [mL/min], urine [mL/h] separately, with CPP/MAP/ICP and educational copy.
- Extract pure session serialization/migration and CSV generation into an isolated module; app delegates. V2 retains five agents, ventilator settings, opacity, metrics/history/events, and calibration IDs/status/version. Preserve existing CSV columns; add explicit-unit regional cerebral, renal, urine, VC and Starling columns. Canonical snapshots must explicitly retain non-enumerable cerebral territories.
- Test actual serializer→JSON→import, legacy defaults, atomic malformed imports, calibration rejection, parsed CSV units/values/history, and plot-marker agreement.

Browser acceptance: visit every tab; change preload/inotropy/afterload and VC inputs; verify labels/directional plots, pause/resume, captured-baseline reset; export/reimport five nonzero agents; inspect desktop/narrow layouts. App/styles ownership transfers from UI only after Step 8 passes.
