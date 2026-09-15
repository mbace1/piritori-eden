# C.17 — The Crew Matters

Status: implementation candidate on `feat/c17-crew-matters`.

C.17 connects the existing Night Shift tactical vertical slice to the existing
campaign crew state without replacing either save format or importing the
campaign renderer into the C resolver. It also deliberately stops waiting for
external character models: the active C cast remains procedural development
stand-ins, now with stable individual appearance.

## Goal

A person recruited and developed in the campaign can enter the C tactics pilot
with the same identity, aptitude/build information and supported held weapon;
the outing then returns a small receipt recording who came home, who took a new
wound, who was recovered, or who was left missing. Reloading the same receipt
must never apply those consequences twice.

This is the first bridge, not a migration of every authored fight.

## Entry

Normal Night Shift remains the default:

`web/crew-run/`

The C.17 campaign bridge is explicitly opt-in:

`web/crew-run/?campaign=1`

A direct convenience entry also exists at `web/crew-run/c17/`.

The bridge reads `piritori-to-eden:v3`. If a valid campaign save is present and
has at least two non-missing recruited crew, Night Shift projects the campaign
roster into its preparation screen. The separate `piritori-c12-crew-v1` save
continues to hold the tactical outing/checkpoint. No campaign save is replaced
just by opening the C.17 route.

The campaign's current `state.deployed` preference leads the selectable roster.
A missing recruited person remains in the bridge roster as unavailable and can
become the existing Night Shift rescue target. Retired, arrested and dead people
do not re-enter through this adapter.

## Campaign -> tactics projection

`web/crew-run/campaign-adapter.js` carries:

- stable crew id and display identity;
- the campaign deployment preference;
- aptitudes, existing perks and existing learned skills;
- current career/fight count and campaign condition/status read;
- an authored C-compatible held weapon where one exists;
- missing status for recovery objectives;
- deterministic appearance seed and presentation colour.

The C.16 support-kit trio (boots / medical / light) remains prototype supply.
An aptitude or flavour trait never silently creates free equipment. If campaign
content explicitly authors one of those ids it can cross the boundary; otherwise
the bridge marks the supplied light kit as prototype support.

The same rule applies to weapons. Bat, folding knife and first handgun can cross
when campaign content already authors them for that person. An unsupported
campaign loadout receives a clearly marked prototype bat for the C test; the
adapter never turns an aptitude into ownership. Campaign weapons are locked in
C preparation so the pilot cannot be used to acquire a free gun or knife.

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
- per-person `unchanged`, `damage`, `recovered` or `missing` effect;
- held weapon and tactical HP read for audit.

`applyCampaignReceipt()` applies a receipt exactly once. The receipt id becomes
`memory:c17-receipt:<id>` in campaign flags. A replay/reload of the same result
is ignored.

The bridge is intentionally conservative about health. Surviving the prototype
does **not** heal campaign condition or clear an existing wounded/critical
state. Only new outing damage worsens campaign condition. A missing person who
is actually rescued and extracted returns wounded at minimum living condition;
they are not restored to full health. Anyone left behind becomes missing.
Existing `ageCrew()` advances only the deployed rescuers once, preserving the
current career and three-fight level boundary behavior. The recovered target
does not spend a career fight merely for being rescued. A compact C.17 record
is appended to the existing battle history.

## C.16 save compatibility

Normal Night Shift keeps the existing `piritori-c12-crew-v1` key. If a browser
contains a valid C.16 roster plus an in-progress `c12-v1` tactical checkpoint
that cannot replay under C.17, only that active outing resets to preparation.
Night number, people, wounds, memories and ledger remain. Corrupt saves and C.17
campaign bridge checkpoints still fail rather than being silently rewritten.

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
2. the campaign deployment preference leads C selection;
3. aptitudes do not invent weapons or support equipment;
4. unsupported loadouts stay explicitly prototype supply;
5. campaign weapons cannot be swapped into free prototype ownership;
6. missing campaign crew route into the rescue objective without occupying a
   deployment slot;
7. procedural identity seed is stable;
8. Strength changes the displayed forecast using the same harm path resolution
   consumes;
9. existing wounds remain unchanged without new outing damage;
10. new damage, recovery and missing consequences write back correctly;
11. the existing three-fight level boundary still grants its point;
12. replaying the same receipt cannot age crew or append history twice.

The test is imported by `web/test/crew-run.mjs`, so it runs inside the existing
C laboratory rules gate along with replay, rescue, extraction, arrivals, C.16
checkpoint migration and the legacy tactical regression suite.

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
