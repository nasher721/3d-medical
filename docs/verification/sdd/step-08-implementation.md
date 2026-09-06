# Step 8 UI and app adapter evidence

The app adapter now exposes exactly five vasoactive controls from the physiology registry, retains norepinephrine/dobutamine units, renders three disabled hypertonic options from the content calibration records, and preserves volume-controlled ventilator bounds. Display settings include independent brain/lung/kidney opacity controls and clamp values to `[0,1]` before forwarding visual state.

Imported session data is passed through `validateSimulationState` and `migrateState` before the legacy compatibility application path, so unsupported nested keys, non-finite values, unsupported ventilator modes, and uncalibrated hypertonic values cannot silently enter state. Reset/restart restores intervention and visual defaults. Running UI cadence remains governed by the existing animation loop; pause supplies zero elapsed time and resume continues the same model state.

Verification: `npm test` → 42 passed; `npm run check` → passed; `npm run build` → passed. Browser/WebGL responsive behavior and metric-dependent monitor assertions remain pending the later renderer/monitor integration steps. Physiology registry and content records are authoritative; UI no longer duplicates those intervention definitions.
