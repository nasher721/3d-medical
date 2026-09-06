# Step 1 independent judge B — iteration 2

Date: 2026-09-05

Evidence: Executable assertions pass for exactly three hypertonic records, all `unreviewed`, disabled, non-solver-consumable, null reviewed/version/effect fields, and blocked calibration status. `SOURCE_LEDGER` retains the blocked asset status and explicitly labels illustrative coefficients. `node --check src/content.js` and `npm run check` pass. The source snapshot records exact archive/README/license comparison and the unresolved historical/current license conflict.

Behavioral correctness: immutable disabled calibration metadata and blocked asset status are explicit and machine-checkable. Score: **4.7/5**.

Numerical/contract correctness: units, cadence, bounds, required calibration fields, and illustrative coefficient boundary are aligned. Score: **4.6/5**.

Safety and educational boundary: no dose, target, clinical-validation, GFR, or assumed license claim is enabled. Score: **4.8/5**.

Reproducible evidence: source URLs, dates, HTTP/archive metadata, extracted comparison, and executable assertions are recorded; full archive checksum remains unavailable. Score: **4.5/5**.

Weighted overall: `(4.7×.35)+(4.6×.25)+(4.8×.20)+(4.5×.20)=4.65/5`.

Disposition: **PASS** at critical 4.5. Mandatory calibration and provenance gates remain safely blocked pending human/source-owner review.
