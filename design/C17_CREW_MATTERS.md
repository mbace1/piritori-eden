# C.17 — The Crew Matters

Status: implementation candidate on `feat/c17-crew-matters`.

C.17 connects the existing Night Shift tactical vertical slice to the existing
campaign crew state without replacing either save format or importing the
campaign renderer into the C resolver. It also deliberately stops waiting for
external character models: the active C cast remains procedural development
stand-ins, now with stable individual appearance.

## Goal

A person recruited and developed in the campaign can enter the C tactics pilot
with the same identity, aptitude/build information and held weapon; the outing
then returns a small receipt recording who came home, who was wounded or left
missing, and that the deployed crew spent a fight. Reloading the same receipt
must never apply those consequences twice.

This is the first bridge, not a migration of every authored fight.

## Entry

Normal C.16.1-style Night Shift remains the default:

`web/crew-run/`

The C.17 campaign bridge is explicitly opt-in:

`web/crew-run/?campaign=1`

The bridge reads `piritori-to-eden:v3`. If a valid campaign save is present and
has at least two available recruited crew, Night Shift projects those people
into its existing preparation screen. The separate `piritori-c12-crew-v1` save
continues to hold the tactical outing/checkpoint. No campaign save is replaced
just by opening the C.17 route.

## Campaign -> tactics projection

`web/crew-run/campaign-adapter.js` carries:

- stable crew id and display identity;
- aptitudes, existing perks and existing learned skills;
- current career/fight count and campaign condition read;
- an authored C-compatible held weapon where one exists;
- deterministic appearance seed and presentation colour.

The C.16 support-kit trio (boots / medical / light) remains prototype supply.
An aptitude or flavour trait never silently creates free equipment. If campaign
content explicitly authors one of those ids it can cross the boundary; otherwise
the bridge marks the supplied light kit as prototype support.

C.17 currently hooks only already-existing numeric perk behavior into the C
resolver: Toughness raises the tactical HP ceiling and Strength raises weapon
harm. Strength is added inside `forecast()`, so preview, enemy danger reads and
resolved damage all consume the same value. Skills and aptitudes are carried in
the unit record for the next behavioral pass; this batch does not invent new
skill effects.

## Tactics -> campaign receipt

Settlement emits:

- `bridgeReceiptId`;
- deployed crew ids;
- objective success, rounds and pressure;
- per-person returned / wounded / missing state;
- held weapon and tactical HP read for audit.

`applyCampaignReceipt()` applies a receipt exactly once. The receipt id becomes
`memory:c17-receipt:<id>` in campaign flags. A replay/reload of the same result
is ignored. Returned people become available; wounded people lose one campaign
condition point and become wounded; people left behind become missing. Existing
`ageCrew()` advances the deployed crew once, preserving the current career and
three-fight level boundary behavior. A compact C.17 record is appended to the
existing battle history.

The rescued target is not automatically counted as deployed: rescuers spend the
fight; the recovered person changes status because they came home.

## Procedural development cast

`web/fight-module/stand-in.js` remains the character provider for the C route.
No external fighter GLB, Meshy job or rig is required.

C.17 adds deterministic variation from `appearanceSeed` / crew id:

- body and leg proportions within the existing readable silhouette;
- coat length, trousers and footwear variation;
- optional beanie, scarf and small bag;
- skin / dark-clothing / accessory value variation independent of name/stats;
- a small brow/facing cue;
- subtle idle weight shift and breathing.

It retains the current procedural walk, cover crouch/peek, aim/fire/reload,
melee, hit/down motion and exact lower-support grounding. The body is still one
instanced mesh draw per fighter. These are intentionally stylized placeholders,
not production character approvals.

## Test contract

`web/test/c17-campaign-bridge.mjs` asserts:

1. campaign identity/build data crosses the adapter;
2. aptitudes do not invent prototype support equipment;
3. procedural identity seed is stable;
4. Strength changes the displayed forecast using the same harm path resolution
   consumes;
5. wounded / returned / missing consequences write back correctly;
6. the existing three-fight level boundary still grants its point;
7. replaying the same receipt cannot age crew or append history twice.

The test is imported by `web/test/crew-run.mjs`, so it runs inside the existing
C laboratory rules gate along with replay, rescue, extraction, arrivals and the
legacy tactical regression suite.

## Deliberately not in this batch

- no external character models, rigging or Meshy spend;
- no new campaign trait or aptitude powers invented by the adapter;
- no boss system;
- no new arena required to prove the bridge;
- no replacement of the authored campaign battle resolver;
- no merge of the whole C stack into `main` by force.

After this bridge proves clean, the next mechanics pass should make selected
existing skills/aptitudes behavioral in C, then add board-changing mechanics
(push/control, degradable cover, authored objective variants) while preserving
full enemy intent and forecast honesty.
