# Piritori fighter module — C.06

C.06 adds a wider full-board overview, compact separated fighter tags, a FIT control and orientation reflow pause. See [CAMERA_FRAMING.md](CAMERA_FRAMING.md) for the implementation, test evidence and port requirements.

C.05 added conservative touch rendering and graphics-loss recovery that preserves the current training turn. See [GRAPHICS_RECOVERY.md](GRAPHICS_RECOVERY.md) for implementation and device-test limits. The owner reported graphics loss in C.04; physical C.05 retesting remains required.

C.04 added a night courtyard lighting study based on existing 2D backgrounds.
See [ENVIRONMENT_REFERENCES.md](ENVIRONMENT_REFERENCES.md) for exact references,
lighting choices and the new owner-defined meeting/doorway direction. Dialogue
cut-ins, NPC visits, lit-door availability and campaign transitions remain
specified work; the current entry is still a combat training scene.

Owner direction, 12 September 2026: first make a playable fight using both
repaired characters on both opposing teams, then develop the level and Dream
Loop features, then polish mechanics and animation.

Open `web/fight-module/` from a file server rooted at the repository. This is
an isolated training module: no save-game writes and no campaign consequences.
It does not replace the existing campaign or older Option C cabinet.

## Playable now

- 2v2: F01 Heavy and F02 Wiry on each side, Jade versus Rust garment tints;
  separate 56-joint skeletons, preserved face/hand colors, team rings and labels.
- Mixed, melee and ranged loadout fixtures; each fighter has one action per
  round. Reposition, attack, brace, single-use bandage, talk after round one,
  withdrawal, automatic rounds, win/loss/truce/retreat, restart and result JSON.
- Repaired v05 own-character idle/walk plus temporary runtime gestures for
  attack, brace, item, talk, hit, down and withdrawal. A rehearsal demonstrates
  the motion vocabulary on all four actors and resets the battle afterward.
- Mouse/touch board input, visible cell/target buttons, keyboard commands,
  controller focus navigation, orbit/zoom, visibility pause, context-loss message
  and adaptive low effects. A 16.3 MB pair of GLBs is fetched once per page.

## Rules boundary and known limits

`resolver.js` is a versioned test snapshot of Piritori's `web/js/v3/battle.js`
at main commit `312540d6cc64f644311df38dbf37f6858f74593b`. Imports are adjusted
for this directory. The module fixes the old enemy fallback that inflicted a
hit even when no target was reachable: now that enemy repositions to a legal
attack lane, spending the turn, or braces. It also tolerates untranslated crew
names and emits presentation events. Neither the campaign resolver nor its
callers are changed by this module.

Why isolated: the broader existing battle regression test exposed missing
content names and an unresolved long autoplay run when this fallback was
changed globally. The training module's own fixture tests pass. That is not a
claim that the campaign regression suite passes or that A/C parity is proven.

The fixture explicitly sets both sides to five condition, preserves role guard
and equipment reach, and supplies one training bandage restoring two condition.
This is test content, not a new campaign economy. The phase-based resolver is
still the current browser fallback, not the eventual interleaved initiative
design. Guard regeneration can produce standoffs in the ranged fixture until
you reposition to concentrate fire. Auto is intentionally beatable.

Only idle/walk and the hand-pose demonstration are imported clips. Combat
gestures use the actor's own skeleton and wrist targets; they remain prototype
motion. Prop shapes are test proxies and need grip-specific fitting. A downed
pose is not a death-canon decision. Full retargeting, locomotion/foot-contact
polish, complete equipment animations and final owner art acceptance remain.

All intermediate/rejected art and editable Blender masters stay private.

## Verification

`node web/test/fight-module.mjs` checks mirrored loadouts, action and item
guards, occupied cells, cover, legal enemy fallback, deterministic commands and
training-only results. `web/test/fight-module-browser.cjs` drives real controls
for mouse and touch at desktop, phone, tablet and landscape sizes. Browser
reports are desktop simulation; they do not prove Pixel 10 Pro/iPad M2 speed,
thermal behavior, controller hardware or physical touch acceptance.

## Next, in the owner's order

1. Play this module on Pixel 10 Pro and iPad M2. Capture specific input,
   silhouette, proportions, facing, team-color and motion defects.
2. Develop the first night-lighting study into a deliberate Kallio 2003 location using the Art Bible
   and existing Piritori reference library. Separate floor, architecture, cover,
   props, practical lights, weather and signage; leave tactical routes readable.
3. Resume the Dream Loop workflow with an approved in-engine target and bounded
   screenshot comparisons. Its earlier 4.5/10 checkpoint did not pass; this
   scene is a new gameplay baseline, not a claimed visual match.
4. Add encounter flow, hazards and pressure only through explicit shared rules
   and campaign request/result boundaries. Do not interpret Dream Loop as an
   engine or silently expand the training resolver into all campaign systems.
5. Polish turn pacing, telegraphs, AI, camera, silhouettes and individual
   action/weapon animations after the playable and scenery feedback.

### Port

C.05 is a browser test unit. Godot should reproduce the four-actor fixture,
commands and result vocabulary after owner playtesting. It has not been ported
or accepted on a physical controller.
