# Step 01 implementation evidence: evidence release gates

Date: 2026-09-05
Owner: evidence lane
Status: implementation complete; release gates intentionally blocked where evidence is unresolved

## Assigned artifacts

- `docs/physiology.md`: canonical adult baseline, PBW definition, equations, units, cadence, bounds, assumptions, anatomy and collecting-system boundaries, clinical-use exclusion, dated source ledger.
- `src/content.js`: `HYPERTONIC_CALIBRATION_RECORDS` for exactly 3, 7.5, and 23.4 percent; all records are `unreviewed`, have no solver effect, no review date, no calibration version, and cannot be treated as enabled interventions. `SOURCE_LEDGER` exposes timing, unit, source, calibration, and asset-release status.
- `assets/organs/README.md`: exact archive and source-document links, archive HTTP evidence, archived/current license comparison, blocked derivative-release gate, code-owned schematic fallback, offline preparation contract.
- `assets/organs/manifest.json`: existing six-organ array retained for compatibility; every record now carries source release/archive/HTTP metadata, archived and current license evidence, normalized transform intent, `provenanceStatus: blocked-pending-review`, and `derivativeReleaseAllowed: false`.

## External evidence

- Archive endpoint: `https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip` returned HTTP 200, `Content-Type: application/zip`, `Content-Length: 134113358`, `Last-Modified: 2011-09-11`.
- Release README: `https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html` identifies BodyParts3D 3.0, 99% polygon reduction, the 127 MB `BodyParts3D_3.0_obj_99.zip` artifact, and archived CC Attribution-Share Alike 2.1 Japan terms. Its release history identifies 2011-09-15 as the 3.0 data update.
- Current license: `https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` returned HTTP 200 and is marked last updated 2025/02/27; it states CC Attribution 4.0 International. This conflicts with the archived README, so no derivative mesh license is asserted.
- Anatomy/physiology evidence URLs and dates are recorded in `docs/physiology.md`. General cerebral-edema guidance is explicitly not used as concentration-specific calibration.

## Verification commands

```text
curl -L -I --max-time 45 <archive-url>
HTTP/1.1 200 OK; Content-Type: application/zip; Content-Length: 134113358; Last-Modified: Sun, 11 Sep 2011 08:00:53 GMT

curl -L <README-url> | text extraction
README 2013/04/11; Release 3.0; 99% OBJ file; archived CC BY-SA 2.1 Japan

curl -L <current-license-url> | text extraction
Last updated 2025/02/27; current CC BY 4.0 International

node --check src/content.js
PASS

node -e "JSON.parse(readFileSync('assets/organs/manifest.json'))"
PASS: six records; all blocked pending provenance review

node -e "import('./src/content.js')..."
PASS: records [3, 7.5, 23.4]; each unreviewed with null bounds/review/version; source ledger blocked status
```

## Mandatory gate disposition

- Hypertonic concentrations: BLOCKED. No record has a solver effect, target, rate, dose-like input, or enabled state. A general guideline cannot satisfy concentration-specific calibration.
- Derived BodyParts3D mesh release: BLOCKED. Archived README and current portal license disagree. Code-owned schematic route data is the permitted fallback.
- Existing norepinephrine/dobutamine semantics: preserved in documentation as `µg/kg/min`; no physiology or UI implementation was changed by this step.

## Self-critique and remaining review

The archive was probed and its release documentation was read, but the full 134 MB ZIP was not retained in the repository and no checksum was invented. The current manifest is intentionally an array because the existing preparation script emits that shape; Step 6 should preserve the evidence fields when it evolves the asset pipeline. A human/source-owner decision is still required before any derived mesh is distributed or any hypertonic record receives finite effect parameters.

## Iteration 2 evidence (panel feedback addressed)

The hypertonic record gate is now explicit and executable. Each record exposes `enabled: false`, `solverConsumable: false`, `solverEffect: null`, `calibrationStatus: 'unreviewed'`, `reviewedOn: null`, `calibrationVersion: null`, null numeric bounds, empty effect dimensions, and `calibrationGate.status: 'blocked'` with required fields. `SOURCE_LEDGER.calibrationBoundary` explicitly states that general physiology and cerebral-edema references do not calibrate concentration-specific effects, bounds, rates, or targets. `SOURCE_LEDGER.illustrativeCoefficients` labels the oxygen-content constants, Hill parameters, and bounded cerebral heuristics as implementation choices rather than source-calibrated claims.

Executable metadata assertion run:

```text
node --input-type=module <blocked-record assertions>
PASS blocked metadata: 3 records; no solver-consumable fields
PASS illustrative coefficients: oxygenContentHb=1.34, oxygenContentDissolved=0.003, P50=25.5, Hill=2.9, autoregulation=50..150, CO2-flow=2.5, ICP-CO2=0.1
node --check src/content.js
PASS
```

The exact archived README/license text and retrieval/comparison procedure are retained in `docs/verification/sdd/step-01-source-snapshot.md`. The license mismatch remains a deliberate blocker; no derivative release or hypertonic enablement was introduced.
