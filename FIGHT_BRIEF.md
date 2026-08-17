# Fights — design brief v2

Owner direction, 2026-08-17. Supersedes v1. `BRIEF.md` and the PR #269
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
| Dope Wars — do not copy: **guns, combat** | no working firearm exists. The pistol from v1 is **removed**. |
| § Pressure/heat: *"There is no gunfight."* | a fight is never a shootout; it is a scuffle you can walk out of |
| § Trust: *"Avoid a large good/evil meter."* | **no morality score.** Divergence is not a number |
| § Endings: *"a small matrix rather than a morality score"* | debt · exit fund · heat · relationships intact or burned |
| § Tone: no *"police as faceless combat targets"* | you never fight the police. Patrols close lines; they do not brawl |
| Do not copy: *"random punishment without readable warning"* | every encounter is caused by something the player did, and telegraphs |

The owner has overridden *"no combat layer"* twice, with a brief. That override
stands. **Everything around it still holds**, and the list above is what
actually shapes the redesign.

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

The pistol is gone (canon: no guns, no gunfight). The **blank gun** stays and
is now the clearest statement the design makes: it does **zero harm**, it is one
of the strongest pieces on the board, and the fiction already sold it — the
McCormicks deal *"hard steel or blank guns."*

| weapon | harm | nerve | from | reach | pierce | effect |
|---|---|---|---|---|---|---|
| fists | 1–3 | 1 | front | front | no | — |
| bottle | 2–4 | 1 | front, middle | front | no | — |
| bat | 2–5 | 2 | front | front | no | shove |
| steel | 4–7 | 0 | front | front | no | — |
| blank gun | **0** | **4** | middle, back | any | yes | fear |
| hook | 1–2 | 1 | front, middle | front, middle | yes | pull |

Read the table as a moral gradient without a morality meter: **steel is the
most harm and the least fear** — it only hurts. **The blank gun is all fear and
no harm.** Both win fights. They leave different cities behind them.

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
