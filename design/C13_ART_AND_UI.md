# C.13 — Night Shift art and interface pass

Owner request, 2026-09-13: the C.12 interface showed too little understanding of
the game's designs and style. This is a presentation pass on the connected crew
pilot, preserving its rules and save. It is not a new art approval or a claim
that the imported F01/F02 rigs are fixed.

## Sources actually inspected

- Art Bible §§1, 3–6, 8, 12, 14, 16–17: cut-card interface, painted night stage,
  dark carton / cream / cyan accents, practical light and separated commands.
- UX specification §§5, 8–9: a physical crew ledger, person/condition block,
  labelled command cards, readable consequences and independently reflowed UI.
- `art-library/references/ui/ui-target-battle-landscape-v02.jpg`
  (`99d7c6f4bccee2597aed9b2317ac8f20f602e0cd`) and the portrait target
  (`aedd6d620456838e01cdac738e457d5701888784`): inspected as images.
- `art-library/references/stages/stage-park-gazebo-night-v01.jpg`
  (`c1614dfe9393107752a1555b8485487bccc048cd`): warm practicals, dark outer
  foliage and a quiet crossing-path stage. Read its reference README.
- ACTIVE_CONTEXT, DESIGN_AUTHORITY, Scenario Atlas, Option C slice brief and
  shared A/C tactical direction. Later Move + Act/variable-participant rulings
  supersede the older formation limits in the reference UI; do not revert rules
  to copy a picture.

The reference images are direction evidence, not shipping plates or approvals
of this implementation. No reference sheet has been cut into runtime art.

## What changes

Preparation keeps the live scene behind a mission note and crew ledger. People
have identification portraits rendered from the same neutral figures used on
the board. Equipment moves into one dedicated view with three weapon and three
support cards, each with a silhouette, label, selection state and effect. The
initials tiles and six simultaneously expanded equipment forms are removed.

Battle uses a shallow objective/pressure strip, compact crew selector and a
selected-person block carrying condition, guard, ammo and separate Move/Action
availability. Large labelled command cards use the held weapon's silhouette.
Mission actions appear when their location/target prerequisite is satisfied;
the goal and field notes explain where to unlock them. Withdraw and End round
stay separate. Forecasts and stored enemy plans retain their real values.
Dashed ground arrows express attack direction and previewed movement. Graphics
metrics and prototype details move out of the play surface into the help/test
context.

The stage uses a stronger sodium key, cooler fill, restrained warm spill near
the rear practicals, quieter outer ground/foliage and warmer stone. The same
geometry and cover anchors remain. Crew framing fits the legal board bounds
instead of imposing the extra laboratory width; capacity fixtures keep their
old framing. One extra unshadowed point light, no added shadow map or reflection
buffer. No paid generation or character re-authoring.

## Reproduction and resource contract

- UI construction lives in `web/crew-run/style.css`, `icons.js`, `ui.js` and
  the crew entry. Text is real DOM text; hit targets stay rectangular.
- Barlow Condensed SemiBold is bundled unmodified from `google/fonts`, original
  Git blob `9df66576492bee4bd0559066825472808fa98adc`, with its SIL OFL file.
  Body text uses the system sans face. No font CDN or paid font dependency.
- Portraits use the existing renderer, short-lived 160×188 render targets,
  CPU sRGB encoding and an outfit-keyed PNG cache. No second WebGL context.
  They honestly show the temporary figures, not unrelated approved faces.
- Night lighting is an explicit crew-only argument to the existing park;
  Bear Path's authored variants and the capacity labs retain their treatment.
- `tools/publish/arena_lab_files.json` admits only the four new code/font files.
  Reference images, private previews and production masters remain excluded.

## Verification and open work

The browser gate drives equipment changes, rescue, individual extraction,
reload, context restoration, aftermath and the next outing through actual
controls in desktop, phone portrait, short landscape and tablet layouts. It
checks loaded portraits/font, page overflow, visible End round and world size.
Visual review includes preparation, equipment, battle, move preview and
aftermath. Record exact test/merge/Pages facts in the release receipt after
deployment; this document is not a substitute for those checks.

This remains a development art pass. The imported fighters and their final
portrait/animation quality, complete localization, physical Pixel 10 Pro/iPad
M2 acceptance, and the authored city bridge remain open. Do not promote any
asset lifecycle gate based on this pass.

### Port

Reproduce the command/ledger hierarchy, contextual commands, intent arrows,
selected-unit information, night palette and bounded framing in Godot. Preserve
the C.12 action vectors and saved crew behavior. No new economy/chapter rules.

Review corrections: weapon and support remain independent. Equipped bandages
stay accessible alongside Reload; the console fits three to five commands.
Compact crew records retain outings survived, wounds, aptitudes and the latest
memory on the planning screen. Browser checks exercise a handgun/light-pack
self-heal through actual controls and retained history after an outing.

## Delivery receipt

Source PR #78 and hub PR #517 merged after exact-head gates passed. All 49
cabinet blobs matched staging. The packaged outing passed in four layouts,
and the public card and actual game controls were checked after Pages succeeded.
Exact commits, run and test scope: [C13_RELEASE.json](C13_RELEASE.json).
