# Step 4 coupled physiology evidence

Date: 2026-09-05
Owner: physiology/model lane

## Completion

The forward teaching model now exposes coupled cardiovascular, volume-controlled ventilation, cerebral, renal, and Frank–Starling outputs from one ordered calculation. Cardiovascular effects incorporate all five named vasoactive controls while preserving the existing norepinephrine/dobutamine semantics. Ventilator outputs include absolute tidal volume, minute ventilation, and alveolar ventilation derived from PBW; settings remain bounded to RR 6–35/min, VT 4–10 mL/kg PBW, FiO₂ 21–100%, and PEEP 0–20 cmH₂O. Cerebral flow is partitioned into ACA/MCA/PCA territories whose sum equals the proxy; CPP remains MAP−ICP. Renal perfusion and urine output remain separate bounded educational metrics. The Frank–Starling view is generated from the modeled SV and exposes an operating marker sharing the exact SV value.

Fixed `1/30 s` accumulation, 60-second call ceiling, finite guards, and pause/no-op elapsed semantics remain intact. Hypertonic records are not consumed.

## Verification

`npm test` → 42 passed, 0 failed. `npm run check` → passed. `npm run build` → passed. Added tests cover all named vasoactive directions, territory partition, shared Starling SV, PBW tidal-volume identity, minute ventilation, CO₂ response, renal bounds, and finite outputs.

## Self-critique / handoff

The coefficients remain explicitly illustrative and are not source calibration. Frank–Starling samples are a schematic curve, not a pressure–volume loop. UI/app lanes can consume `metrics.tidalVolumeMl`, `minuteVentilation`, `alveolarVentilation`, non-enumerable `metrics.cerebralTerritories`, and `state.frankStarling`; renderer animation remains a separate visual approximation.


## Iteration 2 — shared forward model and delivered breath, 2026-09-05

### Fix plan and ownership

Owned `src/physiology.js`, `tests/physiology.test.js`, and this evidence append. Preserve all other agents' changes. Lock new required behavior with regression tests before implementation: independent curve-forward evaluation during 90 transient substeps; strict preload/inotropy/afterload direction; numerical integration of delivered inspiratory and expiratory flow; deterministic 3-second chunked replay and 60-second cap across every scenario.

### Changes

- Exported `forwardStrokeVolume(edvMl, drivers)` consumes current EDV and dimensionless inotropy, afterload penalty, filling, RV-load and obstruction drivers. Target calculation, transient metrics, every curve sample and the operating point share that same equation. Primitive drivers relax over the existing 1.4-second illustrative transition; SV is recomputed before CO/MAP/ESV/EF identities. Curve `contractility` is effective relative inotropy and `afterload` is the actual penalty, with explicit units.
- Exported `volumeControlledBreath(state, timeS)` returns actual volume [mL], flow [mL/s], airway and elastic pressures [cmH2O], cycle/phase times [s], minute and alveolar ventilation [mL/min]. `state.ventilatorCycle` is a non-enumerable derived current snapshot. I:E is fixed 1:2, inspiration constant-flow; expiration uses a bounded quadratic volume profile reaching zero. During expiration the airway-opening boundary is PEEP and elastic pressure inside the lung is a separate field. Compliance/resistance and waveform shape are explicitly illustrative engineering choices, not patient-specific calibrated mechanics.
- Converted `metrics.alveolarVentilation` from a normalized factor to actual mL/min. PaCO2 normalizes internally to the original baseline, preserving previous directional responses. The dead-space proxy remains 2 mL/kg of the simulator's PBW/weight input.
- Regression exposed warning-event timestamps varying with outer call grouping. Warning decisions now occur once per fixed substep; quantized clock advances inside each substep. History, events and all metrics now reproduce exactly across equal elapsed schedules. Current breath snapshot follows advanced model time.

### Verification

- Baseline `npm test` passed before changes. Added regressions first; initial test run failed on the missing exported forward/breath functions, demonstrating the intended gate. Intermediate tests caught the stale breath time and outer-call-dependent warning timestamp; both were corrected.
- `npm test`: **49/49 PASS**, including 90 transient identity checks; directional curve fixtures; 1,000-bin midpoint numerical integrals separately across inspiration and expiration for RR/VT/PBW/PEEP extrema (integrated volumes match signed VT to 1e-6 mL); volume derivative equals sampled flow; inspiratory airway pressure equals PEEP + elastic pressure contribution + resistive contribution; absolute and alveolar minute-volume identities; and all-scenario deterministic replay.
- Every scenario compares `[1,1,1]` seconds against 90 × 1/30 seconds: metrics within 1e-9 and history/events exactly equal. Invalid elapsed values are no-ops. A 600-second request exactly matches the 60-second per-call cap; renal flow/urine output bounds and cerebral territory sum remain checked.
- Existing long-run, shunt, ARDS PEEP tradeoff, inotrope demand, renal congestion, hyperventilation/autoregulation, migration, and model identity tests all pass.
- `npm run check`: 12 JavaScript modules syntax checked, no dependencies.
- `npm run build`: standalone local static application built successfully.

### Self-critique and limits

These are numerical and directional educational fixtures, not clinical validation. The expiration profile is deliberately prescribed rather than a solved patient-specific expiratory resistance model. New waveforms are a model API for the monitor step; no browser waveform claim is made here. Hypertonic concentrations remain disabled and no calibration, new dependency or release claim was introduced. Changes await independent judge confirmation; no task DONE markers changed.
