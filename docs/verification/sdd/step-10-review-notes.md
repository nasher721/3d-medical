# Step 10 preliminary documentation review

Status: **PENDING** final Step 9 export contract and documentation corrections; no final verdict.

Read the task, README, physiology ledger, content records, model defaults/equations/registry, and control/guide composition. Code and product documentation remained read-only. Findings were sent to the UI owner; app-guide ownership was escalated to the parent.

Required corrections:

- Document exact healthy baseline/reset values: PBW 70 kg, Hb 12 g/dL, patient multipliers 100%, autoregulation true, HR 72/min, ICP 5 mmHg, RR 16/min, VT 6 mL/kg (420 mL), FiO₂ 21%, PEEP 0, five agents/fluid zero, organ opacities one.
- README incorrectly locates baseline ICP in Patient settings; it is in Cerebral. Add the new Frank–Starling, volume-control, and regional/urine views; retain the distinct existing schematic pressure–volume view.
- Enumerate breath units individually: flow mL/s, volume mL, airway pressure cmH₂O, compliance mL/cmH₂O, resistance cmH₂O·s/L, minute/alveolar ventilation mL/min. Specify fractional FiO₂ in the alveolar-gas equation.
- Clarify rejected direct inputs versus model-API clamping. Document all five agents’ time basis and modeled effects; norepinephrine also affects inotropy/HR, while dobutamine also affects tone/demand.
- In-app guide falsely claims BodyParts3D-derived surfaces and no urine output. Replace with provenance-gated procedural anatomy and the separate bounded urine proxy.

Existing ledger correctly preserves educational exclusions, illustrative coefficients, schematic capillary/collecting-system limits, unreviewed disabled hypertonic records, and unresolved archive/license provenance. No broad source research or new clinical claims were introduced. Final JSON/CSV names, conversions, and precision remain explicitly pending Step 9.
