# C.16 art submission and continuation

Updated 2026-09-15. Owner request: “submit all to repo”.

## Start here

Use the shared `art/meshy-approved-pilots-2026-09-11` branch in
[mbace1/piritori-eden](https://github.com/mbace1/piritori-eden/tree/art/meshy-approved-pilots-2026-09-11).
Read [ACTIVE_CONTEXT.md](../ACTIVE_CONTEXT.md), [DESIGN_AUTHORITY.md](../DESIGN_AUTHORITY.md)
and [ART_BIBLE.md](../ART_BIBLE.md) before continuing. Character status remains
in [assets/asset_manifest.json](../assets/asset_manifest.json).

## Submitted material

- [All six concept studies](concepts/c16-stylized/README.md): 01 Ink & Gouache,
  02 Printed Night, 03 Lantern Noir, 04 Painted Shapes, 05 Graphic Two-Tone and
  06 Ink After Dark. These are separate PNGs, not a comparison sheet.
- Exact generation prompts: [01–03](concepts/c16-stylized/prompts.json) and
  [04–06](concepts/c16-stylized/prompts-04-06.json).
- Reproducible [Blender generator](../tools/blender/build_kallio_courtyard.py).
- [Scenery GLB](../web/crew-run/assets/kallio-kit-v02.glb),
  [metadata](../web/crew-run/assets/kallio-kit-v02.json) and
  [integrity manifest](../web/crew-run/assets/kallio-kit-v02.manifest.json).
- Painted [plaster](../web/crew-run/assets/painted-plaster-v01.png) and
  [paving](../web/crew-run/assets/painted-setts-v01.png) textures.
- [Implementation notes](C16_ART_FINISH.md), runtime code, browser checks and
  the [release procedure](HUB_RELEASE.md).

Source PRs [#81](https://github.com/mbace1/piritori-eden/pull/81) and
[#82](https://github.com/mbace1/piritori-eden/pull/82) are merged into the shared
source branch. [C.16.1 release evidence](C161_RELEASE.json) records the source,
hub and public verification separately.

Submission audit against source `d21474c49d6df45b2b9945c8e1cf00fb46cfe5ba`: all six PNGs,
both prompt files, the Blender generator, kit files and both textures match
the local deliverables byte for byte. All 96 non-cache files in the partial
C.16 art workspace already exist in source; 95 match the earlier submitted
`2ffdec09` version, and AGENTS.md differs only in line endings from current
source. Later source fixes are preserved; the older local runtime is not copied
back over C.16.1.

## Owner feedback

The owner named 03 and 06. Their last explicit ranking was 03 first, 06 second,
followed by a standalone “6”. Record the shortlist **03 Lantern Noir / 06 Ink
After Dark**; final ordering remains unresolved. The 05 + 04 combination was an
assistant recommendation and is not the owner’s selection.

This is direction feedback, not final art acceptance, character approval or
permission to discard the other studies. Keep the submitted review options
available. Intermediate and rejected art remains private.

## Continue from the released game

[Play C.16.1](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=16.1).
The current source receipt records eight passing source jobs, final hub checks
and public gameplay/hash/controller verification. This documentation submission
does not rerun those tests or create a new playable release.

Next, translate the preferred finish into one reproducible arena treatment
across tactical, oblique, overhead and gun-inspection views. Preserve simple
stand-ins and the existing mechanics. Validate readability and performance on
Pixel 10 Pro and iPad M2, then continue attack timing, gun/cover feedback and
enemy telegraphing under the Mewgenics/XCOM direction. Device acceptance,
concept parity and final fighter/motion gates remain open.
