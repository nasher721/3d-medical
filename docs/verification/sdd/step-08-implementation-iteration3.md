# Step 8 implementation iteration 3 — superseded evidence

Date: 2026-09-05

**Status: INCOMPLETE; this artifact must not be used as completion evidence.**

The earlier text in this file recorded intended fixes and a passing 53-test suite, but the independent handler/browser verification found that the live implementation still has two required gaps:

- Restore still spreads the v2 ventilator object including `mode` into the numeric intervention validation path, so valid v2 save → reload → restore can fail with `Invalid intervention setting`.
- Restart clears model state and `monitor.baseline` in the reviewed path, but does not reset the baseline button label/state observed by the browser; the stale baseline comparison remains visible.

The passing `npm test`, `npm run check`, and `npm run build` results remain historical test evidence, but they do not exercise these app handlers. See the independent disposition and reproduction in [step-08-judge-a-iteration3.md](step-08-judge-a-iteration3.md). The implementation owner must rerun the actual save/restore and baseline/restart browser flows after remediation.

Reason the prior claim diverged: the report was written from the intended patch state while the shared workspace’s final handler source and independent browser harness were still changing. The later handler-level evidence is authoritative and supersedes the earlier completion claim.
