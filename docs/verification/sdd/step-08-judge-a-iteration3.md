# Step 8 judge A — iteration 3

2026-09-05. **FAIL — mandatory gaps remain. Weighted score 3.885/5.**

- Behavior **3.6** (.35): Actual reset-handler replay clears `monitor.baseline`, phase/time and session state; after capture at 3 seconds, baseline button still reads `Baseline 3`. Source `resetSession` has no baseline-label update. The earlier native-browser baseline failure is therefore only partially fixed.
- Contract **3.2** (.25): Executing actual `sessionData` → `restoreSetup` with five nonzero agents and VC RR25/VT8/PEEP10/FiO2 60 fails `Invalid intervention setting: mode`. Source still includes mode in flattened numeric settings; no exclusion exists. Legacy v1 without opacity now succeeds with all three UI defaults=0.35. Unknown and Infinity opacity are rejected with byte-equivalent prior model state.
- Boundary **4.6** (.20): Educational/provenance/calibration constraints remain intact.
- Evidence **4.5** (.20): Independent harness extracts and executes the current functions from `src/app.js` with actual model/UI modules and isolated DOM placeholders. Reproduced v2 failure, legacy success, atomic malformed-opacity rejection, and stale reset label. Implementation report claims mode exclusion and label clearing, contradicted by executable source. No claim of fresh browser success; earlier native reproduction remains in iteration2 report.

Fix required: remove the validated VC `mode` from numeric intervention iteration; restore baseline-button copy during reset, preferably through existing `clearBaseline`. Re-run five-agent/VC save/reload/import and capture→reset in actual browser. No source edits or DONE markers during this review.
