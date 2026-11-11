# Piritori → Eden — producer design doc

**Status:** living producer design doc · promoted 11 Nov 2026 into `design/PRODUCER_DESIGN.md`  
**Producer:** D-sign  
**Live / source:** https://github.com/mbace1/piritori-eden · hub slices e.g. `piritori-c17`  
**Workflow:** [`ACTIVEPRODUCER.md`](ACTIVEPRODUCER.md)

### Relationship to existing canon

**`DESIGN_AUTHORITY.md` still wins contradictions** with the rest of the canon stack (`DESIGN_LOCKS.md`, `GAME_DESIGN_DOCUMENT.md`, `NARRATIVE.md` / East of Eden locks, `design/STORY_PITCHES.md` (H1–H8), `ACT1_PLAN.md`, `UX_SPEC.md`, `MAP.md`, `ACTIVE_CONTEXT.md`).

This file **does not replace** that stack. It records **Decision 10 Nov 2026** overrides and a producer-facing summary. Dated Decision log entries in this file are Mikael's later rulings; they override the specific older lines they name (including the inverted web/Godot line formerly in `ACT1_PLAN.md`). Merge those dated decisions into `DESIGN_AUTHORITY.md` when that file is next edited.

---

## 1. Vision

A narrative strategy game in **Kallio, Helsinki, 2003**, continuing through the **East of Eden** family drama into the sons' generation (**Kalle** era / Era II) as locked in `NARRATIVE.md` and `DESIGN_LOCKS.md` §6.1.

**Feel of a good session (**Decision 10 Nov 2026**):** strategic elation from **selling, fighting, and making it through the streets** as an **up-and-coming hustler**.

**Not:** inventing plots without greenlight; adult Piritori content inside Toko Move; dropping stand-in art rules without a promotion gate.

---

## 2. Pillars (canon + today)

1. **City + ledger + rare fights** — five modes per `UX_SPEC.md` (map, location, ledger, fight, news).
2. **Full intent before commitment** — forecasts; travel events may now show **hints** (**Decision 10 Nov 2026**; extends AUTHORITY answer 6 "surprise until indicators").
3. **Same scene escalate** — meeting → fight with the same cast (`DESIGN_AUTHORITY` shared-scene ruling).
4. **East of Eden functions** — Aatami / Kalle / Aaro roles per `DESIGN_LOCKS` §6.1 and `NARRATIVE.md` (dramatic functions, not copy-paste plot).
5. **Locations are defined by their options** (**Decision 10 Nov 2026**) — see §4.
6. **Stand-ins until proven** — AUTHORITY 2026-10-02.

---

## 3. Structure — Act I / Act II (**Decision 10 Nov 2026**)

| | Canon already | Today's lock |
|---|---|---|
| Era length | H1 greenlit: **4 chapters ≈ 10 days** each (`STORY_PITCHES` / AUTHORITY) | Confirmed as **4 chapters of about 10 nights** each (same length; "nights" = chapter scale Mikael named) |
| Unlock | H2 spine + doors + road + case | Each chapter **unlocks the next** |
| Act I done | `ACT1_PLAN` Q2 defaulted to **chapter 1 only** | **Resolved:** Act I feature-complete = **all 4 chapters playable in sequence** |
| Act II | Era II / Pasila / Kalle gated | Beating **Act I ch4** opens **Act II ch1 of 4** |

`ACT1_PLAN.md` Q2 option (b) is now the answer. DESIGN_LOCKS §12.1 / PHASING Phase E still list the formal bar — apply them across the four chapters, not only ch1.

Chapter 4 remains the **Pasila move** / Eden outcome spine (H8 / GDD), unless a later decision changes it.

---

## 4. Locations = options (**Decision 10 Nov 2026**)

A location is defined by **what you can do there**, not only by a backdrop. Option types include (non-exhaustive):

- substance seller  
- weapon / item shop  
- info contact  
- hiring help  
- narrative location  
- mission character  

Some places carry **several** options (example: **Piritori square has 2+**). Aligns with lit-door / named-location AUTHORITY rulings and hybrid location verbs in `DESIGN_LOCKS` §2 / `UX_SPEC` location mode — this decision makes multi-option density a design requirement.

---

## 5. Next design pass priority (**Decision 10 Nov 2026**)

**City / mission drama** first (producer recommendation; Mikael unsure but accepted as the pass priority). Combat feel and art acceptance stay important but are not the current conversation lead.

Travel events: **may show hints** (softens pure surprise).

---

## 6. Gaps vs current build

| Design | Build today | Gap |
|---|---|---|
| Act I = 4 chapters playable in sequence | One authored ~10-day chapter (`chapter-1-piritori` / era1 slice); ch2+ pitches exist | **Largest** — chapters 2–4 |
| Locations as multi-option hubs | Doors, shops, Tokon Ramen, etc. exist; density uneven; not all anchors are multi-option by design | Content authoring |
| Travel event hints | Road events shipped; AUTHORITY still "surprise" until this decision | UX: add optional hint layer |
| East of Eden → Kalle era playable | Narrative locked; Era II phase-gated; not playable as Act II ch1 | After Act I |
| Physical Pixel/iPad acceptance | Repeatedly OPEN on C.* releases | Device gate |

---

## 7. Decision log

### Decision 10 Nov 2026 — Session feel + priority + travel hints + locations + Act I size
- **Mikael (paraphrase):** Good session = strategic elation from selling, fighting, making it through the streets as an up-and-coming hustler, through East of Eden beats into the two sons' generation / Kalle era (per docs). Next design pass: city/mission drama (producer's recommendation; he was unsure). Travel events may show hints. Locations are defined by their options (seller, shop, info, hire, narrative, mission character…); some have several (Piritori square 2+). Act I = 4 chapters of about 10 nights each, each unlocking the next; beating ch4 opens Act II ch1 of 4. Act I feature-complete = all 4 chapters playable in sequence.
- **Locks:** as above.
- **Supersedes / extends:** `ACT1_PLAN` Q2 (was chapter-1-only default); AUTHORITY travel-event "surprise until indicators"; H1 chapter count confirmed.

---

### Decision 10 Nov 2026 — Chapter length
- **Mikael:** 10 days and 10 nights are the same: each cycle usually starts during the day and ends in the early morning, fitting the theme. Act I ch4 can be **12 days** as the last part of Act I; maybe the same for the Act II ending climax.
- **Locks:** chapter ≈ 10 day→early-morning cycles; Act I ch4 ≈ 12; Act II finale likely ≈ 12 (soft).

### Decision 10 Nov 2026 — Travel route info
- **Mikael:** Depends on active mission — you see the mission goal. Maybe a known dealer sits on a stop along the way you want to visit; maybe there are **?** events you take a chance on. All divergence usually costs some time and maybe money.
- **Locks:** route preview shows active mission goal, known dealers at stops, and unnamed **?** events; detours cost time (and often money).

### Decision 10 Nov 2026 — Act II in the same game
- **Mikael:** Same game, years later (per existing docs): Aatami is old with two sons; Kalle inherits the trade and tries to make a name; map expands to Pasila and Töölö; modern tech; alpha-PVP addicts; Pasila Police play a much bigger narrative role.
- **Locks:** Act II continues in the same build/product after Act I ch4 — not a separate release.

### Decision 10 Nov 2026 — Web leads, Godot follows
- **Mikael:** "Seems like Godot will follow."
- **Locks:** web build leads the four-chapter push; Godot follows (agrees with `DESIGN_AUTHORITY.md:22` / `PORTING.md` §1). **`ACT1_PLAN.md` line 12 and Q1 must be corrected** when docs are promoted.

---

## 8. Open questions (docs leave open — ask one at a time)

(none open right now)
