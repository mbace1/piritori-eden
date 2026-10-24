// Fight places (Act I v4.71): a fight happens where it starts.
//
// Until v4.71 every door and road fight borrowed one of three mission arenas
// and its named people, so a skimmed crate at the Hakaniemi market was fought
// "at the bear" against the Karhupuisto pair. The rules, one per line:
//   - `content/places-v1.json` is the only place a fight place lives: one per
//     active anchor — the plate it is fought on (or none: a bare stage that
//     names the plate it wants), the cover markers, the way out, and the 3D
//     kit Night Shift would stage there (CAMPAIGN.md P4).
//   - A door fight is fought at the door's anchor. A road fight is fought
//     where the event happens: arriving, the place arrived at; in transit,
//     the place just left.
//   - The door or the event names WHO (`by`). The people are generated
//     (COMBAT.md §7.1), from the fight's own key, so a reload is the same
//     faces and the next retaliation is somebody new. A board only shows
//     first names, so nobody on it shares one: not two rivals, and not a
//     rival and one of your own (`avoid`).
//   - The SHAPE stays the battle the door names: format, roles, weapons,
//     negotiation, casualties. Only the place and the people move.
//   - Mission battles are authored where they are and are never restaged.
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { nameFrom } from '../../../people/roster.mjs?v=1';

const PLACES_URL = '../../../content/places-v1.json';

export async function loadPlaces() {
  const response = await fetch(new URL(PLACES_URL, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${PLACES_URL} (${response.status})`);
  return response.json();
}

export function placeAt(places, anchor) {
  return places?.places?.find(p => p.anchor === anchor) ?? null;
}

/** Where a road fight happens, from the resolved event (`state.road.last`):
 *  arriving, the place arrived at; in transit, the place just left. With
 *  `places`, the first of the two that has a fight place. */
export function roadFightAnchor(last, places = null) {
  if (!last) return null;
  const order = (last.phase === 'transit' ? [last.from, last.to] : [last.to, last.from]).filter(Boolean);
  return (places ? order.find(anchor => placeAt(places, anchor)) : null) ?? order[0] ?? null;
}

/** A door encounter's fight: at the door, by the side its template names. */
export function doorFightStage(encounter, template) {
  if (!encounter?.door) return null;
  return { anchor: encounter.anchor_override_id ?? null, by: template?.fight?.by ?? null, key: encounter.id };
}

/** A road event's fight: where it happened. The key carries the block, so a
 *  repeatable event (a family's retaliation) is new people every time. */
export function roadFightStage(last, event, scheduleIndex, places = null) {
  if (!event) return null;
  return { anchor: roadFightAnchor(last, places), by: event.by ?? null, key: `${event.id}-${scheduleIndex}` };
}

const firstName = name => String(name ?? '').split(' ')[0];

/** Generated people for a fight: deterministic from the key, and no first
 *  name twice on one board. */
function rivals(count, by, key, avoid) {
  const taken = new Set([...avoid].map(firstName));
  const names = [];
  for (let i = 1; i <= count; i += 1) {
    let name = nameFrom(`${by ?? 'street'}:${key}:${i}`);
    for (let roll = 1; taken.has(firstName(name)) && roll < 12; roll += 1) name = nameFrom(`${by ?? 'street'}:${key}:${i}:${roll}`);
    taken.add(firstName(name));
    names.push(name);
  }
  return names;
}

/**
 * The battle `definition`, moved to `anchor` and fought by `by`'s people.
 * Returns the definition unchanged when there is no place for the anchor,
 * so a fight is never lost for want of a stage. `avoid` is the names already
 * on the board (your crew).
 */
export function stageFight(definition, { anchor, by, key }, places, avoid = []) {
  const place = placeAt(places, anchor);
  if (!definition || !place) return definition;
  const rules = places.rules ?? {};
  const side = rules.sides?.[by] ?? 'them';
  const names = rivals(definition.opponents.length, by, key, avoid);
  return {
    ...definition,
    location_anchor_id: anchor,
    scene_asset_id: place.plate ?? null,
    place: {
      anchor,
      name: place.name,
      way_out: place.way_out,
      kit: place.kit,
      by: by ?? null,
      side,
      bare: !place.plate,
      stand_in: Boolean(place.stand_in),
    },
    cover: place.cover.map(c => ({ ...c, cells: [...c.cells] })),
    opponents: definition.opponents.map((o, i) => ({
      ...o,
      id: `opp-${key}-${i + 1}`,
      name: names[i],
      intent: rules.intents?.[o.role] ?? o.intent,
      side: by ?? null,
    })),
    objective: `${place.name}. Make ${side} back off, or leave ${place.way_out}.`,
    withdrawal: { ...definition.withdrawal, known_cost: rules.withdrawal_cost ?? definition.withdrawal?.known_cost },
  };
}
