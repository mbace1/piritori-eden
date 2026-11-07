# Review workbench

Serve the repository root and open `art-src/reviews/act1-workbench/`. The consolidated review branch includes the linked sibling review pages. This is a planning/rehearsal tool, not a new release or chapter-completion claim.

- `packets.json`: bounded source-backed implementation packets, tied to the existing roadmap.
- `workbench.js`: preview navigation, milestone/search filters, local shortlist and review notes.
- `map-preview.html`: actual phone/desktop captures from the tested map draft; not a replacement interactive map.
- `PLAN.md`: production order, boundaries and deferred high-level decisions.
- `FINDINGS.md`: specific source/model mismatches and technical gaps to review before changing rules.
- `test.mjs` and `capture.cjs`: data/source validation, review-storage isolation, navigation and responsive captures. Use `--integrated` to validate every sibling route after consolidation.

The only browser storage written here is `piritori:review:act1-workbench:v1`. It contains review preferences, not campaign saves or approvals. Native game links use the game's existing save controls and are labelled accordingly. Every linked preview must distinguish authored facts, real-engine fixtures, measured bot evidence and proposed placeholders.

Run `node art-src/reviews/act1-workbench/tour.cjs` to record an actual browser tour; the generated MP4/WebM live under `evidence/`. It is a tour of review tools, not a complete campaign playthrough.

The existing Act I scenes CI job runs the source/model checks and the integrated browser check for this pack. New-branch CI still needs to finish before a full-green claim.

No new art or dependency is introduced by this hub. Source art/animation approval, meaningful combat decisions, the chapter's unfinished finale/time integration and physical device acceptance remain open under `ROADMAP.md`. Act I stays 48%.


## Consolidated verification

The assembled pack passes both 390×844 and 1280×800 checks: eight actual sibling routes load and render, with no HTTP/console/page errors or horizontal overflow; review shortlist/notes/export/reset work across navigation; a byte-for-byte campaign sentinel remains unchanged. Individual tools add their detailed model/browser tests:

- Encounter audit: 17 authored encounters, 60 exact choices/forecasts, 16 hash-verified plate references; both full viewport runs pass.
- Consequences: 9 model fixtures, 18 browser flows; actual adapter receipts reject replay and JSON restore duplicates.
- Chapter: 41 model checks, 42 browser checks; actual shipment/carryover/ending fixtures, not a complete playthrough.
- Combat: four preserved 147-row evidence sets; phone/desktop data filters/proposal checks and actual C.19 courtyard captures pass. Missing telemetry stays unmeasured.
- Hub: 36 source-backed work packets, fixed 48% estimate, existing roadmap milestones, filters and isolated review storage.

The earlier six-surface browser tour is [MP4](evidence/act1-workbench-tour.mp4) / [WebM](evidence/act1-workbench-tour.webm), 33.12 seconds. It shows the review tools, not a fabricated chapter run. Source art, new motion and proposed rules remain unpromoted; no public release is claimed. New combined-branch CI is pending.

For a local review, serve the repository root (for example `python -m http.server 8785 --bind 127.0.0.1`) and open `/art-src/reviews/act1-workbench/`. The component drafts are #123 (combat), #124 (chapter), #125 (encounters) and #126 (consequences); the hub consolidates their tested commits and the already-tested map draft #121, on art-review #122.


The listed location/cast extension is at `../act1-production/`: 12 location/context packets, 26 existing cast/role packets, and a 15-stage production order. Its own source/browser checks cover all records and staging views with campaign-storage access blocked. It is reachable as the seventh hub preview; new content is explicitly deferred.

The listed-place/cast recording is [MP4](../act1-production/evidence/listed-production-tour.mp4) / [WebM](../act1-production/evidence/listed-production-tour.webm), 18.16 seconds of actual planning-tool output. The location/cast extension does not begin new-content expansion.

The eighth preview is the [bank study](../bank-production/): separate exterior/counter/ledger compositions, 10 exact authored choices and nine existing-module source auditions for Esa, Leena and Anne. Its [11.28-second recording](../bank-production/bank-review-phone.mp4) shows the review tool. No face is assigned and the later clerk's identity remains unresolved. The source audit and both viewport checks pass after consolidation; browser preferences stay separate from the campaign.

This draft also contains three actual game improvements: [exact bank conversion previews and phone choices](../../../design/evidence/bank-quotes-2026-11-07/README.md), the [named treatment cost and saved wound receipt](../../../design/evidence/treatment-2026-11-07/README.md), and the [corrected Courtyard Receipts site contract](../../../design/COURTYARD_SITE_CONTRACT.md), with old-save/C.19 handoff coverage. The earlier recordings retain their original source baseline. These limited runtime fixes do not promote the proposed artwork or claim a release; the public build stays v4.96 and completion stays 48%.
