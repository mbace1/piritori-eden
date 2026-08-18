# Fights — design brief v3

Owner direction, 2026-08-17, amended 2026-08-18 (§2.1, §4.1, §6). Supersedes v1. `BRIEF.md` and the PR #269
materials are **canon**; where this and canon disagree, canon wins and the
disagreement is written down rather than quietly resolved.

## 1. What changed since v1

Three owner locks:

1. **Dope Wars is the reference. Weed Wars is dropped entirely.**
2. **Eden is a mystery.** Steinbeck: *diverging from humanity into vices, and
   then returning to safety.*
3. The PR materials, design and art are canon.

## 2. Reading canon before designing

`BRIEF.md` constrains this harder than v1 admitted:

| canon | consequence here |
|---|---|
| Dope Wars — do not copy: **guns, combat** | **overridden 2026-08-18 — see §2.1.** Live firearms exist. |
| § Pressure/heat: *"There is no gunfight."* | still true, and now enforced structurally rather than by absence — §2.1 |
| § Trust: *"Avoid a large good/evil meter."* | **no morality score.** Divergence is not a number |
| § Endings: *"a small matrix rather than a morality score"* | debt · exit fund · heat · relationships intact or burned |
| § Tone: no *"police as faceless combat targets"* | you never fight the police. Patrols close lines; they do not brawl |
| Do not copy: *"random punishment without readable warning"* | every encounter is caused by something the player did, and telegraphs |

The owner has overridden *"no combat layer"* twice, with a brief. That override
stands. **Everything around it still holds**, and the list above is what
actually shapes the redesign.

## 2.1 Guns — the 2026-08-18 override

The owner was asked whether the pistol and shotgun on the delivered pose sheet
were the blank gun and a mistake, or a change of canon. The answer was three
words: **"there are guns."**

`BRIEF.md` still says *"there is no gunfight"*, and that sentence is not
deleted, because it is not actually about whether firearms exist — the
McCormicks have been selling *"hard steel or blank guns"* since the first
pitch. It is about what a fight in this game IS. So the two are reconciled by
four rules, all of them enforced by `test/fight.mjs` rather than asserted here:

1. **Live firearms exist and they work.** `live: true` in the weapon table:
   pistol, shotgun, rifle. They draw real blood.
2. **Nobody starts a fight holding one.** Not your crew, not any roster. A gun
   in a fight is something the player went and got, which keeps the encounter
   ladder a scuffle you walked into.
3. **Fear is still the only FREE thing that reaches the back row.** The blank
   gun's whole argument survives: everything else that projects across the
   board now costs you.
4. **A shot is priced, not scored.** It is counted, everyone on the board hears
   it and is shaken by it, a fight with a shot in it can never be recorded as
   *routed*, and `consequence()` charges more heat and more trust for it than
   any other way out of any fight — including losing.

That is the same argument the routed/win split already makes, one rung further
out: the gun is real, it is decisive, and it is never the cheap answer.

## 3. The Steinbeck axis

*East of Eden* is where Cain went **after** — exile, the land of Nod. The arrow
in **Piritori → Eden** is the return journey. The book's engine is one word:
**timshel**, *thou mayest*. Not a command, not a promise. The choice stays open
to the last page.

So the fight's question stops being *how do I win this* and becomes:

> **how much of myself do I spend winning it, and can I come back?**

**And it is expressed without a meter.** Divergence is not scored — it is paid
in the two axes canon already has:

- **who stops taking your calls** (trust, § Trust — shown by what people do,
  offer or refuse)
- **what the street remembers** (heat, on the node or edge where it happened)

Put a body on the ground in front of a contact and that contact is different
tomorrow. Nothing is tallied. That is the whole moral system, and it is the one
canon already specifies.

## 4. The board (unchanged, still canon from v1)

3 columns × 3 rows a side, isometric, X v X. Row 0 front. A weapon declares the
rows it may be used **from** and the rows it can **reach**. Cover is a body: a
non-piercing weapon resolves against the frontmost living enemy in that column.
Auto-battler runs the same resolver the opposition uses.

## 4.1 Cover is terrain, and also others

Amended 2026-08-18. Asked whether the concrete barriers in the delivered fight
mockups were set dressing or real, the owner said **"cover is terrain and also
others"**, and then **"we can have rocks etc"**. So:

- A **prop** stands on a cell of one side's grid: barrier, boulder, bin, crate,
  bike rack. It occupies that cell — nobody may move into it.
- The old rule generalises rather than changing: a non-piercing weapon resolves
  against the frontmost **thing** in the lane, body or barrier alike.
- **Hard** cover (concrete, stone) stops a piercing weapon too. Soft cover
  (a bin, a crate) does not — you shoot over a bin. A hard prop therefore
  *shuts a lane*, and everything behind it is out of the fight until it comes
  down.
- Props are hittable and breakable. `breach` is what a weapon does to a thing
  rather than a person: a crowbar is poor against a man and takes concrete
  apart in four swings.
- Props are not people. They carry no nerve, breaking one shakes nobody, they
  never take a turn, and they cannot win or lose the fight.
- A weapon that draws no blood cannot be *aimed* at cover — the blank gun is
  still **blocked** by it, it just has nothing to say to a bin.

**Two honest limits.** Cover only shields the lane *behind* it, not the fighter
standing next to it; and it only affects incoming attacks, so your own props do
not obstruct your own swings. Both are simplifications, and both keep the rule
readable on a board where the grid is invisible.

Each opponent names an **arena** (`harbour` / `court` / `park`), which is what
the four delivered backgrounds attach to, and carries its own cover layout.
The hard cover on the rival crew's ground is on **your** side deliberately: a
boulder in front of their blank gun shut that lane and took the bloodless rout
off the table against the weakest crew, and that rung of the moral ladder has
to stay climbable. Igor's men are the ones who get to choose their ground.

## 5. What is new: nerve, and three ways to win

**Every unit has two tracks — harm and nerve.** Harm is a body. Nerve is
whether they still want to be here.

Nerve drains from being frightened, shoved out of position, and — most of all —
**from watching somebody go down**. At zero nerve a unit leaves the fight,
unhurt.

That single addition gives the fight three exits instead of one:

| exit | how | costs |
|---|---|---|
| **Rout** | break their nerve; they leave on their own feet | almost nothing |
| **Break** | put bodies on the ground | heat where it happened, trust with whoever saw |
| **Walk / pay** | always available, canon from v1 | the load, or the money |

**Routing is a first-class win, not a consolation.** This is the mechanical
argument for restraint: the cheapest path through a fight is the one where
nobody is hurt, and the player discovers that by playing rather than by being
told.

**STAND DOWN** is an explicit verb. Offer them the out; if their side's nerve is
already low enough they take it. It is the return-to-safety move, available
every single round — timshel, as a button that never greys out.

## 6. Weapons

The **blank gun** is still the clearest statement the design makes: it does
**zero harm**, it is one of the strongest pieces on the board, and the fiction
already sold it — the McCormicks deal *"hard steel or blank guns."*

| weapon | harm | nerve | from | reach | pierce | breach | effect |
|---|---|---|---|---|---|---|---|
| fists | 1–3 | 1 | front | front | no | — | — |
| bottle | 2–4 | 1 | front, middle | front | no | — | — |
| bat | 2–5 | 2 | front | front | no | — | shove |
| steel | 4–7 | 0 | front | front | no | — | — |
| blank gun | **0** | **4** | middle, back | any | yes | — | fear |
| hook | 1–2 | 1 | front, middle | front, middle | yes | — | pull |
| crowbar | 2–5 | 1 | front | front | no | **×3** | — |
| plank | 1–6 | 2 | front, middle | front | no | — | shove |
| **pistol** | 3–6 | 3 | middle, back | any | yes | — | live |
| **shotgun** | 5–9 | 3 | front, middle | front, middle | no | ×2 | live, shove |
| **rifle** | 4–8 | 2 | back | any | yes | — | live |

Read the table as a moral gradient without a morality meter: **steel is the
most harm and the least fear** — it only hurts. **The blank gun is all fear and
no harm.** Both win fights. They leave different cities behind them. The three
**live** weapons sit off the end of that gradient: they settle a fight fastest
and they are the only entries the city itself reacts to (§2.1 rule 4).

The crowbar and the plank are the yard tools off the delivered item sheet, and
the crowbar exists mainly to answer §4.1 — a hard barrier needs something in
the game that takes it apart.

## 7. Returning to safety

The map already has the humane nodes: the church (*sit a while*), Jaska on his
bench, Toko Slomo's counter. A fight that went badly leaves a mark those places
ease. That is the return half of the Steinbeck arc, and it costs a night —
which is the real price, because a night is the game's only currency of time.

## 8. Eden stays a mystery

Locked by the owner. Therefore, in the build:

- Eden is **never a node**, never a pin, never a progress bar, never a number
  with its name on it.
- Nothing in the UI explains what it is or what it costs. The v1 mission pin
  that read *"Three thousand, banked, buys the life this was supposed to be
  for"* is **removed** — it explained the mystery away.
- The exit fund stays, because canon's ending matrix reads it. It is just never
  labelled Eden.
- You find out what Eden was at the end, from which ending you earned.

## 9. Still open

1. **3×3 or 3×4** — one constant.
2. **Where the player's other two fighters come from.** Contacts with enough
   trust is the obvious answer; nothing in canon says so, so a fixed trio holds.
3. **Does a death stick** across the campaign.
4. **Campaign length** — canon says 30 days, canon also lists it as an open
   decision.

**Closed by this brief:** *which Weed Wars* — none. Dope Wars only, so there is
no production timing, no cook site, no stock slots, and no business upgrades.
