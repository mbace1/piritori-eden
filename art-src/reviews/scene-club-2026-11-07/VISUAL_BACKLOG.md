# Act I visual inventory — 7 November 2026

Review-production backlog, not approval or runtime promotion. `ROADMAP.md` remains the plan of record and its Act I estimate stays 48%. Inventory taken from the current repository, `art/v3/manifest.json` (77 entries), `art-library/APPROVALS.md`, `DESIGN_AUTHORITY.md`, the authored content and existing drawing code. Registration, source approval, animation readiness and physical-device acceptance are separate facts.

## Scene Club: use what exists

| Exact asset ID | Source / authority | Recorded state | Work still needed |
|---|---|---|---|
| `cutin-jaska-rig-v01` | `art-src/concepts/people/jaska-concept-v03.jpg`; owner, 24 October: “already approved” | `approved` / `animated-rig`; four registered pieces | Review any new staging or entrance motion; retain waist-up identity and the short bottom-tail speech bubble. No replacement art needed. |
| `cutin-aatami-front-rig-v01` | `art-src/concepts/people/aatami-young-support-06.png`; owner-committed study, PR #108 | `semi-approved` / `animated-rig`; four registered pieces; owner rig review pending | Use for one-at-a-time dialogue, looking near camera. Check head/neck seams, blink and proportions in actual motion. Owner approval is still required for the rig/new motion before promotion. |
| `cutin-aatami-rig-v01` | `art-src/concepts/people/aatami-young-final-v01.png`; owner-selected young final, PR #108 | `semi-approved` / `animated-rig`; three registered pieces; owner rig review pending | Side pose is for a composition with both speakers at opposite sides. It is not a new Aatami design or a substitute front pose. |
| `scene-scene-club-v01` | `art-src/scenes/scene-club-v04.png` | `semi-approved` / `prototype-only`; registered 16:9 room | Available painted interior, with table at far wall and standing room clear in front. Review phone crop and dialogue composition; do not commission another room merely to add an entrance transition. |
| `scene-toko-rig-v01` | Approved v02 Toko screen; provenance in `art-library/rigs/toko-slomo-paper-v01/README.md` | `approved` / `animated-rig`; eleven registered pieces; explicitly promoted by owner on 21 October | Technique reference: painted source split on hidden pivots, held paper poses, idle/blink/gesture and reduced-motion rest. Do not copy Toko's identity or gold mask onto other people. |
| `scene-toko-noodles-empty-v01` | `art-src/scenes/toko-noodles-empty-v04.png` | `semi-approved` / `prototype-only` | Existing room behind the approved Toko rig; its registration is not a separate final-art sign-off. No replacement required for this pilot. |

All registered files/members for the six entries above exist locally and matched their manifest SHA-256 in this audit (24 files total). This checks record/file consistency, not visual acceptance. The existing shared `web/js/v3/cutin-stage.js` provides idle (including blink), talk/head beats, nod and shake for Jaska and both Aatami rigs, with a reduced-motion rest frame. No new rig, facial painting, character generation or runtime manifest is needed to produce the Scene Club review candidate.

The authored `enc-jaska-receipt` and `enc-jaska-last-light` already use `scene-scene-club-v01`. `visit-jaska-room-to-work` is the existing return visit. Keep their words and consequences; an arrival edit is presentation, not a new mission.

## Next work, in order

1. **Finish the Scene Club animated review.** Show the existing sources through arrival → Jaska → Aatami response → authored choice/outcome → map return. Keep new entrance/transition timing labelled candidate. Capture 390×844 and 1280×800; inspect bubble clearance, facial seams, all first-screen choices, motion and reduced-motion behavior. A waist-up arrival is a staging study, not a newly approved full-body walk cycle.
2. **Bind and frame existing plates before generating environments.** Six of the 17 current encounters omit a direct `scene_asset_id`; `renderEncounter()` then calls `genericScene()`. Missing binding does not mean missing art. `scene-bank-counter-v01`, `scene-harju-pitch-v01` and `scene-jade-lantern-front-v01` already exist as `semi-approved` / `prototype-only` assets. They are candidates for the authored bank, Harju and Jade-front beats after content/site mapping and actual captures are checked. `enc-first-sale` and `enc-pasila-ledger` share `staffed_bank`; do not invent a distinct location from their titles.
3. **Review available speaker candidates rather than redraw approved identities.** `cutin-arvo-rig-v01` already exists (`semi-approved` / `animated-rig`), cut from approved presenter v05; owner rig review remains pending. Hooded-camera-woman concepts v01–v03 exist under `art-src/concepts/people/`, but no hooded-woman `cutin-rig` is registered. An approved source selection and extraction/review are needed before adding her as an animated speaker. No new source should be commissioned from the mistaken premise that no concept exists.
4. **Choose one next authored contact, then audit its source selection.** The current `CUTINS` table covers Jaska, Aatami front/side and Arvo. Authored contacts such as seller Esa, buyer Leena, teller Anne and Mei-Lan have no dedicated registered cut-in rigs. That is a presentation gap, not proof that their required identity should be invented: inspect existing approved modular cast art and obtain the particular source selection before extraction. Keep neutral/current presentation until a candidate is approved.
5. **Polish the existing C.19 arena sets from evidence.** Courtyard, yard, park, tram street and quay already have campaign kits and shipped join/readability work (ROADMAP milestones 2–3). The open need is cohesive construction/readability and device checks, not illustrated combat cards or a fresh battle-art pipeline. The dock and several painted location plates remain semi-approved prototypes; do not replace tactical 3D with those plates.

The six encounters without a direct plate binding are `enc-first-sale`, `enc-runner-at-tram-stop`, `enc-bank-counter`, `enc-jade-window`, `enc-courtyard-last-call` and `enc-pasila-ledger`. Existing register entries, site data and the relevant narrative beat must be examined together before changing their visual composition.

## Gates and known ambiguity

- **Aatami:** owner review of the front/side rigs and any new animated staging. Source selection does not certify rig deformation, facial seams or runtime readability.
- **Scene Club room / other prototype plates:** semi-approved status is preserved; browser captures do not convert it to approved final art.
- **New speaker/animation candidates:** show actual rendered motion and phone/desktop evidence before runtime promotion. Do not change `APPROVALS.md` or the manifest to manufacture acceptance.
- **Courtyard location:** the scenario atlas documents `enc-courtyard-last-call` using `jaska_studio` despite its Torkkelinmäki mission anchor. Current content still carries that binding. Resolve it in gameplay/content before dressing it as Scene Club; the authored courtyard is not Jaska's room.
- **Physical devices:** Pixel/iPad acceptance remains open. Emulated screenshots, hash checks and CI are not physical-device evidence.
- **No commissioned work in this inventory:** no images generated, sources altered, models produced, assets promoted or completion score raised.

Sources: [design authority](../../../DESIGN_AUTHORITY.md), [roadmap](../../../ROADMAP.md), [Art Bible](../../../ART_BIBLE.md), [approval register](../../../art-library/APPROVALS.md), [runtime register](../../../art/v3/manifest.json), [scenario atlas](../../../design/SCENARIO_ATLAS.md), [authored slice](../../../content/era1-slice-v1.json), [shared cut-in implementation](../../../web/js/v3/cutin-stage.js).
