# C.10 proposal — readable, directed combat

Status: implementation plan; not shipped. Recorded 2026-09-13 after the owner tested C.09.1.

The owner reports that the playable is good and asks for attack animations, guns, cover, progress toward concept-art parity, Star Wars Zero Company camera features and Metal Slug Tactics telegraphing/movement. This accepts the usefulness of the playable baseline; it does not promote placeholder art or approve final rigs. C.09.1 remains the live build.

## Grounded starting point

Read ACTIVE_CONTEXT, DESIGN_AUTHORITY, ART_BIBLE, OPTION_C_VERTICAL_SLICE and CAMERA_AND_SCENES first. The current controller already plays basic strike/shoot/hit/down gestures and shows legal move/attack targets. Stand-ins have simple temporary weapons, currently visible only during selected actions. Impact presentation is a generic target spark. Manual orbit/zoom/FIT and scenery cutaway exist. These systems need richer presentation and clearer tactical information, not a claim that all combat animation is absent.

Use the current arena and existing bat, knife and handgun equipment first. Keep the approved F01/F02 identities and production gates. No new paid Meshy jobs, roster expansion, campaign mission or engine migration follows from this plan.

## First playable batch: proposed C.10

1. **Combat choreography.** Persistent held-weapon silhouettes in ready poses; weapon-specific anticipation, aim, recoil or swing, contact, reaction and recovery. Distinguish bat and knife. Route muzzle flash, short tracer, cover impact, guard absorption and condition damage from the resolved action events. Never play a successful body hit merely because an attack was requested. Present cover taking damage only when the rules actually resolve it. Small spatial sound cues complement rather than replace visible information. Commit results once; camera or graphics recovery cannot repeat damage.
2. **Movement and cover preview.** Show a destination ghost, legal route, action cost, available attacks and the cover benefit or obstruction that the resolver actually provides. Preview is reversible and does not spend resources or consume gameplay RNG. Follow the displayed traversable route in animation, with facing and planted stops. Audit current slot movement before drawing a path: if it has no obstacle path semantics, implement and test a shared route function before claiming obstacle-aware travel. Distinguish cover from decoration through restrained edge/footprint cues. Keep front/middle/back formation meaning.
3. **Enemy intent.** Selecting an opponent reveals action type, threatened cells/target and timing using icons plus text and patterned ground marks. Clearly distinguish a committed intent from a conditional forecast that may change after movement. Preview the consequence of the selected destination using the same rules as execution. Avoid twelve permanent overlapping laser lines; default to threats relevant to the selection, with an explicit all-threats view.
4. **Directed camera.** Stable planning overview; optional brief attacker/target focus at suitable actions; return to the saved planning view before the next choice. Keep source, target and relevant cover readable. Respect manual orbit/zoom until FIT resets automatic control. No surprise axis reversal or camera passing through scenery. Provide action-camera frequency/off and reduced-motion behavior. Small screens and crowded views may retain overview when a close shot cannot frame the necessary context.
5. **Visible art improvement in the same batch.** Strengthen one motivated warm practical against cool night fill, contact grounding, restrained wet-surface highlights and material separation for stone, timber and iron. Keep playable ground quiet. Build/reuse simple weapon and cover props through versioned Blender recipes; render/effects/camera are JS work. Do not wait for final Meshy rigs to test staging with the authorized stand-ins.

## Reference lessons, not automatic rules imports

- EA documents Zero Company's adjustable/off Action Camera and highlights for obscured characters/cover. Our overview/focus/return policy above is a Piritori design proposal informed by that reference, not a claim to reproduce every camera behavior.
  https://www.ea.com/able/resources/star-wars-zero-company
- Dotemu's Metal Slug Tactics guide describes movement generating Dodge and Adrenaline, additive cover protection and positioning for synchronized attacks.
  https://news.xbox.com/en-us/2024/11/06/five-things-before-you-dive-into-metal-slug-tactics/
- Use MST as a reference for expressive traversal and legible tactical choices. The detailed telegraph contract above is our proposal. Copying movement-generated defense or free team attacks would change Piritori's balance; do not silently add those in an effects pass.

## Following experiment

After C.10's readable baseline, compare the current one-action turn with a clearly labelled laboratory variant allowing one reposition plus one action. Measure whether repositioning, cover and retreat become meaningful without requiring constant running or making defensive play pointless. Movement rewards, synchronization attacks, directional cover and destruction need explicit rule design and replay/port vectors before campaign adoption. They are not all prerequisites for C.10.

Then assemble the second small arrangement from the same environment kit, using the scenario atlas before any new location/mission authoring.

## Concept parity and release gate

Compare real runtime captures with existing preferred concepts from matched views: composition/depth, motivated light, material separation, contact/occlusion, and action readability. Character fidelity stays honest. A comparison preference is not whole-image approval. Keep intermediate/rejected captures private; share a finished playable action sequence and selected evidence when it improves.

C.10 must demonstrate a route preview -> move to useful cover -> inspect threat -> fire/strike -> correct impact/reaction -> camera return sequence. Test both sides, legal/blocked targets, guard versus condition damage, downed units, 2/6/12 participants, portrait/landscape, keyboard/touch/controller pathways, manual camera interruption, reduced motion and graphics loss during attacks. Replay must resolve each command once and previews must leave the snapshot/RNG unchanged.

Retain measured quality tiers and the C.09.1 performance baseline. Desktop emulation is not Pixel 10 Pro/iPad M2 acceptance. Publish the tested source batch, merge, publish the hub cabinet and verify its actual public route under HUB_RELEASE.md. Each playable release includes Godot port notes/vectors for changed rules. This document-only plan creates no new playable version.
