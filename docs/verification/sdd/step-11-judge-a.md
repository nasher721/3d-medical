# Step 11 judge A — refreshed snapshot

**PASS — 4.7275/5**, critical threshold4.5. All mandatory regression, dependency, calibration, and provenance gates pass. CLAUDE_PLUGIN_ROOT unset; task rubric used. No judge B report consulted; no source edits or additional test/browser workload.

| Criterion | Weight | Score | Contribution |
| --- | ---: | ---: | ---: |
| Behavior | .35 | 4.75 | 1.6625 |
| Contract | .25 | 4.70 | 1.1750 |
| Educational boundary | .20 | 4.80 | .9600 |
| Reproducible evidence | .20 | 4.65 | .9300 |
| Total | | | **4.7275** |

Reviewed the report's authoritative startup refresh and raw artifacts under `step-11/`. The suite has **68 individual passes**, matching68/68 totals and zero failures; all65 prior cases remain, with three startup lifecycle cases added. Test/check/build logs end exit_code0; syntax output states13 modules. Historical65-test evidence is explicitly distinguished.

Independently recomputed all25 current snapshot hashes and all23 source/build hashes from the independent startup replay: every file matches. All10 src artifacts equal dist/src, including session/monitors/styles. The corrected mirrored startup-dist-check.json matches its original. No GLB exists in dist; package metadata declares no runtime/development dependencies. Release rejection remains an expected unresolved-provenance gate.

Because I implemented startup remediation, this judgment certifies snapshot/evidence consistency, not self-approval of its behavior. Independent browser proof belongs to anatomy_fix: frozen-source replay records genuine zero-time inert loading and≥8s post-ready cadence below250ms on both sizes. It is not physical-device GPU certification.

Raw references: `step-11/startup-{full-tests,check,build}.raw.log`, `step-11/startup-source-sha256.txt`, `step-11/startup-dist-check.json`, `browser-final/startup-remediation-report.json`. No DONE marker changed.
