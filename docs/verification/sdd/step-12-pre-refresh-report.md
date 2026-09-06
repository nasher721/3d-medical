# Step 12 final browser verification — startup fixed; final refresh pending

Date: 2026-09-05. Task: `anatomic-multiorgan-icu-simulator.feature.md`.

The original frozen preview build passed the warmed browser matrix, lifecycle checks, and controlled zero-flow renderer fixture but failed startup cadence. The owner's remediation subsequently passed independent fresh-process startup replay. The full final matrix refresh and independent final judges remain pending. No product files were changed by this QA pass.

## Startup remediation replay — PASS

The new build keeps simulation time at zero and controls inert during actual renderer preparation. Fresh isolated browser processes reached readiness at 7596.1 ms desktop and 6695.0 ms narrow. Eight seconds of post-ready observation retained the same 250 ms publication bound:

| Viewport | Observed post-ready duration (ms) | Maximum display interval (ms) | Maximum canvas interval (ms) |
|---|---:|---:|---:|
| 1440 × 900 | 8032.4 | 207.4 | 207.4 |
| 390 × 844 | 8033.8 | 128.5 | 128.4 |

All 18 desktop and 32 narrow rendered loading observations showed elapsed `00:00`, status `Loading`, inert main/header, `aria-busy=true`, and disabled playback. Pre-DOM frames without rendered elements are retained in raw evidence and excluded only from the loading DOM assertion. Source inspection confirms initial `running=false` and `dt=0` until readiness. No page errors or readiness timeouts occurred. Source/build hashes before and after replay match.

Evidence: [startup-remediation.py](browser-final/startup-remediation.py) and [startup-remediation-report.json](browser-final/startup-remediation-report.json). Original startup failures below remain unchanged. This replay validates normal readiness; the explicit 20-second error/reload path was not triggered in these two runs.

## Original mandatory failure — retained

`browser-final/startup.py` launches a fresh isolated Chromium process for each viewport and records lightweight display/canvas timestamps without pixel reads during timing. Both viewports show intervals above 250 ms after the loader was first observed hidden:

| Viewport | Loader hidden (ms) | Maximum display interval (ms) | Maximum canvas interval (ms) |
|---|---:|---:|---:|
| 1440 × 900 | 1047.3 | 460.4 | 460.2 |
| 390 × 844 | 994.0 | 317.6 | 317.7 |

Raw evidence: [startup-report.json](browser-final/startup-report.json). Warmed results do not supersede these failures. The earlier Step 9 startup outlier of 455.8 ms also remains preserved in `step-09-browser/startup-cadence.json`; that earlier run overlapped `npm test`, while this fresh final replay had no concurrent QA-owned test workload.

## Passing evidence

- Eight organ/viewport cases covered whole, brain, lungs, and kidneys at 1440 × 900 and 390 × 844. Document widths equaled viewport widths, with no horizontal overflow.
- Twelve monitor/viewport cases covered all six monitor modes. The maximum warmed display/canvas publication interval was 185.0 ms. Paused model text, label text, monitor pixels, and anatomy pixels stayed stable.
- Independent opacity controls revealed tissue vessels. Numbered anatomy keys remained readable and collapsible on narrow screens. The renal collecting, ureter, bladder, and outlet route remained separate and yellow. Whole-body and brain geometry remain explicitly schematic.
- Lifecycle replay preserved all five vasoactive settings and VC settings through file import and local save/reset/restore. Reset produced canonical defaults, opacity 1, zero agent doses, and no baseline/events. CSV exports had 39 columns and exact historical values across 22 desktop and 26 narrow rows.
- Unknown root/visual fields, invalid ventilation mode, unsupported hypertonic configuration, and direct RR 99 were rejected with explanatory feedback while preserving semantic prior state. A finite fake archived CO of 1234 never became live state. Fresh history began at time 0 and CO 5.04. Subsequent restored times of 1.0/1.3 seconds are expected at the saved 5× speed.
- A separate controlled zero-flow renderer fixture imported the actual frozen build anatomy module. All 105 routes had rate 0, phases remained exactly unchanged over one second, particles stayed finite, and GL error was 0. This fixture is renderer evidence, not an actual app-control state.
- Page exceptions, console errors, and request failures were empty in matrix/lifecycle runs; GL error was 0.
- Final hash verification found all 10 source and 14 built files identical to the matrix's final hashes. See [final-hash-check.json](browser-final/final-hash-check.json).

## Observed frame rates

Three warmed five-second samples per case; mean ± sample standard deviation. No numeric FPS target is specified.

| Viewport | Whole | Brain | Lungs | Kidneys |
|---|---:|---:|---:|---:|
| 1440 × 900 | 10.56 ± 0.57 | 9.89 ± 0.16 | 14.04 ± 0.37 | 10.87 ± 0.25 |
| 390 × 844 | 18.17 ± 0.54 | 23.36 ± 0.38 | 23.24 ± 0.54 | 24.42 ± 0.80 |

Initial cold rAF samples were 1.20 FPS desktop and 18.98 FPS narrow. These samples and all raw intervals remain in the matrix evidence. This is a same-host scoped measurement, not a physical-GPU performance or clinical-validation claim.

## Evidence interpretation and harness corrections

- [matrix-initial-report.json](browser-final/matrix-initial-report.json) and [final-report.json](browser-final/final-report.json) retain the original matrix, including its harness timeout after all timing/visual checks: the desktop restart selector is intentionally hidden on narrow screens. The harness now selects the visible restart/reset button. `final-report.json` is raw matrix evidence, **not an aggregate passing verdict**.
- [lifecycle-report.json](browser-final/lifecycle-report.json) supplies the separately completed lifecycle and zero-flow checks. Initial supplemental artifacts remain in `browser-final/lifecycle-initial/`. Its original `timeS < 1` assertion incorrectly ignored resumed 5× speed; final assertions verify fresh history, expected settings, and derived cardiac output instead.
- `browser-final/probes.js` stores rAF, canvas clear, and actual display mutation timestamps. Pixel comparisons and screenshots occur while paused, outside cadence/FPS sampling.
- PNGs in `browser-final/` record organ, transparency, key, monitor, and zero-flow views. `concurrent-host-load.txt` preserves host-load context.

Runtime: macOS 27.0 arm64; Python 3.13.2; isolated headless Chromium 145.0.7632.6; ANGLE Vulkan SwiftShader software WebGL 1.0; DPR 1. CUA was unavailable because macOS was locked. Existing user browser profiles and tabs were untouched. Other native Chrome renderer processes were present; none were terminated.

The owner must resolve startup publication cadence before the two independent final judges can approve completion. Asset provenance/release limitations and educational-model limitations remain as documented in the task and prior gates.
