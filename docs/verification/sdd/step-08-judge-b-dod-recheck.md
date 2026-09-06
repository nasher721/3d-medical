# Step 8 — Judge B import-envelope recheck

Result: **PASS**. Weighted score: **4.5925/5**; required threshold: **4.0/5**.

This independent, bounded recheck covers the import-envelope remediation following Judge B's earlier Step 8 failure. Source was read-only. No blocking finding remains within this recheck.

| Criterion | Score | Weight | Weighted contribution |
| --- | ---: | ---: | ---: |
| Behavior | 4.60 | 0.35 | 1.6100 |
| Contract | 4.65 | 0.25 | 1.1625 |
| Educational boundary | 4.60 | 0.20 | 0.9200 |
| Evidence | 4.50 | 0.20 | 0.9000 |
| Total | | | **4.5925** |

## Independent verification

Inspected `validateSessionEnvelope` and the production import path in `src/app.js`, the handler tests, and the import-envelope addendum in `step-08-dod-remediation.md`. Envelope validation now precedes projection and mutation, preventing the earlier loss of unknown fields before validation.

Ran `node --test tests/app-handlers.test.js`: **7/7 passed**.

Independently exercised actual production handlers through the existing isolated VM harness with **15 rejection probes**. Every probe threw and preserved the prior model, display, and baseline state byte-for-byte:

1. Unknown root key.
2. Unknown visual key.
3. Infinite recorded metric.
4. NaN history metric.
5. History object instead of an array.
6. Null history row.
7. Events object instead of an array.
8. Numeric event label.
9. Unknown event key.
10. Negative event time.
11. Conflicting `schemaVersion: 1` and envelope `version: 2`.
12. Infinite baseline metric.
13. Unknown layer key.
14. Unknown patient key.
15. Infinite vasoactive input.

Positive compatibility checks also passed: a valid v2 import restored epinephrine to `0.41`; a valid v1 import restored norepinephrine to `0.28` and defaulted all three opacities to `1`.

## Retained evidence and limits

The earlier independent Step 8 passing checks remain applicable to unchanged handlers: distinct values for all five agents and all four ventilator controls survived save/load; restart matched fresh canonical metrics, history, Frank–Starling state, and ventilator cycle; baseline and related display state cleared; 38 paused frame calls froze physiology, breath state, cerebral territories, and history; invalid numeric feedback and paired opacity synchronization/isolation passed.

The remediation addendum reports **60/60** full-suite tests plus successful check/build. Those are implementation evidence and were not independently rerun in this focused recheck. This judge's fresh browser replay was unavailable (`Browser is not available: iab`); no new browser verification is claimed here. Production-handler VM evidence does not establish browser rendering or clinical validity.

The educational approximation boundary is preserved. Archived measurements are validated but do not replace the live model on restore. No clinical validation claim is made, and hypertonic presets remain gated.

The previous mandatory import-validation finding is resolved. No further remediation is required from this bounded Judge B recheck.
