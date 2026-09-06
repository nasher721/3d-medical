# Neuro ICU training workspace

Extend the existing local educational simulator with a focused training surface.

- Add a Neuro ICU navigation entry with a snapshot of current MAP, ICP, CPP, CVP, PaCO2 and cerebral flow, explicitly paused while the dialog is open.
- Explain conventional CPP versus the modeled downstream gradient, and pressure versus CO2-dependent flow. Reuse existing physiological outputs; do not create a competing solver.
- Add three sequential case exercises with feedback, first-attempt scoring, resumable in-memory progress, source links and an exportable debrief. Cases are authored vignettes; related simulator baselines are explicitly separate.
- Add transparent practice worksheets for perfusion, GCS (including non-testable components), and calculated osmolarity with visible equations, units and bounds.
- Preserve current anatomy, session import/export and intervention contracts; introduce no dependencies. Existing uncommitted work belongs to the user.

Verification: test formulas with independent known values and invalid inputs; test case progression and scoring; test production workspace callbacks; run the full test suite, syntax check and static build; inspect desktop and narrow layouts and exercise real browser controls.

Limitations: no patient-specific inference, new pharmacology, clinical validation or automatic treatment recommendations. SAH diagnostic reasoning is not a new vasospasm solver. Training attempts stay in memory unless the learner exports a debrief.
