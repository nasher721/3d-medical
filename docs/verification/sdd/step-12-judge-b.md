# Step 12 independent Judge B

Date: 2026-09-05
Reviewer: independent browser verification lane
Disposition: **PASS — 4.69/5.0** (critical threshold 4.5)

This final assessment supersedes the earlier provisional report. It uses the complete frozen evidence linked by `step-12-report.md` under `browser-final/refresh/`.

| Component | Weight | Score | Evidence |
|---|---:|---:|---|
| Behavioral correctness | 0.35 | 4.70 | Frozen matrix covers whole, brain, lungs, and kidneys at 1440×900 and 390×844, plus all 12 monitor views. Lifecycle artifacts cover pause/reset, save/restore, invalid imports, five-agent/volume-control persistence, and zero-flow route behavior. |
| Numerical/contract correctness | 0.25 | 4.65 | `refresh/lifecycle-report.json` confirms exact historical CSV values, 39 columns, canonical reset, finite archive isolation, and atomic rejection of unknown fields, invalid ventilator mode, uncalibrated hypertonic data, and invalid direct RR. Frozen source/build hashes match, including session and monitor modules. |
| Safety and educational boundary | 0.20 | 4.75 | Current monitor/anatomy surfaces retain labeled units and educational approximation/proxy boundaries. Startup keeps controls inert at 00:00 until readiness; unresolved anatomy provenance remains blocked from release. |
| Reproducible artifact evidence | 0.20 | 4.65 | `refresh/final-report.json`, `refresh/lifecycle-report.json`, `refresh/startup-remediation-report.json`, `refresh/probes.js`, `refresh/lifecycle.py`, PNG captures, and terminal `step-12-report.md` provide complete desktop/narrow evidence with source/build stability and empty runtime/request error arrays. |

Weighted result: `(4.70×0.35) + (4.65×0.25) + (4.75×0.20) + (4.65×0.20) = 4.6875/5.0` → **4.69/5.0 — PASS**.

## Mandatory gates

- All eight organ/viewport cases completed at 1440×900 and 390×844. Document and viewport widths match; anatomy labels, opacity controls, key panel, and zero-flow evidence are recorded.
- All 12 monitor views completed with labeled waveforms, trends, pressure-volume, Frank–Starling, volume-control ventilator, perfusion, pause, and reset evidence.
- Lifecycle replay passed at both viewports: 39-column CSV with exact historical values, invalid-import state preservation, all-five-agent and VC restore, canonical reset, local save/restore, and archived values prevented from becoming live state.
- Startup remediation passed at both viewports. Loading remained at 00:00 with inert controls, disabled playback, and `aria-busy=true`; after genuine readiness, maximum display/canvas intervals were 209.2/209.1 ms desktop and 124.3/124.4 ms narrow, below 250 ms.
- Zero-flow renderer evidence reports stable phases, zero route rates, finite particles, and no GL error. Source and build hashes are stable and match; blocked GLB assets are absent from release output.

## Limitations

The matrix uses isolated headless Chromium with SwiftShader software WebGL, so observed FPS is host-scoped evidence rather than physical-device GPU certification. Historical pre-remediation cold-start gaps remain preserved and are clearly separated from the corrected readiness-gated replay. Later OS/browser suspension is outside the tested guarantee. The simulator remains an educational approximation without clinical validation.
