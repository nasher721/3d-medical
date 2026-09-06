# Final browser verification evidence

Current final matrix: **executor PASS; independent judges pending**. Authoritative current evidence is in `refresh/`; see [Step 12 report](../step-12-report.md). Older setup/results below remain historical and do not supersede refreshed evidence.

Runtime: Python 3.13 installed Playwright; its cached isolated headless Chromium, launched with ANGLE SwiftShader. CUA is unavailable because macOS is locked. Existing Chrome profiles and user tabs are untouched. Each viewport receives fresh browser storage/context.

Setup smoke only:

```sh
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 docs/verification/sdd/browser-final/verify.py
```

After Step 11 and explicit source-freeze handoff from the leader:

```sh
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 docs/verification/sdd/browser-final/verify.py --run-final
```

The prepared matrix uses the actual app at localhost:5188 at 1440×900 and 390×844. It records whole/brain/lung/kidney screenshots, independent opacity checks, labels, six monitor modes, paused text/pixel snapshots, actual Canvas clear cadence, invalid numeric preservation, save/reset/restore, console/runtime/request failures, and WebGL renderer identity. FPS is actual requestAnimationFrame timestamps: three five-second runs per organ/viewport, with mean/range/sample standard deviation, raw intervals, and frame-gap percentiles.

There is no pre-existing numeric FPS target. Measurements characterize this headless software-rendering baseline only. Canvas draw intervals must be assessed against the requested 250 ms freshness bound; drawing instrumentation measures publication cadence, not numerical model validation. Instrumentation adds small overhead. Browser screenshots require independent visual review for readability, connected labels/routes, translucency depth, and narrow layout; scripts do not certify those appearances automatically.

Final reviewer must inspect source hashes for stability, the actual report and screenshots, assertions, cadence intervals (including outliers), restored/reset values, and errors. A script exit alone is not approval. Source may change selectors before the frozen handoff; adapt this test-only setup then. The final matrix has not run yet.
