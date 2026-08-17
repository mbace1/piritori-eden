# Fights — design brief

Owner direction, 2026-08-17. Supersedes the three-beat placeholder that shipped
in `fe5309b`, and supersedes `BRIEF.md` § "no combat layer" for as long as this
document stands.

## 1. What the owner asked for, verbatim

> 3v3, 2v2, any X v X fights should be isometric view with front, middle and
> back rows. 3x3 or 3x4 invisible grid design for each side. Sorta simple chess
> with covers. Auto-battler options otherwise tactics ogre simplified meets
> darkest dungeon. Less about movement, more about positioning and weapons
> available.

## 2. The thesis

**Where you stand decides what you may do.** Not how far you can walk.

Darkest Dungeon's rank rule is the engine: every weapon declares the rows it
can be *used from* and the rows it can *reach*. A bat is useless from the back.
A pistol is useless in a scrum. So a fight is won or lost by the shape of your
line before the first blow, and by whatever wrecks the other side's shape.

Tactics Ogre supplies the frame — a deploy step, facing, an initiative order —
with everything to do with terrain, height, elemental tables and job trees
stripped out.

"Chess with covers" is taken literally: **a body in front is cover.** Anything
that does not pierce resolves against the frontmost living enemy in that
column, so the back row is genuinely protected until the front row falls.

## 3. The board

- **Two sides face each other.** Each side owns a grid of **3 columns × 3 rows**
  (`3x4` is supported by the same code — `ROWS` is a constant, not an
  assumption).
- **Row 0 is the FRONT**, nearest the enemy. Row 1 middle, row 2 back.
- Columns are left/right from that side's own point of view.
- Any X v X: 1v1 up to 9v9 on a 3×3. Typical is **2v2 and 3v3**.
- The grid is **invisible in play** — drawn as ground shadow, not as tiles.
- **Isometric view.** Both sides on one screen, the player's side nearest the
  camera.

## 4. Positions, weapons, cover

**A weapon declares four things:**

| field | meaning |
|---|---|
| `from` | rows the wielder may use it from |
| `reach` | enemy rows it can strike |
| `pierce` | false = must hit the frontmost living enemy in that column |
| `effect` | none, or one of shove / pull / fear / stun |

That table is the whole positioning game. Nothing else is needed to make front
and back rows mean different things.

**Cover** is a body, not a stat. A unit in row 2 of column 1 is covered while
anything of its own side lives in row 0 or 1 of column 1. Pierce ignores it.

**Formation-breakers matter more than damage.** Shove pushes a unit one row
back, pull drags it one row forward, and both can strand a pistol in the front
row or a bat in the back where neither can do anything. That is the intended
way to win: not out-damaging, but taking the other side's shape away.

## 5. Actions

On its turn a unit does exactly one of:

- **Attack** with a weapon it can legally use from where it stands.
- **Reposition** one row forward or back, into an empty cell in its column.
- **Guard** — brace, reducing the next hit.

Movement is deliberately one rank and deliberately an action. Repositioning is
a cost, so a broken formation stays broken for a turn.

## 6. Turn order

Initiative is a `speed` stat, descending, ties broken by unit id so a seed
always replays identically. Every unit acts once a round.

## 7. Auto-battler

A toggle, on at all times, not a difficulty setting:

- **Manual** — you pick each unit's action.
- **Auto** — your side is resolved by the same priority the opposition uses.

Auto exists because a street fight is not always worth five minutes of the
player's attention. It must be the *same* resolver both sides use, so it can
never be a secretly worse or better player than the enemy AI.

## 8. What carries over from the placeholder

These were built to `BRIEF.md`'s surrounding rules and still hold:

- **Paying and walking away are always available**, and never worse than a
  losing brawl. The brief's preferred responses are still rerouting, paying and
  sacrificing profit.
- **The enemy telegraphs.** In a rank fight the telegraph is the board itself —
  you can read what each enemy's weapon reaches before you commit — plus an
  explicit intent line for the next actor.
- **Nobody is a faceless target and no weapon is a prize.** A test asserts the
  copy contains no gun handed out as a reward.

## 9. Weapons in the first cut

Drawn from the fiction already written: the McCormicks sell muscle, hard steel
and **blank guns**, and blank guns are the design's best joke — they do no
damage at all and are one of the strongest pieces on the board, because fear
moves people out of position.

| weapon | dmg | from | reach | pierce | effect |
|---|---|---|---|---|---|
| fists | 1–3 | front | front | no | — |
| bottle | 2–4 | front, middle | front | no | — |
| bat | 2–5 | front | front | no | shove |
| steel | 4–7 | front | front | no | — |
| blank gun | 0 | middle, back | any | yes | fear |
| pistol | 4–8 | middle, back | any | yes | — |
| pull-hook | 1–2 | front, middle | front, middle | yes | pull |

## 10. Open, not invented

Called out rather than silently decided:

1. **3×3 or 3×4?** Built to 3×3 with `ROWS` as a constant. Say the word and it
   is one number.
2. **Where do the player's other two fighters come from?** Contacts with enough
   trust is the obvious answer, but nothing in the GDD says so, so the first
   cut fields a fixed pair and the recruitment rule is left open.
3. **Does a death stick?** Currently a downed unit is out for that fight only.
   Permanent loss is a real design decision and is not mine to make.
4. **Stress/affliction.** Darkest Dungeon's other half is deliberately not
   built. `fear` is the one nod to it.
