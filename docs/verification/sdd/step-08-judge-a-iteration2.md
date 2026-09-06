# Step 8 independent judge A — iteration 2

2026-09-05. **FAIL: mandatory behavior gaps. Weighted score 3.655/5.**

Evidence precedes scores:

- Behavioral correctness **3.2** (weight .35): Native Chrome CUA independently reproduced paused time held at 00:06, valid epinephrine 0.3, rejected 2 retained 0.3 with explanatory feedback. Five vasoactive controls visible. After selecting Brain and capturing baseline, Restart restored 00:00/live/whole/epinephrine 0/event count 0; however button remained `Baseline 00:06` and monitor cards retained `+0 vs baseline`. `resetSession` clears application baseline but not `monitor.baseline` or baseline-button label.
- Contract correctness **3.0** (.25): Actual browser Save → reload → Restore reports `Could not restore: Invalid intervention setting.` An isolated harness executing the actual `sessionData`/`restoreSetup` functions confirmed v2 export contains all five agents, but restore flattens ventilator `mode: volume-controlled` then rejects it as a nonnumeric intervention. Harness also confirms legacy v1 without opacity throws `Invalid opacity: brain` **after one loadScenario mutation**, violating atomic import and legacy compatibility. The migrated object is computed but unused.
- Educational boundary **4.6** (.20): Qualitative intervention caveats and disabled hypertonic records retained; model guide acknowledges blocked provenance. No added clinical calibration claims.
- Reproducible evidence **4.3** (.20): Independent native browser actions above plus actual-function harness reproduce both persistence failures. Current full suite 49/49 passed earlier; these failures demonstrate missing UI regression coverage. Browser DevTools profile conflicted; CUA had no browser provider, so native Chrome was used in a separate tab.

Required fixes: clear monitor baseline/phase/time and baseline label on reset; exclude ventilator mode from numeric intervention iteration or consume validated migrated settings; default legacy opacity and complete all validation before any active-state mutation. Reverify save/reload/import and reset with an existing baseline.

No source edits or DONE markers. Review result is independent of Step 4 implementation ownership.
