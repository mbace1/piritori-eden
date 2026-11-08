# Next authored scenes — owner review plan

Planning only, 8 November 2026. Source snapshot `5b2a73042e0e1bb6e76b8de64e69420dce770dd0`; encounter JSON SHA-256 `a5a88fa1a97cf9a4e4d211ded6d69da9ff78c7fd5388d7d55f8b9b6ff00cad30`. No new story, character design, clothing, gameplay rule, approval or release is proposed here. The current ROADMAP estimate is **50%**; this plan adds no completion points.

## Order and shared acceptance

These six packets follow the existing Scene Club encounter in authored schedule order (indices 3–8). They belong to the coordinated **milestone 4 city/UI lane**, not a replacement roadmap. The latest producer order still leads with the owner's €400/finale decisions, shipment night (milestone 5), a measured careful-combat pitch (milestone 2), then owner phone play (milestones 1/6/7). Do not advance chapter 2 or redesign the shipment from this document.

For every packet: keep the fixed maximum-fit **9:16** stage, full illustration behind overlays, **combined UI ≤50%** in arrival/dialogue/choices/results/map/menu/transition states, actual **44px targets / 12px text**, and all authored options/requirements/stakes accessible. Measure painted rectangle union plus edge bands. Test 390×844, 1280×800, 844×390, and the 271/320px breakpoints; inspect real motion and reduced-motion output. Stage dialogue and choices sequentially where necessary. A proposed paged action tray must expose its page count and every option; changing page must not settle a choice.

Reuse only selected Aatami front/side sources, approved Jaska cut-in and approved Toko paper artwork. Aatami rigs and new motion/compositions remain candidates. All other people use **neutral labelled placeholders: art pending**, never deleted modular faces/outfits or invented identity assignments. Existing location paintings retain their registered status; a registered plate is not an approved new composition. Prototype saves stay isolated; later integration uses the existing campaign, clock and exactly-once consequence boundary.

## 1. Harju runner — Day 2 night

`enc-runner-at-tram-stop` · `harju_pitch` / `harju` · `aatami`, `crew-slot-runner`.

> The runner has already read the timetable, and read Aatami. She asks which one of them is more reliable.

Existing decisions: `hire-fair` — “Offer €18 per night and no waiting games”; `hire-cheap` — “Offer €10 and future work”; `ask-route` — “Pay €8 for the route observation”. Fair recruitment records `promise-no-waiting`; cheap recruitment is temporary and applies `relationship:mira:-1`; observation deducts €8 and grants +1 intel / `ordinary-flow-taught`.

- **Produce:** selected Aatami + neutral “Runner”; `scene-harju-pitch-v01` is a semi-approved setting candidate. Do not rename the crew slot Mira or assign a generated roster face; the prose/name/key ambiguity needs source clarification before named art. Keep tram-stop staging approximate rather than inventing a precise stop at Brahenkenttä.
- **Test:** all three cash guards; real permanent/temporary recruitment, deployment and subsequent nightly settlement; observation without recruitment; reload and duplicate refusal. Recruitment effects themselves do not deduct the advertised offer amount—do not invent an upfront charge or a €10 wage override.

## 2. Siltasaari bank — Day 3 day

`enc-bank-counter` · `staffed_bank` / `siltasaari` · `aatami`, `teller-anne`; preceded by `news-markka-afterlife`.

> A paper clock marks the queue. The teller explains that nostalgia has no exchange-rate bonus.

`convert-all` — “Convert all carried markka”; `convert-part` — “Convert 120 mk”; `leave-queue` — “Leave before your number”. The first two apply the existing conversion plus `bank-visit-visible`; leaving records `bank-visit-aborted`.

- **Produce:** selected Aatami, neutral “Anne — teller” and a neutral Arvo Linde broadcast nameplate. The semi-approved `scene-bank-counter-v01` is an interior candidate. Keep Leena's earlier sale **outside** the legitimate queue; do not combine it with this counter or identify Day 7 `bank-clerk` as Anne. Retain the documented conversion fact/source distinction.
- **Test:** bulletin acknowledgement → counter; 0/119/120/300/600 mk; exact engine-derived proceeds/remaining money, reload and once-only settlement. Do not duplicate rounding logic or silently replace the scheduled block cost with a new fee.

## 3. Tokon Ramen — Day 3 night

`enc-toko-quiet-voice` · `toko_slomo_noodles` / `vaasankatu` · `aatami`, `toko`.

> Toko dries a bowl and lowers his voice. Three delivery vans. Thursday. One of them is empty.

`buy-info` — “Buy information — €120”: −€120, +2 intel, van-pattern flag and Harju offer. `risk-sabotage` — “Risk sabotage — €300”: cash/trust guards, −€300 and existing visible **45%** deterministic wager. `eat-and-listen` — “Eat, listen, owe a favour”: +1 intel / Toko obligation. `leave` — “Leave”: existing decline flag.

- **Produce:** reusable selected Aatami + approved `scene-toko-rig-v01` over semi-approved `scene-toko-noodles-empty-v01`; retain one camera for room/body/hands/counter. Current ensemble is a composition study, not this completed four-choice scene. Review a two-page action tray if four native targets cannot fit the shared cap; keep all four authored options.
- **Test:** cash/trust blockers; both existing wager outcomes without rerolling on reload; success intel/flag versus failure trust −1 / Vaasankatu pressure +1; favour persistence and no payment on Leave. Toko remains non-recruitable and never becomes a combatant. New motion needs actual review; mouths remain static.

## 4. Karhupuisto watcher — Day 4 day

`enc-karhupuisto-watch` · `karhupuisto_bench` / `karhupuisto` · `aatami`, `crew-slot-watcher`, `dog-owner`.

> Wind turns the lime leaves. The watcher points out the same man crossing the park without ever arriving.

`hire-watcher` — “Hire the watcher — €24 per night”: recruit / reveal park offer. `pay-observation` — “Pay €10 for the observation”: −€10, +1 intel / `park-intent-read`. `ignore-pattern` — “Watch the dog instead”: pressure −1 / `park-pattern-missed`.

- **Produce:** selected Aatami; neutral watcher and dog-owner labels. The approved Karhupuisto location is reusable environmental source; existing dog/foliage approval does not approve a new loop or a human design.
- **Test:** hiring guard versus actual nightly wage timing, observation without a wage, pressure floor, remembered flags and later mission availability. Preserve full-view geography/landmark and face clearance under the overlay cap.

## 5. McCormick yard — Day 4 night

`enc-mccormick-yard` · `mccormick_yard` / `linjat_yard` · `aatami`, `sean-mccormick`, `crew-slot-muscle`.

> The public room closes. In the yard, three relatives disagree about the same invoice at full volume.

`hire-rauno` — “Hire the muscle — €28 per night”: recruit / family relationship +1. `buy-bat` — “Buy the repaired bat — €35”: −€35 / bat. `accept-favour` — “Take gear against a future favour”: bat + pipe / family obligation +1. `leave-public` — “Keep the relationship in the public room”: distance flag, relationship change **0**.

- **Produce:** selected Aatami; separate neutral “Sean McCormick” and “Muscle” placeholders. Do not turn the legacy choice ID `hire-rauno` into an approved named face. `scene-kallio-service-yard-v01` is semi-approved; keep public room versus yard distinct. Review the same bounded four-option tray as Toko, not a new family plot.
- **Test:** all requirements, actual recruitment/wages, both independent equipment instances and persistent obligation; leaving must not reset an existing relationship. All four choices remain discoverable under the 50% budget.

## 6. Bear Path — Day 5 day

`enc-bear-path` · `karhupuisto_bench` / `karhupuisto` · `aatami-network-team`, `piritori-rival-team`; `mission-bear-path` / `battle-karhupuisto-2v2`.

> Two McCormick buyers wait on the wrong side of the granite bear. They paid for a Thursday load. One keeps glancing toward a van that is not coming.

`name-empty-van` — “Name the empty van”: van-pattern guard, peaceful completion, Toko relationship +1 / `mccormicks-know-skim` flag. `send-fixer` — “Let the fixer speak”: deployed-fixer guard, existing negotiation; failure starts the authored battle. `hold-path` — “Hold the path”: fighters≥2, same battle. `withdraw` — “Leave with the package”: partial mission / park-contact closure for one day.

- **Produce:** selected Aatami; neutral crew/opponent labels. Preserve the semi-approved clearing as a narrative setting candidate and **C.19's existing 3D park arena/procedural fighters** for combat. No 2D/card battle, new faction uniforms or added enemies.
- **Test:** peaceful, negotiated-success/failure, direct-fight and withdrawal branches; real outing request → C.19 → exactly-once receipt → map. Check full intentions, weapons, police responses, kit/crew consequences and reload mid-fight/after settlement; preserve location and clock. Mission outcomes must use current settlement APIs, not fixture arithmetic.

## Boundaries and review references

The existing opening contacts `seller-esa` / `buyer-leena`, later `mei-lan`, `kello`, Day 7 clerk and Jaska return remain authored backlog, not permission to invent appearances. These packets select no new designs. Before courtyard art, resolve the existing `enc-courtyard-last-call` site/anchor mismatch (`jaska_studio` versus the scheduled Torkkelinmäki mission); do not depict it as Scene Club or resurrect a superseded proposal.

Current sources: [ROADMAP](../ROADMAP.md), [design authority](../DESIGN_AUTHORITY.md), [Art Bible](../ART_BIBLE.md), [encounters/schedule/crew](../content/era1-slice-v1.json), [map sites](../map/kallio-era1-2003-v1.json), [actual effects/settlement](../web/js/v3/state.js).

Existing reference output only: [9:16 Scene Club](../art-src/restarts/scene-club/evidence/phone-side-reduce-choices-stage.png), [Toko composition](../art-src/restarts/scene-club/evidence/toko-front-phone-stage.png), [UI-cap audit](../art-src/restarts/scene-club/evidence/ui-budget-audit.json), [C.19 mission probe](../art-src/restarts/scene-club/evidence/c19-mission-budget/README.md). **No next-scene implementation, capture, test pass, owner approval or deployment is claimed.**
