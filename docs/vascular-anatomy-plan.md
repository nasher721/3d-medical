# Vascular anatomy correction

Correct the existing major-vessel teaching overlay in the established +X patient-left, +Y superior, +Z anterior frame. Preserve the source organ meshes, interactive views, flow semantics, and source release gate.

1. Record the existing rendering and protect laterality, connectivity, regional flow and asset parsing with regression checks.
2. Replace mirrored arch and arbitrary peripheral loops with an adult left aortic arch, its three branches, subclavians, separate caval return, renal hilar ordering, four pulmonary veins and coronary routes. Keep distal beds explicitly schematic.
3. Correct bilateral cerebral territories, vertebrobasilar supply and dural sinus/jugular drainage independently.
4. Check source availability before adding derived GLB surfaces. Retain shared coordinate conventions and avoid inventing source provenance.
5. Run Node tests, syntax checks, preview build and browser checks of whole, cerebral, pulmonary and renal views, including zero flow and translucent shells.

Acceptance is correction of the represented major topology, not certification of exhaustive or patient-specific anatomy. Exploded organ placement and unsegmented small vessels remain documented limitations.

## Source-asset discovery

The full local archive contains major vascular leaf meshes. Replace the major teaching tubes with a second indexed GLB and restore all six organs to the same heart-relative source frame at runtime. Preserve the original organ package and its source-relative dimensions. Use the authored network only as a loading fallback; retain schematic intracranial and short cervical connectors because those source vessels are absent. Do not animate particles on invented centerlines inside source surfaces.
