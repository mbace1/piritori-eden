# C.18 UI / renderer review

## First candidate: f8bfd46ca334e67dda854d863be07e1b281f2980

The dedicated browser review passed six configurations: phone 412x915, compact phone 360x640, short landscape 844x390, tablet 1194x834, desktop 1366x768, and phone safe rendering. Screenshots were manually inspected for the phone battle/forecast and desktop battle; the short-landscape forecast visibly covered too much of the board.

Browser evidence: Actions run 35149713172, artifact c18-ui-rendering. This is software-rendered Chromium evidence, not physical-device acceptance.

Full regression run 35149713145 correctly blocked release: gun-aim cancellation after manual drag failed in short landscape, and the crew outing test found an extraction button intercepting a roster touch. Campaign, Godot, Act I, laboratory tactics, night places and wet-environment checks passed.

## Corrected layout

Commit 2253dbc392f8b3dfb4c7846332df100c4c535dd0 integrates the short-landscape forecast into the central command surface, raises the roster above contextual buttons, constrains the intent scroll area, and fixes implicit grid columns during menu transitions. The previous failing assertions remain intact.

The pixel test now samples the canvas itself after a naturally rendered frame, not the element's DOM bounding box. This prevents HTML labels from masquerading as a rendered arena. Existing duplicate import tokens in the touched entry modules were aligned with session v12 and tactics v7.

The corrected phone battle and short-landscape movement screenshots were inspected from run 35150822091, artifact 10469660203. The courtyard and procedural crew are visible, the command dock is coherent, and the landscape forecast no longer covers the scene. Actual canvas samples passed on phone, compact phone and landscape. That run subsequently timed out taking a tablet screenshot, so it is not a complete six-layout pass.

## Graphics interruption correction

The next gun-camera regression exposed a stale forecast after context restoration: the action reset to empty but its confirmation stayed open and obscured the short-landscape commands. Commit 1e463c1565cc752eb453336bddefb4f9475e1c8d clears that uncommitted preview when graphics resume. This is a presentation reset only; the original battle snapshot, exactly-once shot and camera interruption assertions remain intact.

The final exact source head still needs all standard gates plus the corrected pixel/UI gate before merging. Hub packaging, published entry verification and the owner's physical phone retest are separate acceptance steps. No external character model or rig has been introduced. Do not report a physical-device fix solely from these software-rendered Chromium tests.
