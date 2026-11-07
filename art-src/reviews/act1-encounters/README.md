# Act I encounter gallery — review only

A clickable visual inventory of **all 17 authored encounters across days 1–10**, including all **60 existing choices and forecasts**. This is planning and composition evidence, not a playable campaign, release or art promotion. ROADMAP's Act I estimate stays **48%**.

Open `/art-src/reviews/act1-encounters/` while serving the repository root. Group the overview by day or location, then enter any encounter. Previous/next navigation follows the actual schedule. Hash links such as `#enc-courtyard-last-call` open a particular review directly.

## What the preview shows

- **11 existing direct plate bindings**, with their recorded approval and production states.
- **Five proposed bindings to existing plates**: runner/Harju, bank counter, Jade front, courtyard and Pasila ledger. The current runtime/content bindings are not changed.
- **One unbuilt first-sale exterior**: a neutral placeholder, because the authored deal takes place outside the legitimate bank queue. The bank interior is a separately labelled contextual reference, not a substitute sale location.
- Clearly labelled neutral cast stand-ins where no dedicated rig is registered. These specify occupied space, not a new face, costume or identity.
- The available Jaska/Aatami front review rigs, including review-only bounded blink candidates, and the existing approved Toko paper stage. The Aatami side rig is not assessed or promoted by this gallery.
- Exact authored openings, choice labels, forecasts, inspection facts, requirements and effects read from canonical content. The source/binding/placeholder snapshot is [encounter-manifest.json](encounter-manifest.json); [binding-proposals.json](binding-proposals.json) and [BINDING_PLAN.md](BINDING_PLAN.md) record concrete production tasks and uncertainties.

The courtyard warning remains explicit: current `site_id` is `jaska_studio`, but its schedule/battle anchor is Torkkelinmäki. Showing a proposed courtyard plate does not repair that content conflict. Pasila is the ledger scene's subject, not its present location: the current site remains Siltasaari's staffed bank.

## Review choices are not game outcomes

Clicking a choice only marks it for consideration and repeats the authored expected forecast. It does not evaluate prerequisites, spend money, recruit crew, alter relationships, roll a check or settle a battle. State uses only `piritori-review:act1-encounters:v1`, separate from campaign storage. Clear review selections removes only this gallery's choices.

The gallery contains **no combat engine, battle cards or simulated win/loss**. The Bear Path link opens the actual saved-campaign `?play=g0-bear` C.19 entry. The courtyard link is explicitly the real **door** playtest in that arena, a different job; the actual authored courtyard mission remains in campaign day 6/night with three fighters. No invented outing IDs or legacy formation-board launch is used. Debug `?encounter=` links are labelled unsaved dialogue previews and may lack crew/prerequisites.

Navigation also links to the existing [Scene Club animated review](../scene-club-2026-11-07/?repair=1) and the planned sibling [Act I workbench](../act1-workbench/). The workbench route depends on the combined review branch; it is intentionally labelled planned when this isolated gallery branch is viewed alone.

## Reproduce and verify

```
node art-src/reviews/act1-encounters/build-manifest.mjs
node art-src/reviews/act1-encounters/audit.mjs
node art-src/reviews/act1-encounters/capture.cjs
```

The manifest builder reads canon and writes only the adjacent review snapshot. The audit checks the 17 exact canonical joins, all 60 choice labels/forecasts/effects/requirements, source SHA-256 values, 16 direct/proposed plate references and the first-sale/courtyard/combat constraints.

The browser script serves a local ephemeral port and uses Playwright's matching headless Chromium, without a new dependency. `BROWSER_PATH` may select an installed alternative. It checks all 17 details and 60 choices/forecasts at both **390×844** and **1280×800**, no horizontal overflow, day/location grouping, local review reload and preservation of a sentinel campaign save. Jaska, Aatami and Toko sources are actually rendered; fight links remain links to the actual game. HTTP, console, failed-request and page errors fail the run.

PNG files are actual viewport captures. `act1-gallery-review.webm` is an actual browser recording of the overview, missing first-sale exterior, proposed bank, Jaska, Toko, C.19 link and shipment review. A derived MP4 may be supplied for convenient playback. `verification.json` and `capture.log` preserve measured results.

## Boundaries

No canonical content, runtime manifest, approval register, campaign file, art source or combat rule is changed. No new image generation was required. The gallery proposes binding/composition and source-selection work; all neutral stand-ins and new compositions remain unbuilt/candidate work. Browser emulation is not physical Pixel/iPad acceptance. No merge, deployment or completion increase is implied by a draft PR.
