# Step 12 final browser verification — executor PASS; judges pending

Date: 2026-09-05. Current evidence is under [browser-final/refresh/](browser-final/refresh/). All required browser checks passed on the post-remediation build after Step 11 panel approval of 68/68 tests. No product edits or completion markers were made by this QA pass. Two independent final judges remain required.

## Current-source gates

| Gate | Observed result |
|---|---|
| Visual matrix | Eight whole/brain/lungs/kidneys cases at 1440 × 900 and 390 × 844; no horizontal document overflow |
| Opacity/labels | Three independent opacity controls passed; refreshed PNGs show internal vessel routes and readable, collapsible/scrollable anatomy keys |
| Monitor publication | All six modes at both sizes passed; maximum warmed display/canvas interval **173.5 ms**, below 250 ms |
| Pause | Model/readout text, label text, monitor pixels, and anatomy pixels unchanged in all twelve cases |
| Lifecycle | File import and local save/reset/restore retained five-agent and VC settings; canonical reset restored zero doses, opacity 1, no baseline/events |
| Validation | Invalid numeric values and malformed/unsupported imports showed feedback and preserved prior semantic state |
| CSV | Exact historical values; **39 columns**, **23 desktop rows**, **26 narrow rows** |
| Archives | Fake archived CO 1234 ignored as live state; fresh history time 0 and CO 5.04 |
| Zero flow | Controlled actual-build renderer fixture: **105 routes**, rate 0, exact unchanged phase over one second, finite particles, GL error 0 |
| Errors | Matrix/lifecycle page, console, and request errors empty; startup page errors/timeouts empty; GL error 0 |
| Attribution | Matrix and startup hashes stable and matching; final recheck matches all **10 source and 14 build files** |

Zero-flow fixture results describe the renderer, not an actual app-control state. Restored times of 1.0 seconds desktop and 1.3667 seconds narrow occurred at saved 5× speed; checks verify fresh history and live HR×SV/1000 rather than an arbitrary elapsed-time cutoff.

## Readiness and the 250 ms bound

Final fresh-process replay uses original lightweight timestamp probes, bounded 30-second actual-loader-dismissal wait, and at least eight seconds afterward. Both sizes remained at `00:00` and `Loading`, with main/header inert, `aria-busy=true`, and playback disabled throughout rendered loading observations. Source inspection confirms initial `running=false` and `dt=0` until readiness. Pre-DOM null-element observations remain in raw data and are excluded only from rendered-loading assertions.

| Viewport | Ready at (browser timeline ms) | Post-ready sample (ms) | Max display (ms) | Max canvas (ms) |
|---|---:|---:|---:|---:|
| 1440 × 900 | 7493.5 | 8083.2 | **209.2** | **209.1** |
| 390 × 844 | 6778.3 | 8036.0 | **124.3** | **124.4** |

The longest post-ready interval was **209.2 ms**, below 250 ms without changing the assertion. Readiness is actual zero-time render preparation. Step 11 regression tests cover the 20-second error/reload branch; normal browser replays did not trigger it.

Matrix `coldStart` samples begin at document initialization and include pre-ready loader work. Their **1.16 FPS desktop / 19.11 FPS narrow**, including long gaps, remain preserved and are not post-ready cadence measurements. Dedicated startup evidence records exact readiness boundaries and all timestamps. The observed 6.78–7.49 second readiness periods disclose preparation cost.

## Warmed FPS observations

Three five-second samples per case; mean ± sample standard deviation. No numeric FPS target is specified.

| Viewport | Whole | Brain | Lungs | Kidneys |
|---|---:|---:|---:|---:|
| 1440 × 900 | 6.04 ± 0.82 | 7.52 ± 0.14 | 10.29 ± 0.81 | 12.22 ± 0.54 |
| 390 × 844 | 23.83 ± 0.22 | 30.86 ± 0.22 | 31.00 ± 0.39 | 32.96 ± 0.11 |

Refreshed visual inspection covered narrow brain key, narrow transparent kidneys, desktop transparent lungs, and narrow volume-control plots. The expanded narrow key overlays some anatomy but remains readable, scrollable and collapsible. No blocking visual finding was observed. Geometry remains explicitly schematic; yellow renal collecting/ureter/bladder/outlet flow remains separate.

## Evidence and reproduction

Serve frozen `dist` at `http://127.0.0.1:5199/`. Run these sequentially using `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`:

```sh
python3 docs/verification/sdd/browser-final/refresh/verify.py --run-final --url http://127.0.0.1:5199/
python3 docs/verification/sdd/browser-final/refresh/lifecycle.py
python3 docs/verification/sdd/browser-final/refresh/startup-remediation.py
```

- [final-report.json](browser-final/refresh/final-report.json): eight organ and twelve monitor cases, raw timings/errors/hashes; no original harness timeout.
- [lifecycle-report.json](browser-final/refresh/lifecycle-report.json): CSV/import/local persistence/validation/zero-flow.
- [startup-remediation-report.json](browser-final/refresh/startup-remediation-report.json): exact readiness and post-ready timestamps with hashes.
- [final-hash-check.json](browser-final/refresh/final-hash-check.json): current hash equality and startup-to-matrix attribution.
- PNGs and downloaded JSON/CSV under `browser-final/refresh/` are current evidence. Timestamp probes have no pixel reads; screenshots and pixel comparisons occur paused, outside timed sampling.

Runtime: macOS 27.0 arm64, Python 3.13.2, isolated headless Chromium 145.0.7632.6, ANGLE Vulkan SwiftShader software WebGL 1.0, DPR 1. No competing agent browser/test workload ran during this matrix. CUA was unavailable because macOS was locked; existing user profiles/tabs were untouched. This is neither physical-GPU performance certification nor clinical validation. Asset provenance still blocks release packaging as documented in Step 11.

## Retained history and recommendation

Original failures remain in `browser-final/` and [step-12-pre-refresh-report.md](step-12-pre-refresh-report.md): desktop startup display/canvas **460.4/460.2 ms**, narrow **317.6/317.7 ms**. They were not discarded or averaged into passing samples. Original hidden-restart harness timeout and supplemental speed-related assertion artifacts also remain. The first successful startup remediation replay remains separate from this final refreshed replay.

Executor recommendation only: behavior **4.70**, contract **4.70**, educational boundary **4.75**, reproducible evidence **4.65**. Weights .35/.25/.20/.20 give **4.70/5**. Current mandatory browser gates pass; final judge panel and owner completion marking remain pending.
