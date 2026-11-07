# Act I location production plans — listed content first

These plans cover existing authored Act I only. They add no location, room, story, source art, runtime binding or approval. `ROADMAP.md` remains the plan of record; its completion estimate stays **48%**. The JSON is the structured packet source for the review UI, not replacement campaign content.

`locations.json` contains **12 packets**: the **11 current active map anchors** and one explicitly **shared dynamic travel/arrival packet**. Coverage is all **17 encounters, four missions, three optional visits, 16 door templates and 29 road events**. Four existing non-active anchors remain separately deferred. Source paths and SHA-256 values are recorded in top-level `source.hashes`.

## Production order

Start with the listed plans and review gates below before proposing more content. Existing plates are references, not evidence that every view is built or approved.

| Priority | Packet | Concrete next work | Gate / limit |
|---|---|---|---|
| 1 | **Scene Club / Mäkelänsilta** | Finish review of the existing Jaska/Aatami front motion, bounded blink candidates, arrival and return; make source-backed receipt/last-light crop and conditional-prop lists. | Scene Club room and Aatami rigs retain their recorded semi-approved states. Outdoor bridge arena is a separate view, with no registered plate. |
| 2 | **Siltasaari bank and outside queue** | List legal counter, exterior first-sale/queue and later-ledger views; review the available bank interior only for counter/ledger; source-select Leena/Anne/clerk before more portraits. | **First sale stays outside the legitimate bank queue.** An interior crop cannot substitute for that unbuilt exterior. Pasila remains a brochure/future subject while this scene is in Siltasaari. |
| 3 | **Harju / Brahenkenttä** | Use the available pitch as a proposed background; plan the unbuilt timetable/stop-bench/bag/cart foreground and existing Thursday/Three Vans state variants. | Pitch art does not prove the tram-stop composition exists; crew-slot identity follows actual roster data. |
| 4 | **Hakaniemi market / Jade front** | Review the current Jade-front crop, ordinary lunch queue, invoice and closed-door layer; source-select Mei-Lan and ambient crowd treatment. | **Current Jade location is Hakaniemi**, regardless of older Linjat references. Do not invent a back-room scene or make civilian staff universal enemies. |
| 5 | **Torkkelinmäki porttikongi** | Preserve the corrected site contract; compare the proposed courtyard plate, existing door illustration and actual C.19 arena at matching cameras. | The draft aligns the existing porttikongi to `torkkelinmaki_courtyard` at Torkkelinmäki; Scene Club stays separate. This approves no art. |
| 6 | **Piritori returns, park continuity, Linjat accounts, Toko loops** | Plan source-backed bench/watcher/receipt/photo/account/kettle/van variations; keep exact recruitment, information, obligations and return-memory semantics. | Conditional props must read actual flags/crew state. No invented survivor, death, identity, reward or chapter-2 scene. |
| 7 | **Sörnäinen harbour / quay** | List existing docks/quay camera views and authored container/clock/van layers; review the actual quay set, escort/exit and chapter-return composition. | Current finale contract stays intact. The roadmap’s choice-versus-played-fight decision is not answered by a new illustration or boss. |
| 8 | **Suvilahti and separate outdoor kit views** | Make explicit current borrowed plates/stand-ins, then plan only source-wanted exterior/loading/exit dressing against actual C.19 captures. | Five reused C.19 sets serve eleven anchors; this does not certify bespoke site-accurate geometry. |
| 9 | **Shared road / arrival framing** | Review one real transit, one arrival and one forced event before more drawing; make actor/prop lists from existing events. | There are 29 dynamic event records, **not 29 new canonical locations**. |

## Map anchor, site/room, illustration and tactical kit are different layers

| Existing anchor | Contact/site view | Current actual fight-place mapping | Distinction to preserve |
|---|---|---|---|
| `makelansilta` | Scene Club, `jaska_studio`, existing interior | Under Mäkelänsilta; **street**; no plate; bridge-stair exit | Jaska’s home/contact room is not the outdoor bridge arena. |
| `siltasaari` | `staffed_bank`; first sale outside, teller/ledger inside | Siltasaari shore; **street**; no plate; back over bridge | An illustrated bank meeting cannot relocate a fight into the teller service. |
| `harju` | `harju_pitch`; proposed pitch plus unbuilt stop edge | Brahenkenttä; **park**; pitch plate; fence-gate exit | A reused park kit is not a new tram-stop model or tram simulation. |
| `hakaniemi` | Market and `jade_lantern_front` | Behind market hall; **street**; Hakaniemi square plate; tram-stop exit | Ordinary restaurant/market remains at current Hakaniemi. |
| `torkkelinmaki` | Courtyard conversation uses corrected `torkkelinmaki_courtyard` site | Courtyard; **courtyard**; courtyard-v05 plate; porttikongi exit | Door illustration uses backyard-v01, while fight place uses courtyard-v05. Both are prototype references. |
| `piritori` | First-buy/metro square, seller/Kello/watch/bail/case views | Vaasanpuistikko; **street**; square plate; metro-step exit | Current bail door is the duty-lawyer contact at the square, not automatically a bank service. |
| `karhupuisto` | Watcher/bench and Bear Path clearing | Clearing; **park**; clearing plate; lit-path exit | Approved park mood/background and semi-approved clearing do not replace the actual bear/plinth tactical layout. |
| `linjat_yard` | McCormick service-yard contacts and accounts | Linjat yard; **yard**; service-yard plate; lit Hämeentie passage | Battle template names do not move this door to another location. |
| `vaasankatu` | Tokon Ramen room and approved paper Toko | Bin yard; **courtyard**; backyard plate; Vaasankatu gate | Indoor counter and outdoor fight yard remain separate; Toko is not a fighter. |
| `sornainen_harbour` | `sornainen_quay`; shipment uses docks-v02 illustration | Quay; **quay**; quay-v01 plate; rail-line exit | Docks illustration, actual quay set and operation decision are separate layers. |
| `suvilahti` | Existing yard/Kattilahalli sites; door borrows docks-v02 | Behind boiler hall; **yard**; service-yard-v01 with `stand_in:true`; gas-holder exit | Borrowed image does not relocate this door to the harbour or prove a boiler-hall interior exists. |

The actual five-kit mapping is present in `web/js/v3/outing.js` and `web/crew-run/locations.js`: **courtyard, yard, park, street, quay**. Older `places-v1.json.rules.kits` / `kits_wanted` metadata predates implemented street/quay work. Do not call those kits unbuilt solely from that older list. Conversely, a working generic kit does not prove a source-accurate bespoke location or physical-device acceptance. Each packet keeps `bespokeSiteGeometryAccepted:false`.

## Source-bound view packets

Every physical packet includes:

- exact map anchor, current site IDs, encounter IDs and door IDs;
- linked mission/optional-visit IDs and exact source participant IDs;
- registered scene references with unchanged `approval` / `production` / `file` values;
- separate **approach, dialogue, decision, tactical and return** view plans;
- ordered production steps, acceptance criteria, preserved rules and explicit unbuilt placeholders;
- actual fight-place name, reused kit, current plate/stand-in state and authored way out.

The draft now aligns the existing authored porttikongi to `torkkelinmaki_courtyard`. Its `authoredSiteConflict` retains the old `jaska_studio`/Mäkelänsilta mismatch as history and records the corrected Torkkelinmäki site as resolved. The neutral anchor-only record adds no address or new encounter; source/old-save/C.19 checks establish this limited correction, not art or device acceptance. Mission steps can reference several packets; their union covers all four current missions without moving the mission battle.

Available registered scene art remains at its actual source status. `scene-karhupuisto-v01` is approved / prototype-ready. The other listed room/scene references are semi-approved / prototype-only. The approved Toko paper rig is a separate character/animation fact; it does not turn the empty-room plate into fully approved final art. No source register is rewritten to raise a status.

## Shared dynamic road packet

None of the 29 current road events declares a fixed anchor or site. The shared packet records all exact IDs, phase groups, the **24 random-pool** and **five forced-only** records, four direct combat-road IDs, and the current active-anchor eligibility list.

- Transit fights prefer the saved origin; arrival fights prefer the saved destination, using the first endpoint with a place record.
- An `any` event is resolved to an actual transit/arrival phase when raised.
- Current forced arrivals use the current selected anchor; trigger-bearing records are excluded from normal random selection.
- Eligibility is not proof that an event occurred at every anchor. Titles mentioning Hämeentie, a kiosk, a sauna or an underpass do not create new room/anchor bindings.
- Real fights keep their actual C.19 outing and receipt; source battle IDs describe shape, not automatic relocation to their original default arena.

The plans retain surprise events, tier/requirements, deterministic gap/frequency, authored minutes and one-time consequences. They do not transplant Toko Move tram mechanics or resolve a fight as a card outcome.

## Deferred existing context

`deferredExisting` keeps four existing map anchors outside current location production:

| Anchor | Current role | Boundary |
|---|---|---|
| `kallio_church` | Landmark/orientation | No new encounter or enterable room proposed. |
| `alppiharju` | Locked expansion | Defer art/content until listed current work passes its gates. |
| `vallila` | Locked expansion | Same locked-content boundary; no new location pitch. |
| `hermanni_skatepark` | Training/test | Preserve the existing cost-free training fixture separately; it is not a current campaign business or C.19 location-production packet. |

Existing centre/Pasila/Arabia/east boundary portals are recorded separately as orientation context, not enterable anchors or new authored destinations.

## Verify

```
node art-src/reviews/act1-production/location-test.mjs
```

The read-only audit checks source hashes, exact 17/16/29 coverage, four mission and three visit coverage, valid sites/participants, exact scene status/file/hash references, current kit/exit mappings, preserved first-sale/Jade/Pasila/courtyard boundaries and all four deferred anchors. No runtime, content, approval or save file is changed. Review capture and physical Pixel/iPad acceptance remain future gates; the plans do not claim them completed.
