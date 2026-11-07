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

The existing Act I scenes CI job runs all five source/model checks and the integrated browser check for this pack. New-branch CI still needs to finish before a full-green claim.

No new art or dependency is introduced by this hub. Source art/animation approval, meaningful combat decisions, the chapter's unfinished finale/time integration and physical device acceptance remain open under `ROADMAP.md`. Act I stays 48%.


## Consolidated verification

The assembled pack passes both 390×844 and 1280×800 checks: six actual sibling routes load and render, with no HTTP/console/page errors or horizontal overflow; review shortlist/notes/export/reset work across navigation; a byte-for-byte campaign sentinel remains unchanged. Individual tools add their detailed model/browser tests:

- Encounter audit: 17 authored encounters, 60 exact choices/forecasts, 16 hash-verified plate references; both full viewport runs pass.
- Consequences: 9 model fixtures, 18 browser flows; actual adapter receipts reject replay and JSON restore duplicates.
- Chapter: 41 model checks, 42 browser checks; actual shipment/carryover/ending fixtures, not a complete playthrough.
- Combat: four preserved 147-row evidence sets; phone/desktop data filters/proposal checks and actual C.19 courtyard captures pass. Missing telemetry stays unmeasured.
- Hub: 36 source-backed work packets, fixed 48% estimate, existing roadmap milestones, filters and isolated review storage.

The actual browser tour is [MP4](evidence/act1-workbench-tour.mp4) / [WebM](evidence/act1-workbench-tour.webm), 33.12 seconds. It shows the review tools, not a fabricated chapter run. Source art, new motion and proposed rules remain unpromoted; no public release is claimed. New combined-branch CI is pending.

For a local review, serve the repository root (for example `python -m http.server 8785 --bind 127.0.0.1`) and open `/art-src/reviews/act1-workbench/`. The component drafts are #123 (combat), #124 (chapter), #125 (encounters) and #126 (consequences); the hub consolidates their tested commits and the already-tested map draft #121, on art-review #122.
