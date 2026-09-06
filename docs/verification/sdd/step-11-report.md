# Step 11 build and regression verification

Date: 2026-09-05

## Results

| Check | Result | Raw archive |
|---|---|---|
| `npm test` | PASS — 65/65, 0 failed | `npm-test.raw.log` |
| `npm run check` | PASS — 13 JavaScript modules | `npm-check.raw.log` |
| `npm run build` | PASS — standalone static application built | `npm-build.raw.log` |
| `node scripts/build.js --release` | EXPECTED BLOCK — unresolved BodyParts3D provenance for `brain` | `release-build.raw.log` |

Environment and reproducibility metadata are in `environment.txt` (Node/npm versions and UTC timestamp), `source-sha256.txt` (source/document hashes), and `changed-files.raw.txt` (working-tree inventory).

## Regression evidence

The fresh 65-test suite includes the prior norepinephrine/dobutamine behavior and persistence coverage, all-five vasoactive plus volume-control session round trips, invalid import atomicity, derived archive validation, monitor/model agreement, cerebral/renal/urine separation, and CSV exact observation parsing. The focused Step 9 production handler and monitor suite remains 12/12 from its archived run.

The build output contains `dist/src/session.js` and `dist/src/monitors.js` alongside the other source modules. No `.glb` is present in `dist`; the local preview build intentionally omits the blocked anatomy asset. The explicit release build was run separately and failed at the expected provenance gate before release output could be produced.

`package.json` declares no runtime or development dependencies; the check output also confirms no external dependencies.

## Changed-file inventory

The exact working-tree inventory is archived in `changed-files.raw.txt`. It includes the implementation files and verification artifacts produced across Steps 1–10; no implementation file was modified during Step 11.

## Limitations

This gate verifies source-level tests, syntax, build output, and provenance gating. It does not replace the Step 12 desktop/narrow browser matrix or physical-device GPU performance certification. Browser evidence remains isolated headless Chromium with software WebGL.


## Startup-remediation refresh

The earlier 65/65 evidence above is retained as historical context. The authoritative current regression snapshot is the post-remediation run recorded in `startup-remediation.md` and mirrored under this directory:

- `startup-full-tests.raw.log`: **68/68 passed**, exit 0. The increase reflects three focused startup lifecycle tests; no existing regression coverage was removed.
- `startup-check.raw.log`: **13 modules passed**, exit 0.
- `startup-build.raw.log`: local build passed, exit 0.
- `startup-source-sha256.txt`: current source, styles, tests, scripts, package/index, manifest, and documentation hashes.
- `startup-dist-check.json`: every current `src` artifact matches `dist/src`; `dist/src/session.js` and `dist/src/monitors.js` are present and `glbCount` is 0.
- `startup-changed-files.raw.txt`: refreshed working-tree inventory.

The independent startup replay passed at 1440×900 and 390×844 after genuine readiness, with post-ready maximum display/canvas intervals of 207.4 ms and 128.5/128.4 ms respectively. Loading remained inert at time 00:00 with `aria-busy=true`; no readiness or page errors occurred. The release provenance rejection remains expected: unresolved BodyParts3D provenance blocks `node scripts/build.js --release`.

No new dependency was introduced. Step 12 still owns the final browser matrix and physical-device performance limitation.
