// Fight places (Act I v4.71): a fight happens where it starts.
//
//   node web/test/places.mjs
//
// Holds content/places-v1.json to its own rules and the staging in places.js:
// every active anchor has a place, every door and road fight is fought at
// one, and only the place and the people move — never the fight's shape.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { placeAt, stageFight, roadFightAnchor, doorFightStage, roadFightStage } from '../js/v3/places.js?v=1';
import { doorEncounter, templateOf } from '../js/v3/doors.js?v=4';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const places = await read('../../content/places-v1.json');
const doors = await read('../../content/doors-v1.json');
const roadEvents = await read('../../content/road-events-v1.json');
const map = await read('../../map/kallio-era1-2003-v1.json');
const art = await read('../../art/v3/manifest.json');
const scenes = new Map(art.assets.filter(a => a.kind === 'scene').map(a => [a.id, a]));
const battles = new Map(content.battles.map(b => [b.id, b]));
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };

// ── canon ────────────────────────────────────────────────────────────
const active = map.anchors.filter(a => a.sliceState === 'active').map(a => a.id);
const rules = places.rules;
const sides = Object.keys(rules.sides);
ok(places.places.length === new Set(places.places.map(p => p.anchor)).size, 'one place per anchor');
for (const anchor of active) ok(placeAt(places, anchor), `${anchor}: an active anchor has a fight place`);
for (const p of places.places) {
  ok(active.includes(p.anchor), `${p.anchor}: a place is somewhere Aatami can go`);
  ok(p.name && p.way_out, `${p.anchor}: named, with a way out`);
  if (p.plate) {
    ok(scenes.get(p.plate)?.layer === 'location-stage', `${p.anchor}: plate ${p.plate} is a registered location stage`);
    // STAGE_SPEC 5.2: these are not battle floors.
    ok(!['scene-karhupuisto-v01', 'scene-sornainen-docks-v02'].includes(p.plate), `${p.anchor}: plate holds the board`);
  } else {
    ok(p.plate === null && p.plate_wanted, `${p.anchor}: a bare stage names the plate it wants`);
  }
  if (p.stand_in) ok(p.plate && p.plate_wanted, `${p.anchor}: a stand-in plate names the plate it stands in for`);
  ok(rules.kits.includes(p.kit) || p.kit in rules.kits_wanted, `${p.anchor}: kit ${p.kit} exists or is wanted`);
  ok(p.cover.length >= 2, `${p.anchor}: at least two cover markers`);
  const cells = p.cover.flatMap(c => c.cells);
  ok(cells.every(c => /^(front|middle|back)-[1-3]$/.test(c)), `${p.anchor}: cover is on the board's cells`);
  ok(new Set(cells).size === cells.length, `${p.anchor}: one marker to a cell`);
}
ok(Object.values(rules.intents).every(Boolean) && ['muscle', 'runner', 'watcher', 'fixer'].every(r => rules.intents[r]), 'every shape role has an intent');

// ── every door and road fight is fought somewhere, by someone ────────────────
for (const t of doors.templates.filter(t => t.fight)) {
  ok(sides.includes(t.fight.by), `${t.id}: names who fights (${t.fight.by})`);
  ok(t.anchors.every(a => placeAt(places, a)), `${t.id}: every anchor has a fight place`);
}
const fightEvents = roadEvents.events.filter(e => e.choices.some(c => c.effects.some(fx => fx.startsWith('start-battle:'))));
ok(fightEvents.length >= 4, 'the road fights are all here');
for (const e of fightEvents) ok(sides.includes(e.by), `${e.id}: names who fights (${e.by})`);
// The copy follows the place: nothing at the Hakaniemi market is fought "at the bear".
const fish = templateOf(doors, 'pickup-fish-stall');
ok(!/bear|park/i.test(fish.stakes + fish.choices.map(c => c.forecast).join(' ')), 'the fish stall is not fought at the bear');
ok(!/Torkkelinmäki/.test(templateOf(doors, 'pickup-yard-van').stakes), 'the yard van is not fought in Torkkelinmäki');
ok(!/boiler hall/.test(templateOf(doors, 'sale-quay-shift').stakes), 'the quay shift is not fought at the boiler hall');

// ── staging moves the place and the people, never the shape ──────────────
const shape = battles.get('battle-karhupuisto-2v2');
const frozen = JSON.stringify(shape);
const staged = stageFight(shape, { anchor: 'hakaniemi', by: 'jade_lantern_network', key: 'door-14-pickup-fish-stall' }, places);
ok(JSON.stringify(shape) === frozen, 'staging never edits the authored battle');
ok(staged.location_anchor_id === 'hakaniemi' && staged.scene_asset_id === 'scene-hakaniemi-square-v01', 'fought at Hakaniemi, on its plate');
ok(JSON.stringify(staged.cover) === JSON.stringify(placeAt(places, 'hakaniemi').cover), "the place's cover, not the bear's");
for (const k of ['id', 'format', 'player_deployed', 'grid', 'negotiation', 'casualty_table'])
  ok(JSON.stringify(staged[k]) === JSON.stringify(shape[k]), `shape kept: ${k}`);
ok(staged.opponents.length === shape.opponents.length, 'same number of people');
staged.opponents.forEach((o, i) => {
  const s = shape.opponents[i];
  ok(o.role === s.role && o.cell === s.cell && o.equipment === s.equipment && o.tough === s.tough, `opponent ${i + 1} keeps role, cell, weapon`);
  ok(o.name !== s.name && o.id !== s.id && o.side === 'jade_lantern_network', `opponent ${i + 1} is somebody new, from the Jade Lantern`);
  ok(o.intent === rules.intents[o.role], `opponent ${i + 1} intent reads the role`);
});
ok(new Set(staged.opponents.map(o => o.name.split(' ')[0])).size === staged.opponents.length, 'two different first names');
// A board shows first names: a rival never shares one with your own crew.
const crewNames = staged.opponents.map(o => `${o.name.split(' ')[0]} Crew`);
const avoided = stageFight(shape, { anchor: 'hakaniemi', by: 'jade_lantern_network', key: 'door-14-pickup-fish-stall' }, places, crewNames);
ok(avoided.opponents.every(o => !crewNames.some(n => n.split(' ')[0] === o.name.split(' ')[0])), 'no rival shares a first name with the crew');
ok(JSON.stringify(stageFight(shape, { anchor: 'hakaniemi', by: 'jade_lantern_network', key: 'door-14-pickup-fish-stall' }, places, crewNames)) === JSON.stringify(avoided), 'and that is deterministic too');
for (let k = 0; k < 200; k += 1) {
  const s3 = stageFight(battles.get('battle-courtyard-3v3'), { anchor: 'linjat_yard', by: 'mccormick_family', key: `k${k}` }, places, ['Aatami', 'Lan Vu', 'Reijo Virtanen']);
  const firsts = s3.opponents.map(o => o.name.split(' ')[0]);
  assert(new Set(firsts).size === 3 && !firsts.some(f => ['Aatami', 'Lan', 'Reijo'].includes(f)), `k${k}: ${firsts}`);
}
ok(true, '200 boards, never a first name twice');
ok(staged.objective.startsWith('Behind the market hall.') && staged.objective.includes("the Jade Lantern's people") && staged.objective.includes('on a tram from the stop'), 'the objective says where, who and the way out');
ok(staged.withdrawal.known_cost === rules.withdrawal_cost && staged.withdrawal.available_from_round === shape.withdrawal.available_from_round, 'withdrawal cost is the door\'s, not the handover\'s');
ok(staged.place.anchor === 'hakaniemi' && staged.place.kit === 'street' && !staged.place.bare, 'the place rides on the fight');
const again = stageFight(shape, { anchor: 'hakaniemi', by: 'jade_lantern_network', key: 'door-14-pickup-fish-stall' }, places);
ok(JSON.stringify(again) === JSON.stringify(staged), 'deterministic: a reload is the same faces');
const next = stageFight(shape, { anchor: 'hakaniemi', by: 'jade_lantern_network', key: 'road-retaliation-jade-16' }, places);
ok(next.opponents.every((o, i) => o.id !== staged.opponents[i].id), 'another fight is other people');

const bare = stageFight(battles.get('battle-courtyard-3v3'), { anchor: 'makelansilta', by: 'mccormick_family', key: 'k' }, places);
ok(bare.scene_asset_id === null && bare.place.bare, 'Mäkelänsilta is a bare stage until its plate exists');
ok(stageFight(shape, { anchor: 'nowhere', by: 'mccormick_family', key: 'k' }, places) === shape, 'no place: the authored fight, untouched');
ok(stageFight(shape, { anchor: 'hakaniemi', by: 'mccormick_family', key: 'k' }, null) === shape, 'no places loaded: the authored fight');

// ── where: the door, or the road ─────────────────────────────────────────────
for (const t of doors.templates.filter(t => t.fight)) {
  const encounter = doorEncounter(doors, 14, t.id, t.anchors[0]);
  const stage = doorFightStage(encounter, t);
  ok(stage.anchor === t.anchors[0] && stage.by === t.fight.by && stage.key === encounter.id, `${t.id}: fought at its own door`);
  const def = stageFight(battles.get(t.fight.battle), stage, places);
  ok(def.location_anchor_id === t.anchors[0], `${t.id}: staged at ${t.anchors[0]}`);
}
ok(doorFightStage({ id: 'enc-1' }, null) === null, 'an encounter that is not a door is not restaged');
ok(roadFightAnchor({ phase: 'arrival', from: 'piritori', to: 'hakaniemi' }) === 'hakaniemi', 'arriving: the place arrived at');
ok(roadFightAnchor({ phase: 'transit', from: 'piritori', to: 'hakaniemi' }) === 'piritori', 'in transit: the place just left');
ok(roadFightAnchor({ phase: 'transit', from: null, to: 'hakaniemi' }) === 'hakaniemi', 'a forced event with no origin: where it was forced');
ok(roadFightAnchor(null) === null, 'no event, no place');
ok(roadFightAnchor({ phase: 'transit', from: 'kurvi', to: 'hakaniemi' }, places) === 'hakaniemi', 'in transit from somewhere with no fight place: the place ahead');
ok(roadFightAnchor({ phase: 'arrival', from: 'piritori', to: 'nowhere' }, places) === 'piritori', 'arriving somewhere with no fight place: the place behind');
const retaliation = roadEvents.events.find(e => e.id === 'road-retaliation-mccormick');
const r1 = roadFightStage({ phase: 'arrival', from: 'linjat_yard', to: 'vaasankatu' }, retaliation, 15);
ok(r1.anchor === 'vaasankatu' && r1.by === 'mccormick_family' && r1.key === 'road-retaliation-mccormick-15', 'a retaliation is fought where Aatami arrived');
ok(roadFightStage({ phase: 'arrival', to: 'vaasankatu' }, retaliation, 17).key !== r1.key, 'the next retaliation is new people');
ok(/Two of them/.test(retaliation.text) && battles.get('battle-karhupuisto-2v2').opponents.length === 2, 'the McCormicks send as many as the board shows');

// Mission battles keep their authored arenas.
ok(battles.get('battle-courtyard-3v3').location_anchor_id === 'torkkelinmaki' && battles.get('battle-courtyard-3v3').scene_asset_id === 'scene-courtyard-prototype-v05', 'the courtyard mission is where it was');

console.log(`places: ${checks} checks passed`);
