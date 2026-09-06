# Anatomical organ assets

This directory contains the local static organ surface bundle used by the teaching renderer. The bundled `anatomy.glb` has six named surfaces: `brain`, `heart`, `lung-right`, `lung-left`, `kidney-right`, and `kidney-left`. Surface geometry is anatomical context only. It is not patient-specific anatomy, exhaustive microvasculature, a CFD mesh, or a clinical device model.

## Source and exact provenance comparison

The intended source is the BodyParts3D Release 3.0 99%-polygon-reduction OBJ archive released 2011-09-15:

- Database description: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html>
- Exact archive: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip>
- Release README: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html>
- Current license page: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>

The exact archive endpoint was checked on 2026-09-05: HTTP `Content-Type: application/zip`, `Content-Length: 134113358` bytes, `Last-Modified: 2011-09-11`, and an archive filename matching the 99% OBJ file named by the Release 3.0 README (127 MiB in that README). The archive contains the OBJ distribution; the linked README is the authoritative human-readable release documentation for that artifact.

The archived README's license section says **Creative Commons Attribution-Share Alike 2.1 Japan** and gives the attribution text “BodyParts3D, Copyright© Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan.” The current license page is marked **Last updated 2025/02/27** and says the database is **Creative Commons Attribution 4.0 International**, with different attribution text. These records conflict. The manifest therefore records `provenanceStatus: blocked-pending-review` and `derivativeReleaseAllowed: false`. Do not distribute or claim a license for a derived mesh until the conflict is resolved by the project owner. Code-owned schematic routes remain the permitted fallback while this gate is open.

## Offline preparation contract

Run the existing preparation script against an explicitly downloaded and extracted source archive:

```sh
node scripts/prepare-organs.js tmp/bodyparts --preview --kidney-source tmp/bodyparts95
gltf-transform weld tmp/anatomy-source.glb tmp/anatomy-welded.glb
gltf-transform dedup tmp/anatomy-welded.glb tmp/anatomy-dedup.glb
gltf-transform prune tmp/anatomy-dedup.glb assets/organs/anatomy.glb
gltf-transform validate assets/organs/anatomy.glb
```

The preparation path is offline packaging, not a runtime dependency. It rotates source coordinates to Y-up/Z-anterior, applies one common uniform scale and stable pivots, removes degenerate triangles, and calculates area-weighted normals. The static native WebGL loader accepts only the narrow GLB 2.0 subset and rejects extensions, external buffers, non-identity node transforms, malformed indices, non-finite positions/normals, and invalid bounds. It does not use Three.js, Draco, KTX2, or a network asset service.

The manifest records source IDs, pre-optimization counts and bounds, normalized transform intent, and the unresolved license evidence. Tissue colors and highlights are renderer-supplied illustrative materials, not source textures. Animated paths and particles are separate teaching overlays and do not imply conservation of blood cells or urine volume.

## Fidelity update — 2026-09-05

The local preview now uses the Release 3.0 **95% polygon-reduction** source for both kidneys (12,394 right / 15,358 left triangles), approximately five times the earlier renal detail. Other organs retain the 99% sources. The exact higher-detail archive is <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip> (547,270,545 bytes). The renal entries were selectively extracted with HTTP Range and verified against ZIP CRC32 and uncompressed lengths. Their SHA-256 hashes are recorded in the manifest.

All six organs now share one uniform scale based on the lung fitting envelope. This preserves relative source dimensions without stretching axes. Source-derived bilateral height offsets are retained: the right kidney is about 15.4 mm below the left in this source. Each manifest record includes source bounds, source-file hashes, the scale, and the baked center used for animation. Patient left is +X, superior +Y, anterior +Z; source millimeters map through `[x,z,-y]` without reflection.

The layout is still an **exploded teaching diagram**, with separated organ centers, rather than an assembled body with registered distances. Arterial paths, capillary beds, urine paths and deformations remain schematic. `FMA7274` is the wall of heart, not a complete chamber/valve dissection. Higher mesh density does not establish clinical accuracy.

`--preview` explicitly enables local preparation while preserving blocked provenance. Without it, preparation requires reviewed provenance; `--release` takes precedence even if `--preview` is also present. Preparing different source files resets their review status. Packaging preserves attribution and source/license evidence. The existing license conflict and distribution gate remain unresolved.

The optimized GLB is 10,581,512 bytes, with 230,738 vertices and 454,298 triangles. It remains extension-free and under the 12 MB budget; glTF Transform weld/dedup/prune avoids a new runtime decoder or dependency.
