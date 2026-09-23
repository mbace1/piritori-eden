// Magazines — MST's rhythm, and the reason a turn in TURF now has more than
// one question in it.
//
// THE RULE. A ranged weapon holds `mag` rounds; firing spends one; reloading
// IS your action for the turn. Melee has no magazine at all — a knife does
// not run out, and that reliability is precisely what melee trades its range
// for. Giving every weapon a magazine would have taken away the one
// advantage the close-range half of the roster has.
//
// WHY IT EARNS ITS PLACE, rather than being bookkeeping. Through v26 every
// weapon fired every turn, forever, so the only question a turn asked was
// "who do I shoot". An empty magazine turns the same turn into a choice —
// and because a reload costs the ACTION and leaves the MOVE untouched, the
// turn you spend refilling is a turn you spend repositioning. That is the
// movement economy (momentum.js) getting the empty turns it was previously
// competing with a free attack for, and it is why this went in before the
// boss the roadmap used to have here.
//
// WHY THIS IS ITS OWN MODULE. combat.js (which absorbed ai.js in v36), autoplay.js
// and render.js all need to ask "is this thing empty", and until v36 the rival
// brain lived in ai.js, which combat.js imported — so the pair would have been circular (the same
// constraint that put recomputeWeapon's result on `unit.weapon` rather than
// behind a getter). A predicate copied into four files is the third-copy bug
// this codebase has already paid for twice; a leaf module with no imports of
// its own is the version that cannot drift.

// The magazine size for a weapon, or null for anything that does not run out.
export const magOf = weapon =>
  (weapon && weapon.archetype === 'ranged' && weapon.mag) || null;

// Rounds in the gun right now. An ABSENT `ammo` means full, not empty, and
// that distinction is load-bearing: any path that puts a weapon on a unit
// without also seeding the count — a direct assignment, a future pickup, a
// test poking at internals — would otherwise hand back a gun that is
// silently out of rounds. Only a real `0`, arrived at by firing, is empty.
export function roundsLeft(unit) {
  const mag = magOf(unit && unit.weapon);
  if (mag == null) return null;
  return unit.ammo == null ? mag : unit.ammo;
}

// True when this unit carries a magazine and it is empty. Melee is never
// "needing a reload", which is what stops every check having to remember to
// special-case it.
export const needsReload = unit => {
  const left = roundsLeft(unit);
  return left != null && left <= 0;
};

// How full, as a fraction, for anything drawing a pip row. Null when the
// question does not apply.
export function ammoFraction(unit) {
  const mag = magOf(unit && unit.weapon);
  if (mag == null) return null;
  return Math.max(0, Math.min(1, roundsLeft(unit) / mag));
}
