# Step 1 judge A

Evidence: `docs/physiology.md` and `src/content.js` identify the 2026-09-05 ledger, adult educational-approximation boundary, PBW meaning, units, assumptions, and direct dated source URLs. Runtime inspection returned exactly three records (3, 7.5, 23.4), each `unreviewed` with null bounds/review/version and zero effect dimensions. `SOURCE_LEDGER` reports `hypertonic-records-unreviewed`. The record layer therefore supplies no enabled or dose-like model input; enforcement in the physiology setter remains a downstream Step 3 responsibility.

`assets/organs/README.md` and `manifest.json` identify the exact BodyParts3D 3.0 archive, archive size/last-modified evidence, archived CC BY-SA 2.1 Japan README terms, and current CC BY 4.0 portal terms dated 2025-02-27. The conflict is explicit; all six manifest records report `provenanceStatus: blocked-pending-review` and `derivativeReleaseAllowed: false`, with code-owned schematic fallback documented.

Scores (evidence before score):

- Behavioral correctness: 4.1/5 — records and release flags are consistent; solver enforcement is not yet present in this step’s artifacts.
- Numerical/contract correctness: 4.0/5 — required fields, null gating values, units, dates, and bounds shape are documented.
- Safety/educational boundary: 4.7/5 — clinical, dosing, calibration, and provenance limits are explicit.
- Reproducible artifact evidence: 4.2/5 — `npm run check`, syntax, JSON parse, and runtime assertions pass.

Weighted total: **4.23/5.00 — PASS** (Step 1 threshold 4.2). Mandatory source and derivative gates pass; hypertonic calibration remains correctly blocked.
