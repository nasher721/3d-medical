# Organ realism implementation

Replace the procedural organ surfaces with licensed anatomical source meshes packaged as local GLB. Preserve existing vessel paths, physiological controls, selection IDs, and animation pivots. Use the existing WebGL renderer without adding runtime dependencies.

1. Verify source provenance, license, mesh detail, and orientation.
2. Normalize anatomical meshes offline and export named, indexed GLB primitives with baked transforms and smooth normals.
3. Load validated local geometry; give organs tissue materials and an opaque default, retaining optional translucency.
4. Include assets in the static build and document source and reproduction steps.
5. Run parser/asset tests, existing physiology tests, syntax/build checks, and visual checks of every organ and interaction.

Baseline visual verdict: revise. The brain has repeated parallel decorative ridges, the heart is separate oval chambers, and glassy lungs conceal rather than express anatomical shape. Replace surfaces before tuning highlights.
