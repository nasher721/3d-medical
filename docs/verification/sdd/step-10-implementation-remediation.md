# Step 10 documentation remediation

2026-09-05. Implementation evidence; independent judgment required.

Cleanup plan: replace superseded active guidance, consolidate the healthy baseline and unit definitions, document the frozen serializer contract, then verify source fidelity and rendered guide text. Preserve the dated evidence ledger and existing solver/calibration/provenance boundaries. No new abstraction or dependency.

Changed `docs/physiology.md`, `README.md`, `src/content.js`, and the `showGuide` copy in `src/app.js` only.

- Removed the guide's false urine-output exclusion; retained the absence of retained-fluid elimination, GFR, and clearance modeling. Replaced lesson wording “measured” with “modeled.”
- Replaced conflicting direct-input/clamping and breath-unit prose. Consolidated canonical defaults and clarified that restart retains the selected scenario and creates an initial time-zero history sample.
- Replaced the pending Step 9 export handoff with the exact 21-key JSON envelope, nested fields, archived observations/restoration behavior, and all 38 numeric CSV mappings in order. Described raw export precision and rounded controls, plots, and summaries.
- Documented all five agents' conceptual units, bounds, per-minute metadata, primary effects, and coupled effects. Vasopressin is explicitly not clinical units/min. Added the same bounded input and new-view explanations to the guide.
- Preserved dated source-ledger text byte-for-byte. Hypertonic records remain unreviewed/disabled; illustrative coefficients and the BodyParts3D provenance block remain intact. All app source outside the `showGuide` line matches the pre-remediation snapshot.

Verification: mechanical comparison matched **38 CSV mappings, 21 envelope keys, and five registry records**; stale contradictory/pending phrases absent. Focused monitor/export and UI tests **8/8 passed**. `npm run check`, `npm run build`, and `git diff --check` passed.

Actual isolated Chromium 145.0.7632.6 rendered the guide with all five agents, distinct urine units/boundary, disabled-calibration and procedural-provenance copy; no page errors. Evidence: `browser-final/step10-guide-remediated-text.txt` and `browser-final/step10-guide-remediation.json`. This was a bounded content check, not final Step 12 QA.

Remaining limits: educational coefficients and headless browser evidence do not establish clinical validation or hardware-GPU performance. No solver, handler, monitor, or style changes; no completion marker changed. Independent review is the next gate.
