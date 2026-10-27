# The UI diet (2026-10-26)

**Owner, 2026-10-26:** *"Analyze current UI and elements like character names in general. These aren't needed, so we need to optimize."*

Earlier, in the same direction:
- 2026-08-27: *"the whole face and name screen is not needed. only when a character is active"*;
- 2026-10-24: *"Simplify UX"*;
- 2026-10-26: *"simple UI is better"*.

**The picture:** `design/UI_DIET.jpg`, five screens of v4.81 at Pixel size, with every cut boxed in red.

## The rule

- **A name appears only for whoever is acting**, and only if it changes a decision.
- **Nothing repeats** what the picture or the button already says.
- **The decision is on the first screen.**

## The cuts

1. **The meeting.** Language and reset move into the pause menu. The place is named once, not three times. The step list goes. The warning becomes one short tag, and the look-around chips one button. *Today the choices start below the first screen.*
2. **The fight.** Cut the "Night Shift" title, the second "3 standing", grid codes like "A1–F1", the selected fighter's name and face, and the "1 action" labels. Intent is drawn on the board, not written out with names ("R1 → Lan · 100% · 1 HP / 2 guard").
3. **The brief.** No date header, story paragraph, names or "Saved on this browser". It says "3 vs 3" instead of six names. It keeps the job, the way out, the police and Fight.
4. **The talk.** No name in the bubble, since his face says who it is. The backdrop goes solid so the screen behind stops showing through.
5. **The map.** The explainer shrinks to one line, the line that repeats the button goes, and so does the BATTLE tab.

**Also found:** the title screen says "Seven days"; the chapter is ten.

## What the docs already allow

- **Source labels stay where the rule puts them:** news, and anything citing real events (DESIGN_LOCKS §12.2, UX_SPEC §10.5). A fictional scene does not need "FICTIONAL COMPOSITE"; the GDD asks for source status only *"if it references real events"*.
- **The five modes are not five tabs.** UX_SPEC §3.1: *"These are full interaction modes, not five permanent bottom tabs."* Fights now open in Night Shift, so the BATTLE tab leads nowhere you choose to go.

## Order of work

Each step ships, then gets played.

1. The meeting: the choices on the first screen. This is the biggest gameplay win.
2. The brief and the fight: names out, intent on the board. This is Night Shift, next to G1's tuning, so one session does it.
3. The talk, the map and the header.
