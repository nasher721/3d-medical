# Startup remediation plan and evidence

## Plan before edits

The loader currently hides when organ assets finish loading. The first complete draw/GPU shader work still occurs afterward: the failing trace shows the loader hidden near1s, followed by a4–5s frame gap and later317–460ms publication gaps. Asset availability is not rendering readiness.

Keep the model clock and all route/monitor phases at zero while the actual default scene and monitors initialize. Mark the app busy and prevent controls from mutating state during preparation. Explicitly finish submitted GPU work during preparation only, then require a continuous1.5s sequence of complete frames below200ms before publishing readiness. A slower frame restarts the readiness observation. Once ready, restore the existing reduced-motion startup policy and existing80ms running update loop; no solver, animation-speed, or cadence-threshold changes. Test readiness gating/zero-time invariants and ask the independent browser owner to replay startup against the actual readiness transition.

## Implemented lifecycle

`startup` in app.js separates asset availability, readiness, failure, and stable-frame timestamps. The initial `running` value is false. Before binding controls, header/main become inert and main exposes aria-busy=true. Playback reports Loading and its button is disabled. Global click/keyboard actions also reject activity until ready. The shared simulation state, wave phase and renderer route phases receive dt0 throughout preparation; no elapsed startup wall time is caught up when simulation begins.

The existing renderer still builds the same geometry and shaders. A narrow `finishPreparationFrame()` method calls WebGL finish after actual zero-time drawing, only during preparation; normal running/paused rendering never calls it. App publication uses the actual monitor and labels, then observes completion timestamps. Asset resolution merely changes the loader copy. Readiness requires a continuous1.5s of completed intervals≤200ms, restarting after a slower interval; only then is the loader hidden and the app enabled. Reduced-motion preference still starts the ready simulation paused.

A20s wall-clock preparation bound leads to a visible alert and Reload simulator link, outside the inert region. Playback remains unavailable, the model remains at zero, and no further render frames are scheduled. This prevents indefinite hidden loading on an incapable/unresponsive graphics stack. The bound is checked when browser execution can next yield; JavaScript cannot interrupt an individual blocking driver call. A failed WebGL initialization retains the existing visible graphics-unavailable fallback while permitting the physiology UI after its own readiness preparation.

Files: `src/app.js`, `src/anatomy.js` (single completion API), `src/styles.css` (failure panel), `tests/app-handlers.test.js` (production startup lifecycle coverage). No dependencies, equations, numerical timestep, solver bounds, exports, or ongoing monitor cadence were changed.

Focused production-handler tests: **10/10 passed**, including the seven prior persistence/reset/input cases and three new startup cases: zero-time/loading-to-live transition, reduced-motion/slow-frame reset, and bounded error. Evidence: `startup-focused-tests.log`. Syntax check and local build passed before the independent browser replay (`startup-check.log`, `startup-build.log`). Original failing startup evidence remains untouched in `browser-final/startup-report.json`.

## Independent fresh-process acceptance

The independent anatomy/browser owner replayed the rebuilt app in separate Chromium processes at1440×900 and390×844, using the original lightweight draw/display probes. Observation waited for real readiness (30s timeout), then continued for at least8s; it did not postpone measurement after the loader was hidden. `browser-final/startup-remediation.py` and `startup-remediation-report.json` retain reproduction and raw timestamps. Source/build snapshots before and after measurement were identical.

| Viewport | Genuine readiness | Post-ready observation | Max display interval | Max canvas interval |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 7596.1ms | 8032.4ms | 207.4ms | 207.4ms |
| 390×844 | 6695.0ms | 8033.8ms | 128.5ms | 128.4ms |

Both cases passed≤250ms. Every rendered loading observation retained00:00, Loading status, inert header/main, aria-busy=true, and disabled playback. There were no readiness errors or page errors. Pre-DOM frames lacking an elapsed element were excluded only from the rendered-loading semantic assertion, not from the raw record. The original failing startup report remains intact.

## Final regression refresh

CPU-heavy checks ran only after the timing owner released measurement. Full suite **68/68 passed**, zero failed (`startup-full-tests.log`, exit0); the count increased from65 because three focused startup lifecycle tests were added. Syntax check **13 modules passed** (`startup-check.log`, exit0). Local build passed (`startup-build.log`, exit0). Fresh SHA256 values include source/styles, tests, build/check scripts, package/index, manifest and documentation in `startup-source-sha256.txt`. Every current src artifact matches its dist/src copy; required session/monitor modules exist and dist contains no GLB (`startup-dist-check.json`). Step11's earlier hashes/count describe the earlier source and must be superseded/rejudged using this refresh.

## Limits and final status

This is real startup prewarming, not suppressed reporting for an interactive simulation: controls cannot act and physiology never advances until readiness. Preparation now takes roughly6.7–7.6s on this software GPU, explicitly visible to the learner. The20s error path is covered by the production-handler test; a physical-device driver hang or incapable hardware was not induced in the browser. Arbitrary later browser suspension or OS scheduling can still interrupt wall-clock publication; ongoing source cadence remains80ms and the controlled post-ready observations meet250ms. No clinical-validation or licensed-asset release gate was changed.

Source frozen after the independent pass and final checks. No task DONE markers were edited.
