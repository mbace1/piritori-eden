# Camera and scene study — Kallio 2003

Owner direction, 2026-09-12: "All of these are great, but we also need to zoom out for battle a bit, maybe dynamic. Test horizontal as well. Other types of scenes and so on."

## What this settles

The two earlier six-scene sheets establish the environmental direction: painted underground street noir, warm practical pools against cold night, worn Kallio materials and recognisable entered places. This is environmental direction approval, not approval of incidental sign text, invented geometry, named character designs or a final runtime.

The v03 sheet has six wide panels on a landscape page. The owner approved the middle and right columns as realistic implementation targets: **02 courtyard battle wide, 03 Karhupuisto open battle, 05 McCormick yard, and 06 harbour commitment**. Panels 01 (close meeting) and 04 (bank interior) remain references; they were not selected for implementation or rejected. These four approved frames establish spatial scale, elevated framing, mood and scene types. The generated courtyard pair changes details and grouping, so it illustrates framing intent, not a verified continuous camera move. Actual continuity must use one 3D set with stable actors and props.

## Sources and constraints

Read DESIGN_AUTHORITY; current ART_BIBLE §§4, 6, 8, 12, 16; UX_SPEC §§2, 9; the GDD; ACT_I_NARRATIVE; SCENARIO_ATLAS; and content/era1-slice-v1.json. Later owner permission to explore a dynamic camera modifies the older fixed-camera preference; it does not waive formation visibility or choose a motion policy.

The declared formation grammar stays front/middle/back, with complete mirrored 3x3 and provision for 3x4. Art cannot turn this into unrestricted movement or invent a combat encounter at the bank/yard/harbour. The current C.05 four-actor training fixture remains separate from those campaign scenarios.

## Proposed camera contract

| Phase | Framing | Interaction requirement |
|---|---|---|
| Arrive / inspect | Staged medium-wide view with exits and available doors legible | LOOK/TALK/USE/LEAVE remain available; camera movement is not a commitment |
| Conversation | Both sides remain behind face cut-ins | No portrait panel hides the opposing cast or swaps the physical set |
| Authored escalation | Pull back to an overview of both complete formations, relevant cover and withdrawal path | Hold action input during the short transition; do not advance the fight or its time cost |
| Plan / target | Stable shallow isometric overview fitted to available world viewport | Actor, legal target, intervening cover and declared intent stay readable together |
| Action presentation | Optional modest focus, pending owner preference | No surprise axis reversal; retain relevant context; reduced motion keeps the overview |
| Round / aftermath | Return to overview before the next choice, then a calmer same-location composition | Stable evidence of condition/consequences; no camera-triggered result settlement |

Do not use a uniform zoom scalar for every screen. Fit the combat footprint plus body/headroom and overlay safe areas; crop quiet scenery first. On short phone landscape, negotiate the command-panel width and world area together. Detailed condition text can live in a selected-unit/target card while compact world markers identify everyone. Avoid label overlap and ambiguous displaced labels; any displacement needs a clear association.

Manual zoom/orbit and FIT remain available. Manual intervention should suppress optional automatic focus until FIT or a clearly defined phase reset. Motion frequency, exact framing ratios and transition duration are proposals to test, not approved tuning.

Orientation reflow must preserve the committed turn and camera subject. UX_SPEC also requires a pause before battle reflow; the current probe below checks idle reorientation state preservation, not that full pause contract.

## Horizontal prototype probe — C.05 unchanged

Source: 0e38feb4c7f632f43f116c26861c7f6356b12030. [Machine-readable findings](c05-landscape-study.json).

Real browser controls on a desktop host with touch emulation:
- Phone landscape: 915x412 CSS px, emulated DPR 2.625; world 615x362 beside a 300px command panel.
- Tablet landscape: 1194x834 CSS px, emulated DPR 2; world 1194x565.
- Phone portrait control: 412x915 CSS px, emulated DPR 2.625; world 412x617.

Each ran default, one zoom-out, zoom-out plus orbit, and reset: 12 framing samples. All main action targets were at least 44px, actor labels stayed inside the world viewport, no horizontal overflow or browser errors occurred, and rigs remained finite. Camera actions did not change the battle snapshot. A real attack worked after camera changes, and an idle orientation swap preserved the committed turn.

**Visual acceptance fails:** two teammate-label pairs overlap in every sampled view. One zoom-out makes bodies smaller while label boxes retain their size. The probe establishes usable controls and state continuity; it does not establish readable combat framing, safe automatic focus, physical Pixel/iPad performance or a completed responsive UI.

Private captures and the diagnostic script stay in the workspace. No runtime change or new deployment was made for this concept study. C.05 still has manual zoom/orbit and no automatic battle-entry camera.

## Scene variety and play purpose

| Scene | Spatial / light identity | Authored function | Proposed staging to test |
|---|---|---|---|
| Courtyard | Enclosed plaster block, dark arch, limited warm door light | Receipts, obligation, confrontation or withdrawal | Same-set approach, talk and full formation view; resolve the Jaska site-binding conflict first |
| Karhupuisto | Porous paths, trees, low rail, red-granite bear/plinth | Watcher, Bear Path information/negotiation/fight branches | Both teams, modest cover and exits visible; quiet bystanders have authored responses |
| Staffed bank | Cool fluorescent order, queue rails, forms, clock, teller glass | Conversion, visibility, ledger/family choices | Entered service scene with inspectable facts; no invented combat |
| McCormick yard | Brick, corrugated doors, metal, work light, broad service ground | Terms, dependency, family leverage | Ledger/meeting space and readable way out; a combat-sized clearing does not itself author a battle |
| Harbour | Exposed waterfront, industrial depth, isolated floodlights | Existing chapter operation and explicit commitment | Approach/brief/leave before commitment; no invented boss or combat rules |
| Personal rooms / club / counter | Intimate work, repaired objects, named practical lamps | Optional presence, narrative returns and availability | Retain Jaska/Slomo identities and motifs; Arvo's physical venue remains unassigned |

## C.06 implementation following owner approval

The owner approved applying the wider framing and fixing labels in the existing courtyard. C.06 now implements the full-board/headroom fit, compact condition/guard tags with collision avoidance and leader lines, FIT, and a short orientation reflow pause. See [implementation and reports](../web/fight-module/CAMERA_FRAMING.md). The C.05 findings above remain the before-change record. These changes do not add the four approved concept environments or automatic cinematic focus.

## Next bounded build

1. D008 records approval of v03 panels 02/03/05/06. Record remaining camera/scene-family/time answers in scenario-atlas.json when received.
2. C.06 implements the four-actor camera/tag correction; evaluate it on the physical devices and expand layout checks before increasing roster density.
3. Exercise full formations, edge targets, cover, action focus cancellation, context recovery and orientation pause. Use Pixel 10 Pro and iPad M2 for physical acceptance.
4. Build the chosen authored scenario's six-beat storyboard and one connected encounter. Reuse its physical set through discussion, permitted escalation and aftermath.
5. Expand scene dressing/asset requests from the tested packet, not from every decorative object in concept art.

## Review artifact provenance

Workspace final: outputs/piritori-concepts/kallio-2003-wide-scenes-v03.png.
Prompt/source notes: outputs/piritori-concepts/kallio-2003-wide-scenes-v03.md.
Built-in imagegen was used with kallio-2003-six-angles-v02.png as a style reference. Review art is not loaded by the game. D001 records hashes of the approved earlier sheets; D008 records the v03 hash and four approved panel IDs. D006 and D007 are pending camera/scene-family questions. D002 time costs and D003 first connected scenario remain unresolved.
