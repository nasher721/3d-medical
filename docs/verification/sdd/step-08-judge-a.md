# Step 8 independent judge A

Date: 2026-09-05

Evidence: `node --test tests/ui-contract.test.js` passed 3/3; `npm run check` passed; `npm run build` passed and preview build omits the blocked GLB. Static inspection confirms the live app renders five vasoactive sliders from `INTERVENTIONS`, a disabled hypertonic select, ventilator sliders with required bounds, and dynamically generated opacity inputs.

Behavioral correctness: Vasoactive and ventilator controls are wired to setters; pause supplies zero elapsed and restart recreates state. However, the reset action calls `resetInterventions` plus display reset without recreating the simulation, so time/history/metrics are not restored to baseline. Score: **3.5/5**.

Numerical/contract correctness: Metadata bounds and five IDs pass focused tests; opacity values clamp before forwarding. Direct invalid input is silently ignored without feedback, and opacity persistence accepts unknown/non-finite values by omission rather than atomic rejection. Score: **3.7/5**.

Safety and educational boundary: UI copy generally states educational approximation and disabled calibration. The model-guide anatomy credit still asserts CC BY-SA 2.1 Japan despite the documented unresolved archive/current-license conflict. Score: **3.8/5**.

Reproducible evidence: Focused contract tests and build checks are fresh; no served-browser replay verifies actual DOM interaction, pause freeze, reset state, or import/persistence. Score: **3.2/5**.

Weighted overall: `(3.5×.35)+(3.7×.25)+(3.8×.20)+(3.2×.20)=3.55/5`.

Disposition: **FAIL** at 4.0. Mandatory gaps: full reset semantics, atomic invalid direct/persisted input feedback, and served-app interaction evidence. Later plot/export and browser-polish steps cannot waive these Step 8 requirements.
