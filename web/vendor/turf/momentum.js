// The movement economy — the one system TURF was missing against its own
// stated lineage.
//
// THE PROBLEM IT SOLVES. Through v23 there was no reason to move once a unit
// was in range: moving cost nothing and bought nothing, so the dominant play
// was to stand still and shoot, and every board knotted into a scrum by
// round one. Metal Slug Tactics — half this game's brief — is built on the
// opposite: movement is the engine, and three separate mechanics make it so.
// This is that engine, adapted to a game that (unlike MST) shows full enemy
// intent, so every part of it has to be legible in advance.
//
// TWO RULES, AND THEY INTERLOCK. Either is dull alone; together they make a
// turn a question about where to stand.
//
//   1. MOMENTUM — a unit banks one point per tile actually moved this turn,
//      and each point sharpens the swing it pays for. It is SPENT by
//      attacking and it resets every turn, so it can never be hoarded.
//      Movement is the only source.
//   2. EVASION — unspent momentum makes you harder to SHOOT (never harder to
//      stab: a knife at one tile does not miss because you jogged). So the
//      same points are either damage or cover, never both, and a unit that
//      runs and holds its fire is doing something real.
//
// THERE WAS A THIRD RULE AND IT WAS CUT, which is worth recording because it
// is the obvious next idea. SYNC — attacking a target an ally also covers
// adds a follow-up from that ally — is straight out of Metal Slug Tactics and
// it does not survive contact with this game. Measured three ways:
//   * free, one follow-up per covering ally: `the-yard` went from 68%
//     winnable to 0% ON THIS RULE ALONE. Anything multiplied by "allies in
//     range" pays the side with more bodies, and this roster is "weaker but
//     numerous" (GDD §10) — the player is never that side.
//   * free, capped at one partner: same collapse. The enemies always had one.
//   * gated on the partner still carrying momentum (so it costs holding that
//     ally's fire): symmetric and safe, and INERT — a bot built to set syncs
//     up deliberately scored 72% against 92% for the same bot ignoring them,
//     because half of one ally's weapon never repays that ally's whole
//     attack. Raising the share until it did would just be "attack twice".
// MST can afford it because it hides enemy intent and fields far more units.
// TURF shows the whole board to three operators; the rule has nowhere to sit.
//
// WHY MOMENTUM FEEDS DAMAGE RATHER THAN A SPECIAL MOVE. MST spends
// adrenaline on named abilities; TURF has no ability system and inventing one
// here would be a second design, not this one. Damage is the existing verb,
// so momentum sharpens it — and because momentum is also evasion, spending it
// on a swing is a real trade: the further you ran to make the shot, the more
// it hurts, and the more exposed you are when it lands.
//
// Every number here is per-tile and small on purpose. A rule the player
// cannot predict in their head is not full information, whatever the HUD
// says.

// MOMENTUM IS SPENT BY ATTACKING, and that is not a flourish — it is the
// rule that keeps the system from being a gift to the AI. Enemies close on
// you every single turn, so they bank momentum constantly while an operator
// holding a firing line banks none; measured with momentum PERMANENT, evasion
// systematically favoured whoever was chasing, and the skill gap between a
// positional bot and a naive one NARROWED (+46 points to +19) — the opposite
// of the intent. Spending it on the swing fixes that at the root: an enemy
// that runs in and hits you is standing still by the time you shoot back, and
// an operator who moves and holds fire keeps the evasion. Evasion or damage,
// never both.
//
// Momentum is capped so a long approach across an open board cannot bank a
// one-shot kill; MOVE_CAP is roughly a fast unit's full move.
export const MOVE_CAP = 4;
// Each point of momentum on the TARGET removes this much from an incoming
// ranged hit chance. At the cap that is -0.24, a little under the -0.3 that
// partial cover already gives — deliberately: running should be comparable to
// cover, never strictly better, or cover stops being a decision.
export const EVADE_PER = 0.06;
// Each point of momentum on the ATTACKER adds this much damage, floored to a
// whole number when applied. At the cap that is +1 on a weapon that mostly
// deals 2-5, so it matters without deciding a fight on its own.
export const DAMAGE_PER = 0.25;

// Tiles moved this turn. Called by combat.js on every position change a
// unit makes UNDER ITS OWN POWER — a knockback is not momentum, since being
// shoved is not running.
export function addMomentum(unit, tiles) {
  unit.momentum = Math.min(MOVE_CAP, (unit.momentum || 0) + Math.max(0, tiles));
}

export function clearMomentum(unit) {
  unit.momentum = 0;
}

// How much harder this unit is to hit right now, as a hit-chance penalty.
// Melee is exempt: at one tile, motion does not help you.
export function evasionOf(unit, weapon) {
  if (!weapon || weapon.archetype !== 'ranged') return 0;
  return (unit.momentum || 0) * EVADE_PER;
}

// Bonus damage carried into a swing by the run that set it up.
export function momentumDamage(unit) {
  return Math.floor((unit.momentum || 0) * DAMAGE_PER);
}
