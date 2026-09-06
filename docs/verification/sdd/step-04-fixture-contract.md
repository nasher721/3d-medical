# Step 04 fixture contract: coupled physiology outputs

Date: 2026-09-05
Status: implementation handoff; engineering-test contract only

These fixtures verify internal consistency, boundedness, deterministic replay, and documented educational directionality. They are not physiologic validation, treatment targets, dose guidance, or patient-specific predictions. Any future source-reviewed calibration must be recorded separately and must not be inferred from a passing fixture.

## Exact identities and tolerances

Use absolute tolerance `1e-6` in native displayed units for algebraic identities whose expected result is one subtraction or multiplication:

- `CPP [mmHg] = MAP [mmHg] − ICP [mmHg]`.
- `CO [L/min] = HR [bpm] × SV [mL] / 1000`.
- `MAP [mmHg] = CVP [mmHg] + CO [L/min] × SVR [dyn·s/cm⁵] / 80`.
- `SV [mL] = EDV [mL] − ESV [mL]` and `EF [%] = 100 × SV / EDV`.

The `1e-6` value is a numerical assertion tolerance, not a clinical tolerance. For regional cerebral territories, assert `abs((ACA + MCA + PCA) − brainFlow) <= 1e-6` when the implementation defines the three values as a partition of the same proxy. If the implementation intentionally uses a documented rounding step, assert the documented rounding unit and retain the unrounded identity test.

## Determinism and time-step fixtures

Run the same reset-and-input sequence twice for 3 simulated seconds. Compare state metrics and the fixed-cadence history sample values with absolute tolerance `1e-9`; compare event labels and timestamps with `1e-9` seconds. A fixed `1/30 s` substep must make equivalent elapsed schedules converge within `1e-9` for the same total elapsed time. `elapsedS <= 0`, NaN, Infinity, and reverse elapsed inputs are no-ops. One call with a positive elapsed value is capped at `60 s`; outputs remain finite and within model bounds. These thresholds test deterministic arithmetic and are not claims about physiologic time-course accuracy.

## Frank–Starling coupling fixtures

The live curve and the cardiovascular metric must use the same forward stroke-volume function. Assert the curve operating point's SV equals `metrics.sv` within `1e-6` mL at reset and after each supported change. Within the bounded non-plateau region, increasing modeled preload or contractility must not decrease SV; increasing afterload must not increase SV. Directional tests should compare paired resets with one changed input and use a strict finite difference (`> 1e-9` in the relevant native unit), never a clinical response margin. The curve is labeled schematic and is not a pressure-volume loop.

## Volume-controlled ventilation fixtures

Use only volume control with the documented bounds: RR `6–35 /min`, tidal volume `4–10 mL/kg PBW`, FiO₂ `21–100%`, and PEEP `0–20 cmH₂O`. PBW is the simulator setting, not a patient estimate. For a fixed PBW, verify each delivered-cycle flow integral equals the modeled tidal volume in mL within `1e-6` mL and that minute ventilation equals `RR × VT_absolute` within `1e-6` mL/min. At fixed metabolic demand and other inputs, increasing RR or VT must increase modeled minute/alveolar ventilation and lower modeled PaCO₂ while all outputs remain finite. PEEP directionality is an educational recruitment/venous-return relationship; do not assert a clinical optimum.

## Renal separation and boundedness

Assert that renal perfusion (`renalFlow`, [mL/min]) and collecting-system urine output (`urineOutput`, [mL/h]) are distinct fields with distinct units and values; urine output must never be labeled GFR or clearance. Engineering bounds are `0 <= renalFlow <= 2400` mL/min and `0 <= urineOutput <= 240` mL/h, matching the model's bounded output envelope. Paired directional fixtures may assert that improved effective perfusion can increase the filtering-transition proxy and that venous congestion can reduce renal perfusion, but must not assert a clinical urine prediction or volume-balance claim.

## Source boundary

General relationship support: [Cardiac Output](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-18897/), [Cardiac Preload](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-27651/), [Assist-Control Ventilation](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-17914/), and [Dural Venous Sinuses](https://www.ncbi.nlm.nih.gov/books/n/statpearls/article-20768/). The implementation coefficients (`1.34`, `0.003`, `P50 25.5`, Hill `2.9`, cerebral `2.5%/mmHg`, and ICP `0.1 mmHg/mmHg`) are explicitly documented illustrative choices; these sources do not calibrate them. Hypertonic records remain unreviewed and excluded from every fixture.
