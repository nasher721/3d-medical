# Step 01 dated source snapshot

Snapshot date: 2026-09-05

## URLs and exact comparison

Archive: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip>

Release README: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html>

Current license: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>

The archive endpoint returned HTTP 200, `Content-Type: application/zip`, `Content-Length: 134113358`, and `Last-Modified: Sun, 11 Sep 2011 08:00:53 GMT`. The Release 3.0 README identifies the matching `BodyParts3D_3.0_obj_99.zip (127MB)` 99% polygon-reduction OBJ artifact and records the 2011-09-15 data update.

The archived README license sentence, retained verbatim, is:

> license for this database is specified in Creative Commons Attribution-Share Alike 2.1 Japan.

Its required attribution text is:

> BodyParts3D, Copyright© Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan

The current portal license page is marked:

> Last updated : 2025/02/27

and states:

> license for this database is specified in Creative Commons Attribution 4.0 International.

Its attribution text is:

> BodyParts3D, © Database Center for Life Science licensed under CC Attribution 4.0 International

These are materially different license records. The project therefore records a provenance conflict and blocks distribution of derived meshes pending source-owner resolution. No checksum is asserted here; the asset lane owns any future checksum attempt.

## Reproducible retrieval/comparison

```sh
curl -L -I --max-time 45 \
  https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip
curl -L --fail -o /tmp/bodyparts-readme.html \
  https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html
curl -L --fail -o /tmp/bodyparts-license.html \
  https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
```

Compare the two extracted license sections byte-for-byte after HTML decoding; the differing license names and attribution strings must remain visible in the review record.
