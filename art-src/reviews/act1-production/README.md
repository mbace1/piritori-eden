# Listed Act I locations and characters — production atlas

This extends the already-listed Act I plans. It adds detailed production packets and clickable staging placeholders, not new locations, people, quests, approval states or runtime rules. `ROADMAP.md` and its 48% estimate remain unchanged. New-content expansion is explicitly deferred until the listed work and existing acceptance gates are addressed, with later owner direction.

Open `/art-src/reviews/act1-production/` from a server rooted at the repository, or choose **Locations and characters** in the review workbench. Deep links use `#locations:<packet-id>` or `#characters:<participant-id>`; `#order` returns to the production sequence.

## Coverage

- **12 location/context packets:** all 11 active anchors and one shared dynamic road/arrival packet; all 17 encounters, 16 doors, 29 road events, four missions and three optional visits are traced. Four existing inactive/locked/training/landmark anchors stay deferred.
- **26 cast/role packets:** 12 individuals, six existing crew slots, seven groups and one intentionally offscreen role; all 21 participant IDs across the 17 encounters are covered. Arvo remains news-specific. The existing hooded-woman concept is deferred rather than inserted into a new story.
- **15 production stages / 44 dependency edges:** the finite listed production order covers every existing encounter and 25 source cast/crew/group IDs. Generated hiring is an existing mechanic's audit packet, not a new named person.

Every packet has actual sources, current asset status, appearances/context, concrete next actions, acceptance conditions, constraints and remaining placeholders. Locations distinguish map anchor, site/interior/exterior, existing illustration and actual C.19 kit. The five view tabs describe approach, dialogue, decision, tactical handoff and return; a neutral layout placeholder does not claim finished scenery. Registered reference images/rest poses are shown separately. No unassigned modular face is made canonical.

## Start with the listed work

The first production batch is baseline preservation, Scene Club source/motion fidelity and the courtyard site-contract review. Source-selection preparation may proceed in parallel. Then work through the bank/exterior pair, Harju, Toko/park continuity, Hakaniemi, courtyard presentation, square/yard returns, broadcasts/crew, and docks/finale in the dependency sequence. Cast source-selection priorities also preserve actual first-use chronology; they do not rewrite the game's schedule.

The first sale stays outside the bank; Anne and the later bank clerk are not silently merged. Harju's pitch reference does not complete its tram-stop foreground. Jade stays at authored Hakaniemi. Pasila is a brochure subject while the ledger remains at Siltasaari. Courtyard Receipts' studio/site conflict remains explicit. Borrowed outdoor references are not new literal rooms. Kello can be absent; survivor groups use actual future campaign state. Jaska-offscreen displays no portrait in its packet.

See [LOCATIONS.md](LOCATIONS.md), [CHARACTERS.md](CHARACTERS.md) and [ORDER.md](ORDER.md) for the complete packets and identity/source cautions.

## Verification and actual output

```
node art-src/reviews/act1-production/location-test.mjs
node art-src/reviews/act1-production/cast-test.mjs
node art-src/reviews/act1-production/order-test.mjs
node art-src/reviews/act1-production/test.mjs
node art-src/reviews/act1-production/capture.cjs
node art-src/reviews/act1-production/tour.cjs
```

Local source checks pass, including 115 exact cast source hashes, 17 location asset references/five reused C.19 kits, every source join and 13 production-order validator/mutation checks.

Actual browser checks pass at **390×844** and **1280×800**: all **38 packet views** and **60 location staging views per viewport**, deferred-scope boundaries, offscreen guard, registered rest reference, URL/deep-link reload, 12px text floor, no horizontal overflow and no browser/resource errors. A throwing storage getter records **zero campaign-storage reads or writes**. Full results and actual captures are in `evidence/verification.json` and the PNGs.

The [18.16-second MP4 tour](evidence/listed-production-tour.mp4) and [WebM](evidence/listed-production-tour.webm) are actual browser recordings of the plans/placeholders, not a chapter playthrough or new finished art. The workbench's seventh route also passes its phone/desktop cross-page navigation and campaign-sentinel checks.

The existing Act I scenes CI job runs these packet and browser checks. New-branch CI is not yet claimed green. No merge, deployment, asset promotion, new story or physical Pixel/iPad acceptance is implied.
