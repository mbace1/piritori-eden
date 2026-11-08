# Piritori → Eden — current UX contract

**8 November 2026 owner correction:** Toko Move is the reference; **9:16
with overlays**. The old five-mode page layouts, rendered UI targets,
modular portraits and material/skin specification are removed. This file
replaces those UI instructions; gameplay canon remains in the GDD,
`DESIGN_AUTHORITY.md`, C.19 documents and current authored content.
`ROADMAP.md` remains the plan and completion rubric.

## Scene first

Use one fixed 9:16 illustrated frame, centered and fitted to the viewport.
Keep that frame on desktop and landscape. Background and character layers
cover the whole scene. HUD, dialogue, choices and results are live overlays;
they do not reserve a separate page column or a footer below the illustration.

Study the active journey in current Toko Move, `toko-move/js/play.js` in
`mbace1/Suds-Jack` (v3.15 at this audit). Its retired map/sheet chrome is not
the reference. Borrow compact status, illustrated encounters, understandable
stakes, short transitions and remembered consequences. Preserve Piritori's
handmade art and complete gameplay; do not copy tram systems, visual style,
its two-choice limit or simplified combat.

A small top overlay names the current place and immediately relevant state.
The lower overlays contain a short authored narrative beat and the current
decisions. Keep faces and important actions clear. Hide secondary map detail
during conversation. Use the quiet Kallio map between encounters.

## Combined UI budget

The owner’s **50% limit is a ceiling for all UI together**, not an allowance
for each panel. At least half of the 9:16 frame remains for the scene. Measure
painted panel rectangle union; for edge-anchored city overlays also limit the
combined top and bottom height bands, including edge insets and panel gaps.

Compact repeated labels and padding before changing the interaction. When
dialogue plus every choice cannot fit with readable text and 44px targets,
show dialogue and a Respond action, then replace that panel with all authored
choices and their stakes. Respond changes presentation only; a brief input
guard prevents a repeated tap from accidentally choosing. Results and map
receipts keep the actual consequences. Menus share the same budget.

The candidate independently tests all these states, font metrics and motion
peaks. A CSS max-height that clips text or hides choices does not meet the
contract. Existing combat intentions and rules remain authoritative; temporary
tactical panels must use the budget without discarding information.

## Characters and placeholders

Retain the approved Jaska cut-in, selected young Aatami front/side sources
(rigs semi-approved), and approved Toko paper artwork. Exact IDs and source
paths are in `ART_BIBLE.md`. Preserve proportions, identity and source hashes.

The old modular cast and face/outfit references are deleted. Contacts without
new approved artwork use neutral labelled placeholders, never recycled heads,
clothing or another named character. C.19's current 3D stand-ins and arena
assets are separate and remain in place.

Toko belongs to his room and counter; those pieces share one source camera.
Acting uses subtle idle, blink and head/body gestures. Selected mouths are
static. Source approval does not establish approval of a new rig, mask,
motion or composition. Review actual animation before runtime promotion.

## Decisions and consequences

Prefer existing encounters, labels, forecasts, missions and consequences.
Keep every meaningful authored choice. Split long opening text into short
beats without changing its order or inventing dialogue: arrival can carry
one sentence and the encounter the next.

Show understandable stakes under each choice. At narrow fitted widths,
compact stakes must derive from actual effects and keep the complete
accessible authored label. Do not hide a cost or present a certain result
when the game only offers a chance.

Commit through the existing engine before presenting the response. Disable
resolved choices; a double tap, reload or resumed result must never pay twice.
The result states what changed and gives one clear continuation back to the
city. Returning keeps actual location, advances the real clock when authored,
and preserves injuries, relationships, money, flags, missing crew and receipts.

Transitions may be short fades and layer movement. Keep the same room/camera
when a choice becomes its consequence; do not remount it as a new scene.
Reduced motion keeps the full interaction and outcome with stable artwork.

## Map, trade and crew

Keep canonical Kallio coordinates and meaningful travel. Distinguish the
current physical location from the next lead. Selecting a place is not
presence. Inspection, travel preview, cancel and committed travel keep their
existing semantics and time costs.

Show current objective and a clear encounter entry action. Secondary market,
crew, obligations and news should be available on demand, with state preserved
when returning. This is a presentation direction, not permission to remove
existing economy, inventory, recruitment, recovery or news functionality.

Trades and hires show actual price and restrictions before commitment;
results identify inventory/cash/crew changes. Use the existing deterministic
roster names and roles for neutral identity labels. Do not alter hiring draws,
crew statistics or economy rules to make a visual placeholder.

## C.19 boundary

C.19 Night Shift remains the authoritative 3D battle. Preserve positioning,
weapons, intentions, police pressure, fight/getaway objectives, rescue,
withdrawal, casualties, recovery and campaign integration. Do not replace it
with a choice card or the old formation-board presentation.

An authored fight enters the existing C.19 campaign bridge with its current
save/receipt contract. Returning settles once and exposes the actual outcome
and persistent consequences. A scene without a fight effect must not invent
combat merely to demonstrate a transition.

## Readability, input and recovery

- Keep all current choices visible without unnecessary scrolling.
- Require actual rendered text at least 12px and touch targets at least 44px.
  Adapt overlays to a narrow frame; do not shrink the entire interface.
- Check complete panel, face and interaction bounds, including motion peaks.
  Validate the widths around container breakpoints as well as target devices.
- Keep contrast against actual scene pixels, visible focus, keyboard activation,
  accessible labels and a stable reduced-motion path.
- Preserve normal saves, C.19 checkpoints, receipts and restore behavior.
  Old appearance-only metadata may be ignored; combat validation stays strict.
- Treat storage failure safely; do not claim a result persisted if it did not.

## Current implementation and acceptance

The corrected Scene Club review candidate is
`art-src/restarts/scene-club/`. It uses real engine choices and clock with a
separate candidate save. It includes paired Aatami/Jaska, the Toko source
comparison, quiet map entry/return, full overlays and actual browser evidence.
It is not the completed presentation of every campaign mode.

The compatibility campaign remains playable after removal of the old skin,
modular portraits, old news model and preview launchers. Structural compatibility
CSS and the paused Godot port are not visual references for new work.

Use existing regression infrastructure. Check 390×844 phone, 1280×800 desktop,
landscape where relevant and narrow breakpoint edges. Capture actual stage and
viewport output, motion, reload and consequences. Keep source pushed, draft PR,
merged, live, source approval and physical Pixel/iPad acceptance distinct.
Do not increase the roadmap score for an unaccepted visual candidate.
