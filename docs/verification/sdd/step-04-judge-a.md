# Step 4 judge A

Evidence: `npm test` reports 42/42 passing. Runtime probes confirm all five vasoactive keys change modeled outputs and remain finite; VC controls produce exact `tidalVolumeMl = tidalVolume × PBW` and `minuteVentilation = RR × tidalVolumeMl`, while RR/VT changes alter PaCO₂, FiO₂ changes ARDS oxygenation, and PEEP changes recruitment, CO, and PVR. Renal flow and urine output are separate finite bounded fields with distinct units. Cerebral territory values sum to `brainFlow`, CPP equals MAP−ICP, deterministic fixed-step replay is stable, and extreme scenarios remain finite.

Contract gap: `updateCoupledViews` builds Frank–Starling samples by scaling the current `m.sv` with EDV (`m.sv × (edv/preload)^0.65`) rather than invoking the same forward stroke-volume function used by `targetMetrics`; its `afterload` marker is `m.svr`, not the model’s forward afterload term. This makes the “same SV function” requirement unproven and potentially disconnects curve samples from modeled afterload. No delivered-cycle pressure/volume waveform or integral is implemented; only scalar minute/alveolar ventilation identities are tested. Directional checks for preload/contractility/afterload curve movement are absent.

Scores (evidence before score):

- Behavioral correctness: 4.2/5 — coupled outputs and five interventions respond; Starling coupling is incomplete.
- Numerical/contract correctness: 3.9/5 — identities, bounds, VC scalar coupling pass; curve and cycle-contract requirements are unmet.
- Safety/educational boundary: 4.7/5 — illustrative and non-clinical limits are explicit.
- Reproducible evidence: 4.3/5 — full tests and independent probes pass, with missing required assertions.

Weighted total: **4.24/5.00 — FAIL** (critical threshold 4.5). Mandatory same-forward-model Frank–Starling coupling and VC cycle evidence remain open.
