# Current Act I cast — production packets

**Review planning only. No new character, story, source image, rig or approval is created here.** [characters.json](characters.json) covers all 21 distinct participant identifiers across the 17 currently authored encounters, the six authored crew slots, the existing news presenter and the generated-hiring appearance system. The 26 active packets are production records, not 26 new people. One existing hooded-woman concept remains deferred outside the authored cast. Act I remains 48% under [ROADMAP.md](../../../ROADMAP.md).

Each packet records source chronology, locations, registered assets with their exact approval/production values, actual provenance paths, required motion, next steps, acceptance checks, identity/system constraints and an explicit placeholder. Top-level `source` fingerprints 115 existing source files. Source files and approval registers are read, never modified.

## Begin with the listed work

Existing Scene Club work comes first: inspect the recorded Jaska and Aatami-front blink repairs, arrival/return staging and choice readability. The original approved Jaska rig stays approved; the repair is a candidate. Aatami front and side both remain semi-approved, and **the side rig is unassessed by the front repair study**. Toko's approved counter rig is the construction/motion reference; it does not need a replacement face. Any new Toko staging or repair would have its own candidate gate.

After that, the first source-selection queue uses the current authored sequence rather than the encounter array's storage order:

| Order | Packet | Actual first use | First concrete production step |
|---|---|---|---|
| 1 | `seller-esa` | Day 1 day, Piritori | Select one existing approved-source identity for the pocket-bag seller; preserve it for his Day 5 firearm scene. |
| 2 | `buyer-leena` | Day 1 night, outside the staffed-bank queue at Siltasaari | Select the buyer's identity and restrained impatient/listening motion; do not put her behind the counter. |
| 3 | `crew-slot-runner` | Day 2 night, Harju / Brahenkenttä tram-stop edge | Audit its assigned modules and approved runner poses, then resolve the conflicting prose/name evidence before a dedicated cut-in selection. |
| 4 | `teller-anne` plus `bank-clerk` clarification | Anne: Day 3 day; later clerk: Day 7 day, same bank site | Select Anne's source and clarify whether the later identifier is the same person before commissioning a second face. |
| 5 | `sean-mccormick` | Day 4 night, McCormick yard at Linjat | Select a source for Sean as an individual; keep the muscle slot and later brothers distinct. |
| 6 | `mei-lan` | Day 6 day, Hakaniemi restaurant front | Select the individual workplace contact; stage queue/invoice gestures without a faction stereotype. |
| 7 | `kello` | Earlier clues/road encounter, then conditional Day 8 reckoning at Piritori | Select one source for the watch/bench identity; review both present-person and authored empty-bench branches. |

“Select” does not mean “approve by assignment.” The shared modular library is approved as a baseline; that does not identify a particular unassigned face as Esa, Leena, Anne, Sean, Mei Lan or Kello. Their packets list real shared-source paths but **no invented registered rig or face assignment**. Do not generate replacements until this audit/source-selection work establishes a genuine source gap.

## Existing speaker readiness

| Person | Existing register evidence | Production boundary |
|---|---|---|
| Aatami | `cutin-aatami-front-rig-v01` and `cutin-aatami-rig-v01`; owner-committed study 06 and selected young final | Both rigs remain semi-approved. Front repair/staging candidate is reviewable; side is not assessed or promoted. |
| Jaska | `cutin-jaska-rig-v01`, approved; concept v03 | Preserve identity, glasses, waist-up framing and short bottom-tail bubble. Blink-mask repair remains a separate candidate. |
| Toko | `scene-toko-rig-v01`, approved eleven-piece counter rig from the approved v02 source | Preserve fixed gold mask, source-specific counter boundary and existing clips. The Scene Club study did not create or approve a Toko repair. |
| Arvo | Approved v05 presenter source/model; `cutin-arvo-rig-v01` semi-approved | News-specific read, glance, blink/jaw and restrained gesture review. Existing alternative-look concepts are candidates, not approved wardrobe variants. No enterable Arvo venue is added. |

Arvo's role remains source-status presentation: DOCUMENTED, INFERENCE, ACCUSATION and FICTION must remain readable. He is a fictional homage, not a literal likeness or mouthpiece of the real journalist.

## Crew slots are not new named cast

The content assigns six slots their existing portrait, torso and leg IDs. The first three (`runner`, `watcher`, `muscle`) have `named:true` for authored persistence/career behavior; `fixer`, `driver` and `local` have `named:false`. Their display names are generated separately by `people/roster.mjs`. A generated name example is not a newly locked biography, gender, appearance or named source selection.

All six packets retain the actual content-assigned module IDs and files. That is evidence of existing modular source, **not evidence of an approved dedicated waist-up speaker rig**. The three later slots also retain their recruitment metadata without pretending that metadata places them visibly in an encounter. In particular, the driver is not a second bank teller and the local is not a newly invented courtyard resident.

The generated-hiring packet covers the existing pool's repeated six-head/seven-role presentation. It proposes an appearance audit after the listed authored contacts, not seven new story characters. Names, ethnicity/nationality and role/aptitude draws remain separate; no origin becomes a combat class or moral silhouette.

## Groups, conditional people and offscreen labels

The source participants include six group labels, one offscreen label and several background/context roles:

- `aatami-network-team`: current deployed people, not a fixed portrait trio. Aatami fights every Chapter 1 battle; the shot-caller transition is later work.
- `piritori-rival-team` and `courtyard-rival-team`: authored opponent groups. Use battle records/roles and current neutral stand-ins; do not invent named rivals or turn protected narrative people into enemies.
- `lunch-crowd`: quiet workplace context around Mei Lan, not named customer commissions or faction combatants.
- `optional-surviving-crew`: only the actual surviving roster, and legitimately empty when the campaign has no such people.
- `mccormick-brothers`: the later family-call group, not a second canonical Sean or permission to invent two brothers' names/biographies.
- `jaska-offscreen`: absence/offscreen reference at the courtyard. His approved source is inventoried, but the label does not put his cut-in in the fight.
- `dog-owner`: an authored park context participant. A neutral owner silhouette is sufficient until a visible source is selected. Existing dog key poses are an adjacent animal-source baseline, not the owner's identity.

C.19 remains the actual tactical battle. These presentation packets do not replace positioning, weapons, intent, police timing, getaway objectives or persistent crew outcomes with dialogue cards.

## Identity and location uncertainties to preserve

1. **Anne / later clerk:** `teller-anne` and `bank-clerk` are separate IDs at `staffed_bank`. No explicit alias proves they are the same person. Keep the later clerk neutral until that high-level identity question matters to production.
2. **Runner:** the prose says “she”, a legacy effect still uses `relationship:mira`, and the runtime name function yields Reijo Virtanen. This packet does not canonize Mira, that example name or a final gender from contradictory sources.
3. **Mei Lan / muscle:** `mei-lan` is the authored Hakaniemi restaurant contact. The muscle slot's generated example Lan Ho is unrelated. No shared face or new family relationship is inferred.
4. **Kello:** `participants[]` still lists him on Day 8 even when `kello-sold` supports an empty bench. His presence must follow the authored branch, not the list alone.
5. **Courtyard / studio:** this draft corrects `enc-courtyard-last-call` to `torkkelinmaki_courtyard`, aligned with schedule/override/mission/battle at Torkkelinmäki. Scene Club remains at Mäkelänsilta. Keep these places distinct and Jaska offscreen; art and figure staging remain unapproved.
6. **Recruit metadata:** the fixer, driver and local `recruit_encounter_id` values do not make them visible participants or add recruitment dialogue to those encounters.

The current map/site data and scenario atlas take precedence over the stale venue table in `MAP.md` for the Scene Club and Jade front. The JSON records chronology from `content.schedule`, so the first sale correctly precedes Jaska's Day 2 visit despite its position in the encounter array.

## Deferred existing source, not a new storyline

The hooded camera woman has existing concept variants v01–v03 and older 3D material. No dedicated paper cut-in rig is registered, no source is selected/approved by this packet, and no matching participant occurs in the current seventeen encounters. She lives under `deferredExisting[]`, with actual source paths and a selection/extraction gate. Do not add a mission or dialogue merely to use her concept. Later-generation family cast also remains outside this current Act I production queue.

## Acceptance sequence

1. Confirm the actual role, current scene/branch and existing source before choosing a visual identity.
2. Record source selection separately from visual approval and rig/motion acceptance.
3. Extract separable head/torso/eyelid/hand pieces only for a selected source; reuse shared idle, blink, talk, head gesture and reaction grammar where it fits the role.
4. Show actual motion at 390×844 and 1280×800. Inspect identity/proportions, neck/eye seams, bubble clearance, first-screen choices, reduced-motion rest and browser errors.
5. Keep all new source, repair, staging and motion work labelled candidate until owner review; browser emulation does not close physical Pixel/iPad acceptance.
6. Integrate one approved playable presentation at a time under ROADMAP milestones 4/5, preserving C.19 and the actual campaign/save/receipt behavior. Do not increase completion percentage for packets alone.

## Verify the inventory

```
node art-src/reviews/act1-production/cast-test.mjs
```

The source test verifies all 17 encounters and 21 participant IDs, all six crew slots, required packet/plan fields, actual provenance paths, existing registered rig/asset IDs, exact approval/production values, no fabricated face assignment for the new source-selection contacts, the Aatami semi-approved/unassessed-side gate, Arvo's news-only role, deferred hooded-woman placement and all 115 source hashes. No runtime or approval file is written by the test.
