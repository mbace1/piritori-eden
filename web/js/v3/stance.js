/**
 * Stance — a line-for-line port of `FightManager.stance_weight()`
 * (`godot/scripts/fight/fight_manager.gd`), verified against a Godot-dumped
 * fixture the same way `chrome.js` is (`port/stance-vectors.mjs --check`).
 *
 * COMBAT.md §6.2: aggressive / defensive / hold-the-line. A stance is the
 * player's team-wide instruction for AUTO play — it changes what the crew
 * PREFER when the game picks their command for them, never what they can
 * see or do by hand. Godot's own comment on this, kept because it is the
 * actual design intent and not obvious from the numbers alone: "it will not
 * make the triage call — deciding which of your people matters tonight is a
 * judgement about your campaign, not about the board."
 *
 * This file is ONLY the weighting table. `battle.js`'s `scoreCommand()` is
 * the JS-side base scorer it multiplies against — see the note there on why
 * that half is NOT a port of `_score_base()`.
 */

export const STANCE = {
  AGGRESSIVE: 'AGGRESSIVE',
  DEFENSIVE: 'DEFENSIVE',
  HOLD_THE_LINE: 'HOLD_THE_LINE',
};

export const STANCES = [STANCE.AGGRESSIVE, STANCE.DEFENSIVE, STANCE.HOLD_THE_LINE];

// Command.Type values stance_weight() actually branches on. Anything else
// (ITEM, STAND_DOWN, AUTO, MARK — none of which web/'s autoCommand issues)
// falls through to 1.0, matching the GDScript `_:` default exactly.
const WEIGHTS = {
  [STANCE.AGGRESSIVE]: { ATTACK: 1.75, GUARD: 0.45, REPOSITION: 0.70, WITHDRAW: 0.25 },
  [STANCE.DEFENSIVE]: { ATTACK: 0.65, GUARD: 1.85, REPOSITION: 1.15, WITHDRAW: 1.30 },
  [STANCE.HOLD_THE_LINE]: { ATTACK: 1.0, GUARD: 1.35, REPOSITION: 0.35, WITHDRAW: 0.60 },
};

/** @param {string} stance one of STANCE.* @param {string} type ATTACK|GUARD|REPOSITION|WITHDRAW|... */
export function stanceWeight(stance, type) {
  return WEIGHTS[stance]?.[type] ?? 1.0;
}
