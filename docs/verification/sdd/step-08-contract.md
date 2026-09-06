# Step 8 UI contract evidence

The UI contract adds isolated metadata for brain, lungs, and kidneys opacity controls; a single volume-controlled ventilator mode with the specified bounds; the finite vasoactive preset names; and disabled 3%, 7.5%, and 23.4% hypertonic placeholders. Hypertonic options remain `unreviewed`, carry an explanatory disabled reason, and cannot become writable through the existing adapter.

`src/ui.js` keeps these v2 surfaces separate from the legacy `INTERVENTIONS` object so current norepinephrine/dobutamine behavior is unchanged until the physiology/app gates are integrated. `visualOpacityMarkup`, `ventilatorMarkup`, and `hypertonicOptionMarkup` expose markup for a later adapter without owning simulation state.

Verification: `node --test tests/ui-contract.test.js` (three tests) and `npm test` (full suite) pass after implementation. Integration with `src/app.js`, physiology state, and renderer remains intentionally incomplete for the dependent steps.
