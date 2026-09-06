# Step 11 independent judge B

## Post-startup-remediation refresh

Result: **PASS — 4.7050/5**, against the critical **4.5/5** threshold. Task rubric used because `CLAUDE_PLUGIN_ROOT` is unset. This independent review did not consult judge A or rerun the full suite. The earlier 65-test judgment below is retained as historical evidence.

| Criterion | Weight | Score | Contribution |
|---|---:|---:|---:|
| Behavior | .35 | 4.70 | 1.6450 |
| Contract | .25 | 4.70 | 1.1750 |
| Educational boundary | .20 | 4.75 | .9500 |
| Reproducible evidence | .20 | 4.675 | .9350 |
| Total | | | **4.7050** |

- Inspected raw current test log: 68 tests, 68 pass, zero fail/cancel/skip/todo, exit 0, duration 5372.24725 ms. The three added tests exercise zero-time startup, reduced-motion pause and settling reset, and bounded startup failure. Existing handler/model/export coverage remains present.
- Inspected raw check/build logs: 13 JavaScript modules passed; preview build exit 0.
- Independently verified all 25 SHA-256 entries in `step-11/startup-source-sha256.txt` against current files, with no mismatch. This covers source, styles, tests, build/check scripts, package/index, manifest, and principal documentation.
- Independently verified all current source files byte-match `dist/src`, both session/monitor modules exist, the preview contains 14 files, and no GLB is present. The report's initially missing `startup-dist-check.json` was supplied before this verdict and agrees with these direct checks.
- Independently replayed release mode: exit 1 with the exact unresolved brain provenance rejection; all 14 preview file hashes remained unchanged. Raw proof is `step-11/startup-judge-b-release.json`.
- Package declares no runtime, development, or optional dependencies. Preview/release boundary and educational-model limitations remain explicit.

All mandatory Step 11 gates pass on the refreshed snapshot. No blocking finding remains. Startup browser replay separately recorded legitimate zero-time loading and post-ready intervals below 250 ms, but the current full Step 12 browser matrix and its final judges remain pending. This gate does not establish physical-GPU performance or clinical validity.

## Original pre-remediation judgment

Result: **PASS — 4.6900/5**. Critical threshold: **4.5/5**. CLAUDE_PLUGIN_ROOT unset; task rubric used. No judge A report consulted. No implementation edits or completion markers.

| Criterion | Weight | Score | Contribution |
| --- | ---: | ---: | ---: |
| Behavior | .35 | 4.70 | 1.6450 |
| Contract | .25 | 4.70 | 1.1750 |
| Educational boundary | .20 | 4.75 | .9500 |
| Reproducible evidence | .20 | 4.60 | .9200 |
| Total | | | **4.6900** |

## Independent evidence

- Read Step 11 report, raw test/check/build/release logs, environment, build inventory, and source-hash snapshot. Recorded environment is Node v24.13.0/npm 11.6.2.
- Fresh independent `npm test`: **65/65 passed**, zero failed/skipped/cancelled; 7238.902083 ms. Fresh `npm run check`: **13 JavaScript modules passed**.
- Verified all **11 recorded source/document SHA-256 hashes** match current files.
- Verified actual `dist/src/session.js` and `dist/src/monitors.js` are byte-identical to source. Preview contains **14 files and zero GLB files**. Raw preview-build log records exit zero.
- Independently ran `node scripts/build.js --release`: exit **1**, specifically “Organ asset release blocked by provenance record: brain.” A second asserted replay hashed all 14 preview files before/after and proved the rejection left them unchanged. This is the required successful enforcement of the provenance gate, not an unexplained build failure.
- `package.json` has no runtime, development, or optional dependency entries. Build/check scripts use built-in Node facilities and local modules.

## Mandatory gates

All required Step 11 gates pass: current regression suite, syntax, preview artifact, implemented export/monitor availability, omitted blocked asset, explicit release rejection, and no new dependency. Coverage includes retained norepinephrine/dobutamine responses; all-five/VC production session handlers; legacy migration and atomic invalid imports; pause/reset/baseline behavior; exact historical CSV observations and derived archives; shared forward-model/plot identities; cerebral territories, renal/urine separation, independent opacity, zero-flow particle behavior, and hypertonic gating.

Nonblocking evidence limitations: `dist-check.txt` preserves an initial mistaken root-level lookup (“session.js absent”, “monitors.js absent”), then correctly checks `dist/src`; this reviewer independently verified the real paths. The 11-file recorded hash snapshot does not encompass every test, script, style, or asset file; fresh checks and direct artifact validation supplement it.

No blocking finding. This gate does not establish final desktop/narrow appearance, the 250 ms browser refresh bound, native-GPU performance, or clinical validity. Those remain the appropriately scoped Step 12 browser checks; they were not run during this judgment.
