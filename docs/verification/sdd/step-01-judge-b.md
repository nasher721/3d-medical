# Step 1 independent judge B

Date: 2026-09-05  |  Reviewer: independent judge B

## Evidence and scores

Behavioral correctness: `HYPERTONIC_CALIBRATION_RECORDS` contains exactly 3%, 7.5%, and 23.4%, all unreviewed with null review/version/bounds and no solver effect; the documented gate blocks activation. Score: **4.5/5**.

Numerical/contract correctness: `docs/physiology.md` and `SOURCE_LEDGER` agree on units, timing, bounds, adult/PBW semantics, and educational identities. Manifest records release, archive endpoint, transforms, and a false derivative-release flag. Score: **4.4/5**.

Safety and educational boundary: Documentation repeatedly excludes clinical validation, dosing, patient-specific advice, CFD, and GFR/clearance claims. General cerebral-edema guidance is explicitly barred from concentration calibration. Score: **4.8/5**.

Reproducible artifact evidence: Archive HTTP metadata, exact README/license URLs, extraction findings, syntax, JSON, and content checks are recorded. The full ZIP/checksum is not retained, so independent byte-level replay is limited. Score: **4.3/5**.

Weighted overall: `(4.5×.35) + (4.4×.25) + (4.8×.20) + (4.3×.20) = 4.49/5`.

## Disposition

**PASS** at the Step 1 critical threshold of 4.2/5. Mandatory calibration and derivative-provenance gates pass as blocked. No Step 1 failures; human/source-owner review remains required before derived mesh release or hypertonic calibration.

Prior Step 5 Judge B components for aggregation: behavioral **4.4**, numerical/contract **4.1**, safety/boundary **4.7**, reproducible evidence **4.5**; weighted **4.41/5**, PASS.
