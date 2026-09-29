// Toko Slomo's counter — Tokon Ramen, Vaasankatu (Act I v4.61).
//
// GDD §14.3: Toko "offers insider fragments, introductions and uncertain
// sabotage wagers"; he is "a contact, not a faction army". GDD §7.4 (locked
// progression): "Toko Slomo unlocks price ranges and information purchases."
// Owner, 2026-09-27: Tokon Ramen is on Vaasankatu (answer 16) and Toko can be
// the first shop (the same day's message), so the counter opens on day one.
//
// A BOWL is the purchase: it buys what he heard, which is a RANGE (never a
// quote) for the best place to sell that you have no range or quote for right
// now. One bowl a block — he has other customers.
//
// EARLY WEAPONS (owner, 2026-09-27: "Slo-mo can sell early weapons as well"):
// the purchasable melee gear, at the street price. The first handgun stays
// with the Piritori street seller and its day-5 scene (GDD §10.2's weapon
// gate); so do the fence and the rest of the gear.
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { board, INFO } from './board.js?v=3';
import { addEquipment, buyOf, isPurchasable, CONDITION } from './state.js?v=9';

export const BOWL_EUR = 6;
export const TOKO_ANCHOR = 'vaasankatu';

/** Why a bowl cannot be bought right now, or ''. */
export function bowlBlocker(state) {
  if (state.selectedAnchor !== TOKO_ANCHOR) return 'not-here';
  if (state.tokoBowlAt === state.scheduleIndex) return 'already-this-block';
  if ((state.cash ?? 0) < BOWL_EUR) return 'cash';
  return '';
}

/** The place Toko would talk about: the best sell price you do not know. */
export function tokoTip(state, data) {
  const { rows } = board(state, data);
  const unknown = rows.filter(r => !r.here && r.id !== TOKO_ANCHOR
    && ![INFO.QUOTE, INFO.RANGE].includes(r.shown.level));
  if (!unknown.length) return null;
  unknown.sort((a, b) => b.truth.sell - a.truth.sell || a.id.localeCompare(b.id));
  return unknown[0];
}

/** Buy a bowl and hear one range. Returns { ok, anchorId, reason }. */
export function buyBowl(state, data) {
  const reason = bowlBlocker(state);
  if (reason) return { ok: false, reason };
  const tip = tokoTip(state, data);
  state.cash = Math.round((state.cash - BOWL_EUR) * 100) / 100;
  state.tokoBowlAt = state.scheduleIndex;
  if (!tip) return { ok: true, anchorId: null };
  state.heard = state.heard ?? {};
  state.heard[tip.id] = state.scheduleIndex;
  return { ok: true, anchorId: tip.id };
}

/** The early weapons under Toko's counter: purchasable, a weapon, not a gun. */
export function tokoWeapons(data) {
  return [...data.equipment.values()]
    .filter(e => e.kind === 'weapon' && !/firearm/.test(e.hold ?? '') && isPurchasable(data, e.id) && buyOf(data, e.id) > 0)
    .map(e => e.id);
}

/** Buy one early weapon from Toko. Returns { ok, paid, reason }. */
export function buyFromToko(state, data, equipmentId) {
  if (state.selectedAnchor !== TOKO_ANCHOR) return { ok: false, paid: 0, reason: 'not-here' };
  if (!tokoWeapons(data).includes(equipmentId)) return { ok: false, paid: 0, reason: 'not-sold-here' };
  const price = buyOf(data, equipmentId);
  if ((state.cash ?? 0) < price) return { ok: false, paid: 0, reason: 'cash' };
  state.cash -= price;
  addEquipment(state, equipmentId, CONDITION.NEW);
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`Bought a ${equipmentId.replaceAll('-', ' ')} from Toko for €${price}.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, paid: price };
}
