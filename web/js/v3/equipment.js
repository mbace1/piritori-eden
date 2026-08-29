/**
 * THE WEAPON TABLE — ported from `godot/scripts/fight/equipment_rules.gd`.
 *
 * COMBAT.md §13.5: "Weapons use a few readable target patterns rather than
 * measured distance... Weapon choice therefore changes formation and
 * target access, not only damage." So `reachPattern` decides WHERE a unit
 * can stand and WHAT it can see, not just how hard it hits — and it is the
 * ONLY thing that decides that. `battle.js`'s previous reach test special-
 * cased `role === 'watcher' || role === 'fixer'` (lane-only, any row) and
 * `equipment === 'first-handgun'` (lane-locked) directly in code; neither
 * exception exists in Godot, and both turn out to be redundant once reach
 * actually comes from the equipped item's `reach_pattern` — a firearm's
 * `clear-same-lane-through-front` already reaches from every row, laned
 * to zero spread, which is exactly what the old first-handgun special case
 * hand-coded badly (it also let a firearm through cover-worthy checks the
 * general path applies correctly).
 */

export const ROW_FRONT = 0;
export const ROW_MIDDLE = 1;
export const ROW_BACK = 2;

/** EquipmentRules.reach() */
const REACH_PATTERNS = {
  'front-same-lane': { allowedRows: [ROW_FRONT], laneSpread: 0, piercing: false },
  'front-same-or-adjacent-lane': { allowedRows: [ROW_FRONT], laneSpread: 1, piercing: false },
  'clear-same-lane-through-front': { allowedRows: [ROW_FRONT, ROW_MIDDLE, ROW_BACK], laneSpread: 0, piercing: false },
  'front-same-lane-through': { allowedRows: [ROW_FRONT], laneSpread: 0, piercing: true },
  'front-wide-short': { allowedRows: [ROW_FRONT], laneSpread: 2, piercing: false },
};
function reachFor(pattern) {
  return REACH_PATTERNS[pattern] ?? { allowedRows: [ROW_FRONT], laneSpread: 0, piercing: false };
}

/** EquipmentRules.HOLD_TUNING — port tuning by `hold`, the slice's own grip
 *  vocabulary. GAME_DESIGN_DOCUMENT §13.8 marks combat values a "PROPOSED
 *  minimal set"; this table is the port's, kept in one visible place. */
const HOLD_TUNING = {
  'blunt-one': { harmMin: 1, harmMax: 2, nerveMin: 1, nerveMax: 2 },
  'bat-two': { harmMin: 2, harmMax: 3, nerveMin: 1, nerveMax: 2 },
  'firearm-one': { harmMin: 2, harmMax: 4, nerveMin: 2, nerveMax: 3 },
  'utility-one': { harmMin: 0, harmMax: 0, nerveMin: 0, nerveMax: 1 },
  // A blade does little damage on this scale and a great deal of nerve —
  // "close, quiet and lethal" is carried by the lethal flag, not a bigger
  // number.
  'blade-one': { harmMin: 1, harmMax: 2, nerveMin: 2, nerveMax: 4 },
  'chain-two': { harmMin: 1, harmMax: 3, nerveMin: 1, nerveMax: 2 },
  'firearm-two': { harmMin: 2, harmMax: 5, nerveMin: 2, nerveMax: 4 },
};

/** EquipmentRules.LETHAL_HOLDS — a folding knife does very little harm and
 *  is here; a signal flare does none and is not. */
export const LETHAL_HOLDS = ['firearm-one', 'firearm-two', 'blade-one'];

/** EquipmentRules.UNARMED — not in the slice's equipment list, because it
 *  is not equipment. */
export const UNARMED = {
  name: 'Unarmed',
  kind: 'weapon',
  harmMin: 1,
  harmMax: 1,
  nerveMin: 0,
  nerveMax: 1,
  guardAmount: 2,
  allowedRows: [ROW_FRONT],
  laneSpread: 0,
  piercing: false,
  tags: ['unarmed'],
  lethal: false,
  unlock: 'start',
  reachPattern: 'front-same-lane',
};

function titleCase(id) {
  return id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

/** EquipmentRules.weapons() — every item `content.equipment` defines, in
 *  the manager's shape, keyed by canonical id. Takes the equipment array
 *  directly (not a Map) so both `battle.js` (via `[...data.equipment
 *  .values()]`) and a bare-node test fixture can call it the same way. */
export function weaponsFrom(equipmentList) {
  const out = { unarmed: { ...UNARMED } };
  for (const e of equipmentList ?? []) {
    const id = e.id;
    if (!id) continue;
    const hold = e.hold ?? '';
    const tune = HOLD_TUNING[hold] ?? HOLD_TUNING['blunt-one'];
    const r = reachFor(e.reach_pattern ?? '');
    const isWeapon = e.kind === 'weapon';
    out[id] = {
      name: titleCase(id),
      kind: e.kind ?? 'support',
      harmMin: isWeapon ? tune.harmMin : 0,
      harmMax: isWeapon ? tune.harmMax : 0,
      nerveMin: tune.nerveMin,
      nerveMax: tune.nerveMax,
      guardAmount: isWeapon ? 3 : 2,
      allowedRows: r.allowedRows,
      laneSpread: r.laneSpread,
      piercing: r.piercing,
      tags: [hold],
      // Lethal exposure is a property of the HOLD, not of a damage number —
      // a folding knife does less harm than a bat and is the more
      // dangerous thing to carry.
      lethal: LETHAL_HOLDS.includes(hold),
      unlock: e.unlock ?? '',
      reachPattern: e.reach_pattern ?? '',
    };
  }
  return out;
}

/**
 * EquipmentRules.items() — the SUPPORT half of the equipment list, in the
 * shape `battle.js`'s `useItem()` reads. Every `kind: 'support'` item gets
 * the same generic `{effectType:'signal', magnitude:1, target:'ally',
 * singleUse:false}` — Godot's own table has no per-item tuning here either,
 * and its own `_resolve_item()` has no `'signal'` branch in its effect
 * match, so using the one item the slice actually registers (feature-phone)
 * is a real, legal command that does nothing observable yet on either
 * build. Ported as-is rather than inventing a working effect Godot itself
 * does not have — see `useItem()`'s own note.
 */
export function itemsFrom(equipmentList) {
  const out = {};
  for (const e of equipmentList ?? []) {
    if (e.kind !== 'support') continue;
    out[e.id] = { effectType: 'signal', magnitude: 1, target: 'ally', singleUse: false };
  }
  return out;
}
