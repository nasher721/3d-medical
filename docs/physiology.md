# Flowstate physiology and evidence ledger

Flowstate is a bounded, deterministic, lumped-parameter **educational approximation** for a single canonical adult baseline scenario. It is not clinically validated, patient-specific, a dosing guide, a ventilator-selection guide, a predictor of outcomes, or a substitute for a clinician, monitor, or medical device. Anatomy and tissue beds are schematic teaching representations; animated particles do not represent red-cell conservation, computational fluid dynamics, pharmacokinetics, or real patient flow.

## Contract and timing

`createSimulation(scenarioId, patientOverrides)` starts the documented adult baseline. `stepSimulation(state, elapsedS)` advances deterministic fixed substeps of `1/30 s`, with a `60 s` maximum per call. The model records history at a `1 s` simulation cadence and refreshes dynamic UI values at least every `250 ms` while running. A zero, negative, non-finite, or otherwise invalid elapsed value is a safe no-op. The illustrative relaxation time constant is not a drug onset, offset, or pharmacokinetic claim.

The canonical scenario uses adult cardiovascular, pulmonary, cerebral, and renal teaching values. “PBW” means the simulator's **predicted body weight setting** and is used only to convert tidal-volume units to an absolute illustrative volume. It is not an estimate for any particular person.

## Canonical reset defaults

The healthy adult baseline starts with PBW 70 kg, hemoglobin 12 g/dL, contractility/vascular tone/circulating volume at 100% of scenario, metabolic demand at 100% of baseline, autoregulation enabled, intrinsic heart rate 72 bpm, baseline ICP 5 mmHg, respiratory rate 16/min, tidal volume 6 mL/kg PBW (420 mL), FiO₂ 21%, PEEP 0 cmH₂O, five vasoactive inputs and retained fluid at zero, and organ opacities at 1. The initial modeled stroke volume is 70 mL, cardiac output 5.04 L/min, EDV 120 mL, and minute/alveolar ventilation 6720/4480 mL/min.

Restart resets the currently selected scenario; it does not switch an alternate teaching scenario to healthy. It resets the clock, controls, comparisons, events, camera, and display, replaces prior history with the initial time-zero sample, and regenerates the initial curve and breath state. Other starting scenarios retain their documented scenario-specific intrinsic heart rate, ICP, and physiological parameters.

## Units and identities

Quantities retain the units below. Controls, monitor summaries, and labels round for readability; exports retain unrounded numeric values as detailed in the export contract.

- `CO` [L/min] = `HR` [bpm] × `SV` [mL] / 1000.
- `MAP` [mmHg] = `CVP` [mmHg] + `CO` [L/min] × `SVR` [dyn·s/cm⁵] / 80.
- `SV` [mL] = `EDV` [mL] − `ESV` [mL]; `EF` [%] = 100 × `SV` / `EDV`.
- Conventional `CPP` [mmHg] = `MAP` [mmHg] − `ICP` [mmHg]. This displayed algebraic identity is checked to `1e-6` where numerical values are available.
- `CaO₂` [mL O₂/dL] = 1.34 × `Hb` [g/dL] × `SaO₂` [fraction] + 0.003 × `PaO₂` [mmHg].
- `DO₂` [mL/min] = `CO` [L/min] × `CaO₂` [mL/dL] × 10.
- Cerebral flow is a modeled proxy in [mL/100 g/min]. Renal perfusion is [mL/min]. Urine output is a separate bounded collecting-system teaching output in [mL/h]; it is not GFR or clearance.
- `MAP`, `ICP`, and `CPP` are [mmHg]. Respiratory rate is [/min], tidal volume is [mL/kg PBW], FiO₂ is [%], and PEEP is [cmH₂O].

These identities are engineering consistency checks, not clinical validation tolerances.

### Illustrative coefficients versus calibration

The following constants are implementation choices for a bounded teaching model, not values calibrated from a patient cohort or a drug/concentration study: `1.34` and `0.003` in oxygen-content arithmetic; `P50 = 25.5 mmHg` and Hill exponent `2.9`; the cerebral-flow autoregulation bounds of `50–150 mmHg`; and the bounded cerebral CO₂ and ICP heuristics (`2.5% flow change per mmHg` and `0.1 mmHg ICP change per mmHg CO₂ change). Passing an algebraic or finite-output test does not turn any of these coefficients into clinical evidence. The source ledger below supports the relationships and anatomy concepts only.

## Forward teaching model

The model couples preload, contractility, afterload, and venous pressure in one ordered forward calculation. The Frank–Starling view is a schematic stroke-volume relationship with a modeled operating point; it is not a left-ventricular pressure-volume loop. Cerebral flow uses an effective `MAP − max(ICP, CVP)` gradient and a bounded autoregulation approximation around 50–150 mmHg. CO₂ effects on cerebral vascular tone and ICP are bounded educational heuristics.

Gas exchange uses a fixed sea-level alveolar-gas approximation, `PAO₂ = (FiO₂ [%] / 100) × 713 − PaCO₂ / 0.8`, a Hill curve (`P50 = 25.5 mmHg`, exponent `2.9`), and content mixing across a scenario-defined shunt. PEEP trades modeled recruitment against venous return and right-heart loading. Ventilation uses respiratory rate and tidal volume with a fixed 2 mL/kg dead-space approximation. These relationships omit acid-base and temperature shifts, heterogeneous dead space, detailed V/Q distributions, detailed pulmonary mechanics, electrophysiology, valvular disease, and patient-specific anatomy.

Renal flow is a bounded perfusion proxy using forward flow, arterial pressure, and venous congestion. The collecting-system output illustrates a filtering transition and urine path only; it does not model GFR, clearance, dialysis, fluid redistribution, or elimination.

## Bounds and input semantics

| Input | Simulator bound and unit |
| --- | --- |
| Norepinephrine | 0–1 µg/kg/min |
| Dobutamine | 0–20 µg/kg/min |
| Epinephrine | 0–1 µg/kg/min |
| Phenylephrine | 0–1 µg/kg/min |
| Vasopressin | 0–1 conceptual model units |
| Milrinone | 0–0.75 µg/kg/min |
| Nitroprusside | 0–3 µg/kg/min |
| Nitroglycerin | 0–200 µg/min |
| Esmolol | 0–300 µg/kg/min |
| Atropine | 0–3 mg (bolus) |
| Furosemide | 0–80 mg |
| Albuterol | 0–8 conceptual doses |
| Inhaled nitric oxide | 0–40 ppm |
| Sedation depth | 0–100 conceptual scale |
| Prone positioning | Boolean |
| Hypertonic solution | 3%, 7.5%, and 23.4% labels only; all unreviewed records disabled |
| Retained fluid | 0–2,000 mL |
| FiO₂ | 21–100% |
| PEEP | 0–20 cmH₂O |
| Respiratory rate | 6–35/min |
| Tidal volume (volume control) | 4–10 mL/kg PBW |
| Inspiratory pressure (pressure control) | 5–40 cmH₂O above PEEP |
| Pressure support (pressure support/CPAP) | 0–25 cmH₂O above PEEP |
| Intrinsic heart rate | 40–160 bpm |
| Baseline ICP | 0–40 mmHg |
| Predicted body weight | 40–150 kg |
| Hemoglobin | 5–18 g/dL |
| Contractility | 20–180% of scenario |
| Vascular tone | 30–200% of scenario |
| Circulating volume | 40–160% of scenario |
| Metabolic demand | 20–200% of baseline |
| Core temperature | 32–41 °C |
| Autoregulation | Boolean |

Norepinephrine and dobutamine retain their existing `µg/kg/min` semantics. Direct UI text inputs reject blank, nonnumeric, non-finite, and out-of-range values with feedback and preserve the last valid value. Range controls commit within their bounds. The model setter clamps finite numeric API values to bounds; strict session validation rejects unknown, conflicting, unsupported, or uncalibrated inputs before replacing state. Numeric bounds are model safeguards, not treatment targets.

Furosemide is the one intervention that is not an instantaneous input: while its dose is above zero, `stepSimulation` decrements retained fluid by a bounded illustrative elimination rate on every fixed substep, so its effect on preload and venous congestion only appears as simulated time advances.

### Named interventions and live teaching views

The authoritative `VASOACTIVE_REGISTRY` exposes ten conceptual inputs. Its time basis is **per minute** for every infusion record and a one-time **bolus** for atropine; this metadata does not establish clinical dosing, pharmacokinetics, onset, or offset. All effects below are bounded illustrative coefficients. Named presets remain uncalibrated clinical approximations; their implemented model effects are distinct from the disabled concentration-specific hypertonic records.

| Agent | Input unit and bounds | Time basis | Primary and coupled model effects |
| --- | --- | --- | --- |
| Norepinephrine | 0–1 µg/kg/min | Per minute | Increases vascular tone and modeled venous return/preload; also increases inotropy and heart rate. |
| Dobutamine | 0–20 µg/kg/min | Per minute | Increases contractility and heart rate; also lowers vascular tone and raises modeled metabolic demand. |
| Epinephrine | 0–1 µg/kg/min | Per minute | Increases contractility, vascular tone, and heart rate. |
| Phenylephrine | 0–1 µg/kg/min | Per minute | Increases vascular tone, with downstream afterload/perfusion changes. |
| Vasopressin | 0–1 conceptual model units | Per minute | Increases vascular tone, with downstream afterload/perfusion changes. This namespace is not clinical units/min and has no clinical-unit conversion. |
| Milrinone | 0–0.75 µg/kg/min | Per minute | Increases contractility and heart rate; lowers vascular tone (inodilator). |
| Nitroprusside | 0–3 µg/kg/min | Per minute | Lowers vascular tone and MAP; small reflex heart-rate increase. |
| Nitroglycerin | 0–200 µg/min | Per minute | Lowers modeled venous congestion (preload) more than arterial tone. |
| Esmolol | 0–300 µg/kg/min | Per minute | Lowers heart rate and contractility. |
| Atropine | 0–3 mg | Bolus | Increases heart rate. |

The registry's effect dimensions identify primary effects. The coupled calculation also propagates changes through preload, afterload, oxygen demand, and organ perfusion; response direction can depend on the scenario. No value in this table is a treatment target.

The non-vasoactive support inputs (furosemide, albuterol, inhaled nitric oxide, sedation depth, and prone positioning) live in a separate `state.interventions.support` group with the same finite-bounds validation as the vasoactive and ventilator groups. Albuterol lowers the shared airway resistance used by every ventilator mode; inhaled nitric oxide lowers modeled pulmonary vascular resistance and, in a recruitable (high-shunt) lung, modestly improves V/Q matching; prone positioning modestly improves compliance and reduces shunt in a recruitable lung; sedation lowers modeled metabolic demand, heart rate, and vascular tone.

#### Ventilator modes

`state.interventions.ventilator.mode` selects one of three modes, all sharing respiratory rate, PEEP, and FiO₂ with a fixed 1:2 inspiratory/expiratory timing:

- **`volume-controlled`** (default): tidal volume (mL/kg PBW) is the fixed input; inspiration has constant prescribed flow and airway pressure is the modeled output.
- **`pressure-control`**: `inspiratoryPressure` (cmH₂O above PEEP) is the fixed input; inspiratory flow decelerates along an RC (resistance × compliance) time constant and delivered tidal volume is the modeled output. A stiffer (lower-compliance) or more obstructed (higher-resistance) lung delivers a smaller tidal volume at the same drive pressure.
- **`pressure-support`**: identical mechanics to pressure control, driven by `pressureSupport` instead; at 0 cmH₂O this is CPAP. Patient inspiratory effort and triggering are not modeled in any mode — pressure-support/CPAP shows only the ventilator-delivered portion of a breath.

The Frank–Starling panel uses the shared `forwardStrokeVolume(EDV, {inotropy, afterload, rateFilling, rvLoad, obstructionFactor})` function for its curve and operating marker. `ventilatorCycle` reports phase; cycle timing in seconds; flow in mL/s; tidal and instantaneous volume in mL; airway and elastic pressure in cmH₂O; compliance in mL/cmH₂O; resistance in cmH₂O·s/L; and minute/alveolar ventilation in mL/min, regardless of mode. Expiration always has a prescribed passive quadratic volume decay, and expiratory airway-opening pressure always equals PEEP; these are illustrative mechanics, not calibrated respiratory physiology.

The cerebral graph labels bilateral arterial sources, Circle of Willis connections, schematic ACA/MCA/PCA capillary beds, dural venous sinuses, and jugular return. Kidney view labels collecting ducts, calyces, renal pelvis, ureter, bladder, and outlet, with renal perfusion and separate urine-output flow cues. Whole view uses organ labels; focused views use a numbered, scrollable anatomy key that collapses on narrow startup.

### Monitor waveforms

The Lead-II ECG trace is built from five gaussian components (P, Q, R, S, T) whose durations are fixed **absolute** milliseconds (a ~100 ms P wave, a ~150 ms PR interval, a ~90 ms QRS complex, and a Bazett-style `QTc x sqrt(RR seconds)` QT interval), converted to a phase fraction of the current RR interval each frame — not fixed fractions of the RR interval. Only the isoelectric TP rest segment compresses as heart rate rises, matching how a real ECG's complex durations stay roughly constant while diastole shortens; at very fast simulated rates the P wave can visibly ride the tail of the preceding T wave, a genuine sinus-tachycardia appearance this periodic construction reproduces. It remains an illustrative waveform, not simulated cardiac electrophysiology or a diagnostic rhythm strip.

See the completed session/export contract below for exact field names, units, precision, and setup restoration.

## Session and export contract

`src/session.js` owns serialization. JSON contains one object with the following exact top-level keys. Numeric archived values are observations from the educational model, never authority for a solver setting or calibration.

| JSON key | Shape and meaning |
| --- | --- |
| `format`, `version`, `schemaVersion` | `"flowstate-session"`, `2`, `2`. |
| `exportedAt`, `scenarioId`, `timeS` | ISO timestamp, selected scenario ID, simulation seconds. |
| `patient` | `weight` (PBW kg), `hemoglobin` (g/dL), `contractility`, `vascularTone`, `volume`, `metabolicDemand` (percent), `autoregulation` (boolean). |
| `interventions` | `vasoactive` contains the five named numeric inputs; `ventilator` contains `mode: "volume-controlled"`, `fio2` (%), `peep` (cmH₂O), `respiratoryRate` (/min), `tidalVolume` (mL/kg PBW), plus the legacy `heartRate` (bpm) and `icp` (mmHg) settings. `fluid` is retained mL; `hypertonicSolution` is `null`. |
| `visual` | `opacity: {brain, lungs, kidneys}`, each dimensionless 0–1. |
| `metrics` | Current numeric model metrics plus explicit `cerebralTerritories: {aca, mca, pca}`, each mL/100 g/min. |
| `frankStarling` | `label`, `units`, nine `samples: [{edv, sv}]` in mL, `contractility` (relative inotropy), `afterload` (dimensionless penalty), `operatingPoint: {preload, strokeVolume}` in mL. |
| `ventilatorCycle` | `phase` (inspiration/expiration); `cycleDurationS`, `timeInCycleS`, `inspiratoryTimeS`, `expiratoryTimeS` (s); `tidalVolumeMl`, `volumeMl` (mL); `flowMlS` (mL/s); `pressureCmH2O`, `elasticPressureCmH2O`; `complianceMlCmH2O`; `resistanceCmH2OSL`; `minuteVentilationMlMin`, `alveolarVentilationMlMin`. Units follow the breath-unit definitions above. |
| `calibration` | `modelVersion: "2"` and three `hypertonic` entries with `id`, `calibrationStatus: "unreviewed"`, `calibrationVersion: null`. No enabled concentration effect is exported. |
| `baseline`, `history`, `events` | Baseline metric snapshot with `time`, or `null`; sampled historical observations; event objects `{time, label}` with time in seconds. |
| `layers`, `colorMode`, `selectedOrgan`, `speed` | Boolean `particles`, `labels`, `vessels`, legacy `transparent`; selected coloring/view; simulation speed multiplier. |
| `model` | Educational-approximation and no-clinical-validation statement. |

The exact `metrics` keys are `hr, map, sbp, dbp, co, sv, svr, cvp, spo2, svo2, pao2, paco2, cpp, icp, pvr, do2, vo2, lactate, ef, lungWater, oxygenDebt, brainFlow, renalFlow, urineOutput, edv, esv, tidalVolumeMl, minuteVentilation, alveolarVentilation, inotropy, afterload, rateFilling, rvLoad, obstructionFactor, cerebralTerritories`. Heart rate is bpm; all blood pressures are mmHg; `svr/pvr` are dyn·s/cm⁵; `spo2/svo2/ef` are percent; `co` is L/min; `sv/edv/esv/tidalVolumeMl` are mL; `do2/vo2/renalFlow/minuteVentilation/alveolarVentilation` are mL/min; `brainFlow` and territories are mL/100 g/min; `urineOutput` is mL/h; `lactate` is mmol/L. `lungWater` is an illustrative index; `oxygenDebt` is a fraction; `inotropy/afterload/rateFilling/rvLoad/obstructionFactor` are dimensionless model factors.

History stores the same metric fields with `time` and sampled `airwayPressureCmH2O, airwayFlowMlS, lungVolumeMl, cycleDurationS, respiratoryRate, peep, fio2, tidalVolumeMlKg, preloadEDV, strokeVolume, contractilityRelative, afterloadDimensionless`. These values are copied when sampled; later control changes do not rewrite earlier observations.

### CSV columns and precision

CSV has `scenario` followed by these **38 numeric columns in this order**. Each mapping refers to a historical row. With no historical row, serialization uses a current snapshot. No observation is replaced with a later live value.

| Historical field | CSV column |
| --- | --- |
| `time` | `time_s` |
| `hr` | `hr_bpm` |
| `map` | `map_mmHg` |
| `sbp` | `sbp_mmHg` |
| `dbp` | `dbp_mmHg` |
| `co` | `co_L_min` |
| `sv` | `sv_mL` |
| `svr` | `svr_dyn_s_cm5` |
| `cvp` | `cvp_mmHg` |
| `spo2` | `SaO2_pct` |
| `svo2` | `SvO2_pct` |
| `pao2` | `PaO2_mmHg` |
| `paco2` | `PaCO2_mmHg` |
| `cpp` | `CPP_mmHg` |
| `icp` | `ICP_mmHg` |
| `do2` | `DO2_mL_min` |
| `lactate` | `lactate_mmol_L` |
| `brainFlow` | `brainFlow_mL_100g_min` |
| `cerebralTerritories.aca` | `ACA_mL_100g_min` |
| `cerebralTerritories.mca` | `MCA_mL_100g_min` |
| `cerebralTerritories.pca` | `PCA_mL_100g_min` |
| `renalFlow` | `renalPerfusion_mL_min` |
| `urineOutput` | `urineOutput_mL_h` |
| `tidalVolumeMl` | `VT_mL` |
| `minuteVentilation` | `minuteVentilation_mL_min` |
| `alveolarVentilation` | `alveolarVentilation_mL_min` |
| `airwayPressureCmH2O` | `airwayPressure_cmH2O` |
| `airwayFlowMlS` | `airwayFlow_mL_s` |
| `lungVolumeMl` | `lungVolume_mL` |
| `cycleDurationS` | `breathDuration_s` |
| `respiratoryRate` | `respiratoryRate_per_min` |
| `peep` | `PEEP_cmH2O` |
| `fio2` | `FiO2_pct` |
| `tidalVolumeMlKg` | `VT_mL_kg_PBW` |
| `preloadEDV` | `preloadEDV_mL` |
| `strokeVolume` | `strokeVolume_mL` |
| `contractilityRelative` | `contractility_relative` |
| `afterloadDimensionless` | `afterload_dimensionless` |

JSON serialization preserves JavaScript numeric values; CSV uses `String(number)` without decimal rounding and emits an empty cell for a missing/non-finite observation. These are ordinary floating-point representations, not additional measurement precision. Controls display norepinephrine/epinephrine/phenylephrine/vasopressin to two decimals, dobutamine and tidal-volume input to one, and opacity to two. Monitor summaries show Starling EDV/SV and regional/renal/urine proxies to one decimal, relative inotropy/afterload to two, and pressure values to whole mmHg; plot marker accessibility labels use two decimals. Detail overlays may use whole-number flow values. Display rounding never alters the stored model or export; compare identities before rounding or within the declared display precision.

### Import and local restoration

Local save uses the same JSON envelope in the `flowstate-session` browser-storage slot. A supported v1 session is migrated from flat settings; v2 uses the grouped settings above. Missing legacy opacity defaults to 1; the old transparency boolean remains a supported layer setting. Unknown keys, conflicting schema versions, invalid numeric settings, unsupported modes, and unreviewed hypertonic activation are rejected before replacing the active state. Present derived/calibration archives must have the recognized structure and finite values.

Restoration creates a fresh model using validated scenario, patient, intervention, and display settings. The clock restarts at zero with an initial sample and newly computed metrics, curve, and breath. Archived metrics, time, history, baseline, events, and derived curves remain in the exported file; they are not replayed or imposed on the live solver. Comparison state clears. Imported calibration metadata cannot enable an unreviewed option.

## Hypertonic calibration gate

The three concentration labels are finite metadata records, not enabled interventions. Each record carries an ID, display name, concentration percentage, conceptual unit, time basis, bounds status, effect dimensions, educational copy, `calibrationStatus`, `reviewedOn`, `sourceUrls`, and calibration version. All three currently have `calibrationStatus: unreviewed`, no assigned model bounds, no review date, and no solver effect. They must remain visibly disabled and cannot mutate simulation state. The cerebral-edema guideline below is general evidence that concentrations exist and that evidence quality and monitoring matter; it is not a concentration-specific simulator calibration and supplies no model effect, target, or rate.

The executable gate is part of each content record: `enabled: false`, `solverConsumable: false`, `solverEffect: null`, `calibrationGate.status: blocked`, and a required-field list. Any future reviewed record must populate every required field with a dated source-owner decision before the physiology state or UI can consume it. “Conceptual model units” describes the namespace only; it is not a dose, rate, concentration target, or bedside instruction.

## Anatomy and asset provenance boundary

The intracranial route graph and tissue beds are code-owned schematic topology until every derived mesh has a verified source and license. “Schematic capillary bed” means an illustrative endpoint, not exhaustive microvasculature. Blood, venous return, and urine collections remain separate semantic routes. The bundled BodyParts3D archive is the 2011 Release 3.0 99%-polygon-reduction OBJ archive. Its archived README states CC Attribution-Share Alike 2.1 Japan, while the current BodyParts3D license page states CC Attribution 4.0 International and is dated 2025-02-27. Because this is a material provenance conflict, derived anatomy release is blocked pending a human-readable archive/license decision; the app may use code-owned schematics under its existing project terms.

## Evidence ledger (retrieved 2026-09-05)

These sources establish anatomy or general physiology principles. None is a simulator calibration, clinical validation, or treatment recommendation for this model.

| Source and date | Evidence used |
| --- | --- |
| [Neuroanatomy, Cerebral Blood Supply](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-915/) (updated 2023-07-24; resolves to NBK532297) | Bilateral internal carotid and vertebrobasilar sources, Circle of Willis, ACA/MCA/PCA territories. |
| [Anatomy, Head and Neck: Cerebral Blood Flow](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19178/) (updated 2023-07-17; resolves to NBK538134) | Cerebral-flow autoregulation principle; no bedside target is imported. |
| [Neuroanatomy, Dural Venous Sinuses](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-20768/) (updated 2023-08-08; resolves to NBK482257) | Dural sinus and internal-jugular venous-return pathway. |
| [Anatomy, Kidney and Nephron](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-28331/) (updated 2025-09-15; resolves to NBK482385) | Kidney and nephron anatomical context. |
| [Anatomy, Collecting Ducts](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-19712/) (updated 2024-05-01; resolves to NBK549766) | Collecting-system teaching boundary. |
| [Physiology, Cardiac Output](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-18897/) (updated 2023-07-17; resolves to NBK470455) | CO and stroke-volume determinants. |
| [Physiology, Cardiac Preload](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-27651/) (citation date 2022-09-26; resolves to NBK541109) | Preload and end-diastolic stretch for schematic Frank–Starling teaching. |
| [Surviving Sepsis Campaign 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8486643/) | Intervention names and ordering context only; no dosing target is modeled. |
| [Guidelines for the Acute Treatment of Cerebral Edema](https://pmc.ncbi.nlm.nih.gov/articles/PMC7272487/) (Neurocritical Care Society, 2020) | General hypertonic-solution evidence context; insufficient for this simulator's concentration calibration. |
| [Assist-Control Ventilation](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-17914/) (updated 2023-08-14; resolves to NBK441856) | Rate, tidal volume, FiO₂, PEEP, and minute-ventilation concepts. |
| [Positive End-Expiratory Pressure and Cardiac Output](https://pmc.ncbi.nlm.nih.gov/articles/PMC1414045/) | General PEEP and venous-return interaction. |
| [BodyParts3D description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html) (database record) | Database identity, DOI 10.18908/lsdba.nbdc00837-000. |
| [BodyParts3D 3.0 README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html) (2013 page; release history identifies 2011-09-15 Release 3.0) | 99% OBJ archive name/size and archived CC BY-SA 2.1 Japan terms. |
| [Current BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) (last updated 2025-02-27) | Current CC BY 4.0 terms; conflicts with archived README. |
| [BodyParts3D 3.0 99% OBJ archive](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip) (HTTP `Content-Length: 134113358`; `Last-Modified: 2011-09-11`) | Exact source archive endpoint and release artifact. |
| [Khronos glTF 2.0 specification](https://github.com/KhronosGroup/glTF/tree/main/specification/2.0) | Static GLB/glTF scene, mesh, material, hierarchy, and buffer contract. |
| [Blender 4.5 LTS glTF exporter](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) | Versioned offline export reference. |
| [glTF Transform CLI](https://gltf-transform.dev/cli) | Offline validation and optimization reference; not a runtime dependency. |

### Retained source snapshots and comparison

The dated source snapshot is recorded in `docs/verification/sdd/step-01-source-snapshot.md`. The relevant text is retained verbatim from the linked pages: the archived README says `BodyParts3D_3.0_obj_99.zip (127MB)` and `license for this database is specified in Creative Commons Attribution-Share Alike 2.1 Japan`; the current license page says `Last updated : 2025/02/27` and `license for this database is specified in Creative Commons Attribution 4.0 International`. A reproducible comparison must retrieve both URLs on the same review date, preserve the response bytes, and compare the extracted license sentences. Until that comparison receives a source-owner decision, the manifest's derivative release gate remains blocked.

## Exclusions

No patient-specific recommendations, bedside dosing, concentration-specific effect claims, toxicity model, pharmacokinetics, clinical validation, exhaustive microvasculature, CFD, medical-device equivalence, EHR integration, or real-time patient data are supported.
