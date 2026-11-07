# Siltasaari bank / listed cast source review

**Review only.** No runtime assets, bindings, approvals, story, economy or campaign
state change. Act I remains **48%** under the existing roadmap rubric. This is
concrete preparation for the listed bank/first-sale production work after Scene
Club, not a completed playable milestone or a new release.

Open [`index.html`](index.html) through an HTTP server at
`/art-src/reviews/bank-production/`. The four tabs show:

1. **Outside:** a neutral public-approach/queue blockout for `enc-first-sale`.
   Leena remains outside the legitimate queue. Broad façade/threshold masses,
   queue silhouettes, southbound-crowd cue and a period feature-phone SMS prop
   make the staging reviewable. No SMS text, actual bank frontage, final exterior
   plate or new location is invented. Waiting/approach motion is proposed staging.
2. **Counter:** the existing `scene-bank-counter-v01` plate with an explicitly
   neutral Anne stand-in and exact Day 3 copy. The plate remains **semi-approved /
   prototype-only**; this encounter binding is proposed.
3. **Ledger:** the same current Siltasaari interior with separate neutral
   `bank-clerk`, ledger and Pasila brochure placeholders. Pasila is the brochure
   subject, not this scene's location. **Anne / bank-clerk identity is unresolved.**
4. **Cast sources:** three real existing head/outfit auditions each for Esa,
   Leena and Anne. No audition assigns the canonical character. Save preferences
   only to `piritori-review:bank-production:v1`; reset is available in the footer.

All three openings and all **10** choice labels, forecasts, requirements and
effects are copied exactly from canonical content by `build-manifest.mjs`.
Requirements/effects are inspectable source metadata, never evaluated or applied.
The return view is a labelled schematic transition, not a fake game map or result.
This review has no combat and does not simulate C.19.

## Real source options

| Person | A | B | C |
|---|---|---|---|
| Esa · `seller-esa` | head-kallio-01 + fixer | head-kallio-04 + watcher | head-kallio-10 + runner |
| Leena · `buyer-leena` | head-kallio-03 + runner | head-kallio-08 + fixer | head-kallio-12 + watcher |
| Anne · `teller-anne` | head-kallio-05 + local | head-kallio-06 + local | head-kallio-11 + fixer |

Every module above is `v03`. Exact paths, hashes, inherited approval, collection
and runtime member IDs are in [`source-manifest.json`](source-manifest.json)
and each option's disclosure. These are alternatives for discussion, not a
ranked direction or approved named-character design. Clothing role labels do
not change the NPC's authored role; ancestry/gender is not used as a role cue.

Registered odd-numbered heads and outfits are **approved / prototype-ready**
derivatives. Five even-numbered heads are **approved library source direction /
source-only, not runtime registered**. `art-library/characters/manifest.json`
still records **production_ready:false**. Heads include hair; clothing is
medium-frame T-pose art. No ready dialogue rig, sleeve pose, eye state, acting
clip or validated neck socket is claimed. Canvas crops omit unrelated sheet
fragments but preserve the actual source appearance, including visible magenta
fringe/extraction defects. Those require deliberate production cleanup before
animation or runtime acceptance.

The source PNGs are existing tracked approved **individual modular files** in
the public repository, referenced in place. This change adds no copies of them,
no sheet masters, incoming/rejected sources or calibration/construction renders.
Private diagnostic contact sheets remain outside Git under
`/workspace/evidence/bank-production-private/`. No source was repainted or
generated; no art-library/runtime register was changed.

## Production tasks and gates

1. **Source selection:** owner reviews the nine auditions; record a preference
   separately from design approval. Clarify whether `bank-clerk` is Anne before
   producing or assigning a second clerk identity. Until then the neutral Day 7
   clerk remains separate.
2. **Existing-source preparation:** isolate the chosen main head/outfit pieces,
   remove neighboring fragments and magenta contamination, preserve silhouette,
   and separate head/hair under the modular contract. Verify frame/socket alignment
   with the chosen existing outfit; no automatic light/heavy deformation.
3. **Acting candidate:** prepare waist-up rest/idle, blink, talk and restrained
   role-specific head/hand beats. Esa's price/acknowledgement, Leena's queue glance
   and Anne's ticket/explanation gestures remain proposed animation; they add no
   dialogue. Show actual moving output before approval or runtime promotion.
4. **Exterior production decision:** review the queue/threshold composition and
   preserve Leena outside, public approach, late SMS and southbound crowd. A real
   painted exterior plate is still absent. The schematic is not a final visual
   style or permission to add a new location.
5. **Bank integration candidate:** after the cast/source and staging gates, bind
   the approved exterior/interior views to their authored encounters, retaining
   exact choices, markka conversion/receipt semantics and current Siltasaari map
   return. Run the existing campaign/browser suites and inspect persistence.
6. **Acceptance:** record portrait/desktop and relevant landscape motion, source
   identity/proportions, blink edge/seam checks, reduced-motion rest, targeting
   and overlap measurements. Owner art/acting review and physical Pixel/iPad
   acceptance remain separate open gates.

No production tasks for unlisted/new locations or cast are introduced here.
The current approved source artwork and authored systems remain authoritative.

## Actual browser evidence

- [Phone exterior](exterior-phone.png) / [desktop exterior](exterior-desktop.png)
- [Phone counter](counter-phone.png) / [desktop counter](counter-desktop.png)
- [Phone ledger](ledger-phone.png) / [desktop ledger](ledger-desktop.png)
- [Esa sources](sources-seller-esa-desktop.png), [Leena sources](sources-buyer-leena-desktop.png), [Anne sources](sources-teller-anne-desktop.png)
- [Actual phone interaction MP4](bank-review-phone.mp4) / [original WebM](bank-review-phone.webm)
- [Verification measurements](verification.json)

The recording shows the actual browser's approach/wait motion, authored choice
highlight, schematic return, counter/ledger distinction and Leena source
preference. It is not a campaign playthrough or new character acting approval.
Phone source-board captures include vertical scroll because each person has
three source/provenance cards; that is a review board, not the gameplay layout.

## Reproduce

From the repository root, with the existing Node/Playwright installation:

```sh
node art-src/reviews/bank-production/build-manifest.mjs
node art-src/reviews/bank-production/audit.mjs
node art-src/reviews/bank-production/capture.cjs
ffmpeg -y -i art-src/reviews/bank-production/bank-review-phone.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 25 art-src/reviews/bank-production/bank-review-phone.mp4
```

The capture script serves this worktree on an ephemeral localhost port. It checks
both **390×844** and **1280×800**, all three exact authored scenes / 10 choices,
all nine options with six loaded module canvases per person, local preference
reload, an untouched campaign sentinel, no horizontal overflow, reduced-motion
rest and no browser/network errors. Portrait opening text is **15px** and minimum
choice height **66px**; desktop is **16px** / **67.30px**. The first choice is on the
initial screen at both sizes. All three first-sale choices fit portrait; the
four-choice ledger can require a short scroll. Source auditions remain source
modules, and this test does not certify finished character proportions/animation.

No physical device or owner acceptance is claimed. No gameplay/balance result,
new live build, merge or deployment is claimed by these files.
