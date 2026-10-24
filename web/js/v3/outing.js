// C.19 fights from the campaign (Act I v4.74–v4.75, design/C19_CAMPAIGN_FIGHTS.md).
//
// Owner, 2026-10-24: "You should be looking at C19", then, on v4.74's
// getaway-only reading: "No, fighting 75%, escape 25%. Also police can arrive
// etc." A door that becomes a fight writes an OUTING into the campaign save
// and opens Night Shift (web/crew-run/), which plays it in its 3D place and
// writes the result back. The rules, one per line:
//   - Who fights is Act I's `fighters()`: Aatami while he still fights, then
//     the crew (answer 24; owner 2026-10-24: first phase in every fight, then
//     the shot caller and not a fighter).
//   - Where is the door's anchor, as a C place: courtyard, yard or park exist;
//     a street or quay place falls back to the courtyard until it is built.
//   - Against whom is the door's fight, moved to its place (places.js, v4.71):
//     its people, with their weapons mapped onto C's three.
//   - What it is for is the door's `fight.goal`: `fight` (make them back off,
//     three in four) or `getaway` (get out with it). Winning pays the door's
//     `win`; pulling out, the police, or losing pays its `lose`.
//   - How hot the place already is (`state.pressure`, 0–3) is where the
//     fight's own heat starts, so a hot place brings the police sooner.
//   - The result comes back once: Night Shift marks the outing settled, and
//     Act I pays the door's stakes the first time it sees that, behind a flag.
//
// Pure: no DOM, no clock.

/** The C places that exist in web/crew-run/locations.js. */
export const C_PLACES = new Set(['courtyard', 'yard', 'park', 'street']);

export const cPlace = kit => (C_PLACES.has(kit) ? kit : 'courtyard');

/** Act I's weapons onto C's three (web/fight-module/tactics.js WEAPONS). A
 *  phone has no C counterpart yet (design doc, Gaps); a watcher carries a
 *  knife until C has a spotter rule. */
export function cWeapon(equipment) {
  const w = String(equipment ?? '');
  if (w.includes('handgun')) return 'first-handgun';
  if (w === 'folding-knife' || w === 'feature-phone') return 'folding-knife';
  return 'baseball-bat';
}

/** The outing a door fight becomes. `staged` is the door's battle moved to
 *  its place (places.js `stageFight`); `fighterIds` are who takes the board.
 *  `nonce` makes the id unique across campaigns (the caller passes the clock),
 *  because Night Shift keeps the last outing it played under that id. */
export function doorOuting(state, encounter, staged, fighterIds, { opening = '', nonce = '0', when = null, goal = 'fight' } = {}) {
  const place = staged.place ?? {};
  const anchor = place.anchor ?? staged.location_anchor_id ?? null;
  return {
    id: `outing-${nonce}-${state.scheduleIndex}-${encounter.id}`,
    kind: 'door',
    door: encounter.door,
    encounter: encounter.id,
    scheduleIndex: state.scheduleIndex,
    when,
    battle: staged.id,
    anchor,
    goal: goal === 'getaway' ? 'getaway' : 'fight',
    heat: Math.max(0, Math.min(3, Number(state.pressure?.[anchor] ?? 0) || 0)),
    kit: cPlace(place.kit),
    place: place.name ?? null,
    wayOut: place.way_out ?? null,
    side: place.side ?? null,
    by: place.by ?? null,
    opening,
    fighters: [...fighterIds],
    rivals: staged.opponents.map(o => ({ id: o.id, name: o.name, role: o.role, cell: o.cell ?? null, equipment: cWeapon(o.equipment), tough: Boolean(o.tough) })),
    status: 'open',
    result: null,
  };
}

/** The outing a road fight becomes (§6.4 step 2): the door's record, made
 *  from the road event that turned into a fight. A road fight's job is always
 *  to make them back off, and it does not turn the block. */
export function roadOuting(state, event, staged, fighterIds, opts = {}) {
  return { ...doorOuting(state, { id: event.id, door: null }, staged, fighterIds, { ...opts, goal: 'fight' }), kind: 'road', road: event.id, encounter: null };
}

/** Where Night Shift is, from the Act I page (the same relative path in the
 *  repo's web/ and in the hub cabinet). */
export const outingUrl = outing => `crew-run/?campaign=1&outing=${encodeURIComponent(outing.id)}&arena=${encodeURIComponent(outing.kit)}`;

export const openOuting = state => (state.outing?.status === 'open' ? state.outing : null);
export const settledOuting = state => (state.outing?.status === 'settled' ? state.outing : null);

/** What Act I says when the result comes back. `home`/`missing`/`carried`
 *  are the names Night Shift's receipt wrote onto the outing. */
export function outingLines(outing) {
  const at = outing.place ?? 'the fight';
  const and = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(''));
  const lines = [outing.end === 'police' ? `The police came to ${at}.`
    : outing.end === 'withdraw' ? `You pulled out of ${at}. The job is lost.`
    : outing.result === 'loss' ? `Nobody got out of ${at}.`
    : outing.goal === 'getaway' ? `Everyone got out of ${at}.`
    : outing.routed ? `They ran. ${at} is yours.`
    : `They are down. ${at} is yours.`];
  if (outing.arrested?.length) lines.push(`${and(outing.arrested)} taken by the police. Gone from the crew.`);
  if (outing.missing?.length) lines.push(`${and(outing.missing)} did not make it out. Missing.`);
  if (outing.carried?.length) lines.push(`${and(outing.carried)} went down and ${outing.carried.length > 1 ? 'were' : 'was'} carried out, hurt.`);
  if (outing.wounded?.length) lines.push(`${and(outing.wounded)} hurt.`);
  return lines;
}

export const settledFlag = outing => `memory:outing-settled:${outing.id}`;
