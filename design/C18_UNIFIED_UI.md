# C.18 — One command surface

## Owner request and evidence

The owner reports that C.17.1 loads menus and labels, but the 3D arena remains black on the phone. The visual direction is close, but the UI is cluttered and looks like patchwork. This batch changes presentation, not combat rules or campaign consequences. External character models remain on hold.

Inspected authority: DESIGN_AUTHORITY.md, ART_BIBLE.md, UX_SPEC.md, GAME_DESIGN_DOCUMENT.md, ACTIVE_CONTEXT.md, C13_ART_AND_UI.md, C14_AFTER_THE_RAIN.md and HUB_RELEASE.md. PIRITORI_LONG_TERM_SCOPE.md is not on this source branch; no long-term game scope is redefined here.

Inspected images: art-library/references/ui/ui-target-battle-landscape-v02.jpg; art-library/references/ui/ui-target-battle-portrait-v01.jpg; design/concepts/c13-review/02-after-the-rain.png; design/concepts/c16-stylized/03-lantern-noir.png and 06-ink-after-dark.png. Concept 02 is the established environmental target. 03/06 are a shortlist, not final art acceptance. The newer Move + Act and full-intent rules supersede old formation-only illustrations.

## Visual implementation

A single crew-run/style.css replaces four competing stylesheet generations on this entry. Old shared sheets remain for other prototypes. The selected person, real procedural portrait, commands and End round share one continuous dark-card surface. Plain dividers replace nested bevels and double frames. Cream marks the committed primary action rather than filling the whole identity panel. The mission, progress, pressure and turn share a single top strip. View and Menu move into the header.

Withdrawal is secondary inside Menu, retaining its existing confirmation and consequences. The field-notes dialog closes before the retreat dialog opens. Enemy plans and aggregate danger remain visible by default, in unboxed text. Coordinate choices occupy the attached action sheet only until a concrete forecast is open; Cancel restores choices without cost. Equipment, support items, reload, help, extraction and separate Move/Action availability remain functional. No external character files, generated portraits or new rigs are introduced.

Portrait and short-landscape layouts reserve at least half of the tested viewport for the scene and keep End round reachable. Command/header targets retain a 44px minimum. The crew menu, loadout and aftermath use the same restrained type, spacing and separators.

## Rendering mitigation, not an invented root cause

The screenshot proves DOM/tactical state is active; it does not prove a successful visible GPU frame. The mobile profile alone enabled a full-screen default-framebuffer copy/FXAA pass. Crew rendering now ends with the real scene, without that copy. Each draw explicitly restores the default target, full viewport and disabled scissor after shared portrait/reflection work. The already-created preflight WebGL2 context is passed explicitly to Three.js, keeping one context.

Menu > Graphics exposes diagnostics and a safe option that also skips planar reflection capture. It persists the current outing before reloading and preserves other URL parameters. It does not replace the arena with fake graphics, change tactics or claim to cure every driver problem. Other prototypes retain their existing FXAA behavior. The physical phone cause remains unverified, and owner retesting is required even after browser automation passes.

## Verification

The C18 renderer contract checks target/viewport/scissor ordering and legacy behavior. The C18 browser gate checks actual nonblank canvas pixels, not just DOM or frame counters; it covers phone, compact portrait, short landscape, tablet, desktop and the safe path. It checks a single stylesheet, touch dimensions, viewport bounds, visible portraits and intentions, reversible movement preview, one modal at a time, no external fighter downloads and console errors. Existing crew/campaign/outing/recovery gates remain required. Record exact CI, merge, package and Pages receipts separately; this document is not evidence of a completed deployment.

### Port

Reproduce the continuous dock, portrait, combined status strip, attached forecast and secondary withdrawal. Preserve C.17 rule vectors and exact-once aftermath. Reproduce behavior and costs rather than obsolete formation layouts. The WebGL workaround is browser-specific.

## Browser review corrections

First six-layout screenshots rendered correctly, but full regression caught short-landscape forecast interception and an extraction button overlapping the crew drawer. The forecast now replaces the central command ribbon in short landscape instead of covering the arena, and the roster owns the top input layer. Grid columns are explicit during menu transitions. Enemy intent stays within a bounded scroll area; only its redundant no-danger heading is omitted. Pixel tests now read the canvas image after a naturally rendered frame, excluding DOM labels. No failing regression assertion was removed.

Graphics recovery also clears the interrupted, uncommitted forecast when resetting the selected action. Otherwise the short-landscape dock can retain a stale confirmation sheet over the reset commands. This resets presentation only; the existing recovery-state and exact-once shot assertions remain unchanged.
