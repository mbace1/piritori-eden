# C.12 — Night Shift: a crew that comes home changed

Owner request: “Try for a bigger leap.” This batch connects preparation, the 3D
fight, an objective other than eliminating everyone, and a persistent aftermath.
It follows GDD §12, COMBAT §§5/7/9.5/9.12, the Art Bible, Scenario Atlas and the
shared A/C direction. It is a repeatable gameplay pilot, not a newly authored
chapter mission. Bear Path's existing choices and the city campaign retain their
own rules and saves. Jaska, Slomo and Arvo are not generated combatants.

## What you can play

- Six deterministically named crew, using `people/roster.mjs`. Choose two or three
  ready people, weapons and support equipment before committing an outing.
- A stranded colleague in the Bear Park environment. Reach them and use Help.
  They get up and can move immediately, then act from the next round. Bring each
  survivor to any south-edge cell and Extract. Clearing rivals is not required.
- Equipment creates permissions: boots spend Action for another Move; a medical
  kit improves Help and permits one adjacent treatment; a light pack carries a
  self bandage. Bat, knife and handgun retain the C.11 weapon forecasts.
- Full stored enemy plans, directional cover, flanking, grounded temporary
  weapon motion, optional action focus and the existing wet-paving light probe.
- Heat from turns (+1), gunshots (+1) and downs (+2). At five, two rival entries
  are announced at A8/F8 before arriving after the specified enemy turn. They
  cannot attack on entry. A blocked entrance delays that arrival. This is a
  hostile-rival pilot, not the full police/disposition system.
- Individual extraction, helping a fallen ally once, and a clearly warned
  emergency retreat with everyone standing. Downed people left behind become
  missing; recovery is a future objective, not automatic death.
  Retreat never substitutes for completing the objective: the rescued person
  or the recovered kit's carrier must explicitly extract from the south edge.
- A one-time aftermath. Names, configured equipment, survived outings, wounds
  and memories persist in this browser. Wounded returnees miss the next outing;
  a recovery night restores availability. Missing colleagues become the next
  rescue target. With everyone recovered, the next objective is lost-kit pickup.
- A reserve fallback keeps a depleted roster playable. Weapons and replacements
  are supplied for this pilot; campaign prices, wages, gear scarcity, progression,
  retirement and chapter-boundary degradation are not implemented by this batch.

The north/east staging alternates within the same park kit. This tests reusable
objectives, not additional authored locations. Trait text is background from the
existing generator; it does not imply that every trait has a combat effect.

## Implementation and recovery

`web/crew-run/run.js` owns the crew ledger, mission configuration and settlement.
`ui.js` presents preparation/aftermath and contextual commands. `main.js` uses
the existing renderer and grounded stand-ins, including a rise motion, distinct
muted coat colours and hidden departed/reserve actors. The two approved Meshy
pilots are not replaced, repaired or promoted by these temporary bodies.

The tactical resolver accepts an optional mission policy. Ordinary lab/campaign
sessions do not inherit rescue rules. C.12 mission rules are `c12-v1`; saves use
`piritori-c12-crew-v1`, separate from campaign and C.11 capacity fixtures.
Committed commands save before animation. Reload reconstructs the mission from
its immutable launch configuration and replays/compares the checkpoint. Settlement
requires the matching active outing and cannot run again from aftermath. Context
restoration rebuilds presentation from committed state, including revived and
extracted people. A lost-context shader-link race is caught only while the GL
context actually reports loss; ordinary rendering errors still surface.

## Validation

`web/test/crew-run.mjs` checks permissions, rescue/extraction, deterministic replay,
pure previews, wounds/rest, roster fallback, objective completion, warning before
arrivals, no entry attack, and a legal nonlethal opening played to all four home.
`web/test/crew-run-browser.cjs` plays that outing through real controls at desktop,
phone portrait, phone landscape and tablet sizes; reloads after rescue and
aftermath, forces graphics recovery, then starts/withdraws from the next outing.
Local browser pass: all four layouts, zero page/console errors. The existing lab,
cover, camera, recovery and authored campaign CI gates remain required.
Retreat confirmation uses the same pointerup/touchend/click activation helper as
the rest of the fight. The crew suite also exercises those separate event paths.

Desktop browser emulation is not Pixel 10 Pro / iPad M2 hardware acceptance.
Final rig quality, actor overlap, art approval and full city/chapter integration
remain open. Do not describe C.12 as the complete campaign or concept-art parity.

## Port

Port `run.js` and its test vectors before claiming connected-crew parity. Keep
Move and Action separate; Help grants immediate movement but spends the rescued
person's current Action. Extraction removes a target from hostile plans. Arrivals
are forecast before entry and never fire in their entry event. Apply aftermath
once, then advance the outing and availability. Keep this pilot ledger separate
until an explicit campaign migration is designed and tested.

## Next integrated batch

Use these tested state boundaries to connect one authored meeting/escalation and
its exact effect dispatch to the existing city. Then add meaningful bounded gear
ownership and crew abilities, and replace stand-ins only after the character
pipeline's visual/device gates pass. Reuse the same mission/crew contract for A;
do not create another roster generator or silently author a new chapter track.
