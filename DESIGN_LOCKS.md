# Piritori → Eden — core design locks

Version: 1.0  
Date: 2026-08-19  
Status: **ACTIVE — structural authority for UX and Art Bible v1**  

This document closes the structural questions left open by the pre-UX GDD and
is implemented by `ART_BIBLE.md` and `UX_SPEC.md`.
These are design locks, not final balance values. A value marked **playtest
gate** may move after a recorded test, but implementation should use the target
until evidence supports changing it.

## 1. Time and campaign shape

### 1.1 Vertical slice

The Era I vertical slice covers **seven days with two player-controlled action
blocks per day**: **Day** and **Night**.

- A normal trip, encounter or mission consumes one block.
- A battle belongs to its parent mission and consumes no extra block.
- The player can inspect, compare, equip and read without advancing time.
- A scheduled TV bulletin closes Day; settlement closes Night.
- Opening hours, crowds and route conditions distinguish the two blocks.

Two blocks keep the slice legible on mobile and force meaningful opportunity
costs without asking a first-time player to plan a full day before learning the
city.

### 1.2 Full Era I target

The first full-campaign target is **21 days with Day, Evening and Night action
blocks**. This is a **playtest gate**, not a promise to preserve exactly 63
actions. The target changes only if the seven-day slice demonstrates that
relationship, route or battle pacing cannot support it.

The original *Drug Wars* 30-day structure remains a pressure reference, not a
required campaign length.

### 1.3 Complete two-era run

One complete Aatami-to-Kalle run targets **5–10 hours**, with **6–8 hours** as
the centre of the tuning range. The working structure is 21 Era I days and 21
Era II days, each using Day, Evening and Night once the seven-day slice has
validated the loop. That is a pacing target rather than permission to pad the
campaign: inspection, equipping and reading do not consume blocks, while
authored missions and battles may take longer than routine market decisions.

The midpoint is a hard narrative inheritance into 2024. Control moves to
Kalle; older Aatami becomes a recurring narrative figure. Era II uses a larger
map that retains the Kallio origin network and extends to four owner-locked
edges: Pasila north, Kalasatama east, Downtown south and Töölö west. Nothing
north of Pasila or east of Kalasatama belongs to the campaign board. Exact
public anchors and edges require their own map-source pass before
implementation.

## 2. Location interaction grammar

Location scenes use a **hybrid action vocabulary**.

Persistent verbs:

- **LOOK** — inspect the stage, person or object without committing time;
- **TALK** — begin or continue a conversation;
- **USE** — interact with a selected object, person or carried item;
- **LEAVE** — return to the map when departure is allowed.

Contextual actions appear beside them when a place has an earned service or a
meaningful decision, such as **BUY INFO**, **ASK FOR WORK**, **CONVERT MARKKA**,
**RISK SABOTAGE** or **ACCEPT**.

Rules:

- no pixel hunting;
- every interactive element receives a visible focus state and readable label;
- no important consequence hides behind repeating LOOK on the same object;
- a service is attached to its person and place before it becomes a recurring
  management shortcut;
- verbs describe intent; contextual buttons describe the actual commitment.

This keeps the readable adventure-game staging of *Police Quest* and *Leisure
Suit Larry* without importing procedural traps or a verb wall.

## 3. Aatami's physical role

Aatami is physically present throughout the **Street** and **Network** phases.
He personally handles the first purchase, first sales, early travel, family
scenes and relationship-defining encounters.

During **Leverage** and **Command**:

- routine transport and repeat sales may be delegated;
- Aatami still appears at home, recurring interiors, faction negotiations,
  recruitment, funerals, betrayals and other authored turning points;
- the map may show him travelling when a mission explicitly requires him;
- he is never a regular deployable combat unit.

The transition to command must be visible as distance from field risk, not as
the protagonist disappearing from his own story.

## 4. Crew size, formation and lethality

### 4.1 Deployed team size

- The vertical slice is tuned around a **three-person deployed crew**.
- It supports asymmetric encounters from 1v1 through 3v3.
- The post-slice hard cap is **four deployed units per side**.
- A larger roster remains off the board as injured, unavailable, reserved or
  assigned elsewhere.

### 4.2 Board shape

The default battlefield is a mostly invisible **3 × 3 formation per side**:
front, middle and back rows across three lanes.

A **3 × 4 formation** is a deliberate mission or arena modifier for wide
streets, yards, docks and other locations where the extra lane creates a clear
tactical difference. It is not the default board.

The game is about position, cover, weapon reach and commitment—not walking a
unit tile by tile. Repositioning is an action; it is never free camera-driven
movement.

### 4.3 Casualty model

Reaching zero condition causes a unit to become **downed**, not to die from an
unannounced random roll.

Death is rare and forecast. It can occur only when at least one readable lethal
condition exists, such as:

- a lethal weapon or explicit finishing intent;
- severe excess harm after a unit is already downed;
- an unresolved critical wound after the battle;
- a player decision to abandon a downed person during retreat.

The interface must warn about lethal exposure before confirmation whenever the
player can reasonably know it. Wounds, lost availability, treatment cost,
trauma, surrender and retreat are more common consequences than death.

There is no untelegraphed post-battle death lottery. The system can still be
uncertain, but uncertainty is expressed as a known risk band with an
opportunity to respond.

## 5. Market access and information

The recurring management surface belongs to **Aatami's ledger at his current
home or office** after the introductory street missions unlock it.

- The ledger records known offers, quote age, stock, cash, debt, crew and
  obligations.
- It does not generate prices or services by itself.
- Exact quotes still come from accessible people and places.
- Rumours may arrive by call or SMS; research requires a desktop terminal.
- Era I never presents the market as a modern smartphone app.

The player may open the ledger as a planning shortcut from the map only when
Aatami is narratively able to return to it without spending a block. A mission,
combat or time-critical encounter can temporarily disable that shortcut.

## 6. The meaning of Eden

**Eden is a deliberately unstable promise**, not a single meter or map node.

Its concrete anchor is a future Pasila home and an exit plan for Aatami and his
sons. Different people understand it differently:

- Aatami treats it as security and distance from Piritori;
- Jaska questions whether money built through harm can become refuge;
- Kalle later inherits it as territory and expectation;
- Aaro experiences it as a family story he did not choose.

The game tracks the ingredients separately: exit fund, debt, surviving
relationships, family closeness, network dependence and neighbourhood harm.
Reaching Pasila remains fixed history; whether the move reads as refuge, exile
or expansion is the player's Era I outcome.

### 6.1 East of Eden family-function lock

The family story is a deliberate functional adaptation rather than a thematic
name-check:

- **Aatami** carries the Adam father function;
- **Kalle** carries the Cal / Cain function: ambition, inheritance, the need
  for approval and a choice that helps rupture the brothers;
- **Aaro** carries the Aron / Abel function: idealism, refusal of the inherited
  business and the fixed death that leaves the family behind;
- **Jaska** establishes the first-generation brother cycle without copying
  Charles Trask's biography or violence.

Aaro's departure for Ukraine and death in 2025 are inevitable. The player
cannot optimise a rescue branch. Choices determine how close the brothers were,
what Kalle disclosed or weaponised, how much responsibility Kalle carries, how
Aatami is devastated and whether anyone interrupts the inherited pattern
afterward. Aaro retains agency and never becomes a reward, punishment or
mission objective. News of his death triggers Aatami's stroke. Aatami survives
long enough for a diminished final reckoning; the stroke is consequence and
character state, not a medical minigame.

- **Kati** is the sons' intermittently present mother and carries only the
  restless maternal-legacy function. She loves to roam and is not a stable
  household figure. Her absence matters, but she is not a Cathy/Kate replica,
  a secret crime boss or shorthand for evil.
- **Toko** carries much of the moral-interpreter function as an independent
  friend and shop owner, never through an ethnic-servant analogy.
- **Aida** carries the outside-witness and future-facing function. She begins
  in Aaro's music-world orbit, understands both brothers and challenges Kalle
  after the tragedy without absolving or redeeming him. Whether she is romantic
  with either brother remains open.

## 7. The first purchase

The opening is **map first**. The complete Era I Kallio board is visible, with
Piritori selected and highlighted as Aatami's only live lead. The player enters
the location from the map, buys the first abstract pack, then sees a separate
higher-demand destination highlighted for the first sale. That sale precedes
the first family detour so the basic buy-here / sell-there profit loop is
understood before the narrative widens.

The growth ladder is buyer → neighbourhood seller → network builder → emerging
supplier. Price spread teaches the first step; recruited people, route capacity,
information and recurring larger offers teach the later steps. Exact prices
remain balance values, but the first profitable spread is not optional.

Refusing the first Piritori purchase opens a **short alternate opening**. It is
neither failure nor a permanent refusal route.

The refusal path:

- costs one opportunity and changes the seller's first impression;
- exposes the player to Jaska, a street observation or a small information
  favour before the market tutorial;
- gives a different warning and price context;
- returns to a later purchase opportunity within the opening two days.

The campaign still requires Aatami to enter the market because that event is
fixed history. The alternate path exists to establish character and teach that
choices alter relationships and information before they alter empire scale.

## 8. Era I inheritance into Era II

Era II inherits **state bands and authored flags**, not an exact inventory
copy. The handoff records:

- capital position: broke / stable / rich;
- debt and outstanding obligation bands;
- surviving, estranged and lost people;
- contact and faction relationship flags;
- neighbourhood pressure and harm bands;
- Aatami–Jaska and Kalle–Aaro family states;
- persistent memorial, closure and landmark states;
- whether Pasila began as refuge, exile or expansion.

Weapons, exact stock units, street quotes and routine Era I mission inventory
do not carry forward across 21 years. Era II interprets the inherited bands in
authored scenes and starting conditions.

## 9. Product scope and abstraction

### 9.1 Vertical slice goods

The slice trades **piri only**. Other named goods may appear in dialogue,
rumours or background dressing but are not active market rows.

The larger Era I campaign may activate the already approved street-register
names—pilvi, hasis, subu, piri, koka and hepo—only through the same abstract
tier model. Names never add dosage, preparation, concealment, consumption or
real-world trafficking instruction.

Fake or misrepresented stock is a relationship and trust event. It remains
abstract and must have a readable warning source; the design does not simulate
chemical testing or physical identification.

### 9.2 Fiction and cultural specificity

The active recurring groups are:

- the fictional **McCormick family** around the Siltanen / Kuudes Linja complex;
- **Toko Slomo** and his noodle bar on Vaasankatu;
- the fictional **Jade Lantern Network**, operating through restaurant fronts.

These names are production locks for Era I unless the owner changes them.
Members must be written and drawn as individuals with different roles,
temperaments and loyalties. Ethnicity or nationality is never a combat class,
morality shorthand or generic enemy silhouette.

Real public geography and period texture ground the setting. Criminal people,
operations, exact routes and transactional methods remain fictional or
composite.

## 10. Era I map boundary

The detailed map pass uses this production boundary:

- **south:** Hakaniemi and the Siltasaari waterfront edge;
- **north:** the Vallila / Alppila edge;
- **east:** Sörnäinen and the Hermannin edge;
- **west:** Alppiharju and the rail edge.

Coastline, rail, major street direction, district relationships and landmark
adjacency are preserved. Minor blocks may be compressed for legibility.
Coordinates, node count and playable edges remain Step 5 work; this boundary
does not license a fictional road layout.

### 10.1 Complete-run expansion boundary

The larger Era II board uses a separate sourced pass and these immovable outer
cues:

- **north:** Pasila;
- **east:** Kalasatama;
- **south:** Downtown Helsinki;
- **west:** Töölö.

Kallio remains the origin and connective centre rather than becoming an
obsolete tutorial zone. The complete boundary is visible when Era II opens;
services, relationships and reliable information unlock inside it. This
planning boundary does not lift the Era II production gate in §12.1.

## 11. Audience, content and localisation

- Target rating: **adult / 18+**.
- Required content notices: drug trade, addiction and social harm; violence and
  possible death; family grief; war death; police pressure; exploitation of
  vulnerable people.
- The game does not reward substance use or present it as a player ability.
- Era I slice language support: **Finnish and English**.
- Finnish is the world-facing default for signs, names and local texture;
  complete UI and narrative text remain switchable.
- Japanese localisation is optional later scope, not a slice gate.
- Accessibility copy describes material, colour and icon states rather than
  relying on colour alone.

## 12. Phase gates and historical material

### 12.1 Era II gate

Era II may be outlined as canon, but no Pasila 2024–2025 runtime content or
production art begins until Era I is feature-complete.

Era I feature-complete means:

1. the seven-day loop plays from first purchase through an Eden outcome;
2. ordinary and hidden traffic share working route capacity;
3. location, market, mission, formation battle and news modes each affect the
   same saved campaign state;
4. the responsive mobile and horizontal UX passes their acceptance checks;
5. the approved art pipeline produces registered runtime assets;
6. save/resume and the critical accessibility paths work;
7. the full Era I duration has a recorded playtest decision.

Aaro's full 2024–2025 scene count is deliberately deferred. His departure and
death remain fixed canon and are never converted into a mission or a variable
punishment.

### 12.2 Historical-source rule

Step 6 selects Era I events from `NEWS_SOURCE_LEDGER.md`. Each broadcast or
mission inspired by history must label its internal source note as one of:

- **documented fact**;
- **character inference**;
- **character accusation**;
- **fictional composite**.

Arvo Linde reports documented public facts. Inference and accusation are
attributed to speakers; the newscast does not launder them into truth.

## 13. Decisions intentionally deferred

The following are content or balance work, not blockers for Art Bible and UX:

- exact crew roster, ages and per-character visual descriptions;
- final node coordinates and compressed street geometry;
- exact encounter odds, prices, damage and treatment values;
- the full list of Era I missions and broadcasts;
- post-slice venue variants and faction sub-rosters;
- Era II production content.

If later work needs one of these, record it at the appropriate milestone. Do
not silently turn a placeholder into canon.
