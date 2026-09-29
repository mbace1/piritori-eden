// Toko Slomo's counter (v4.61): a bowl buys a price range, per the GDD.
//
//   node web/test/toko.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, restoreState } from '../js/v3/state.js?v=9';
import { board, INFO, markSeen } from '../js/v3/board.js?v=3';
import { buyBowl, bowlBlocker, tokoTip, BOWL_EUR, TOKO_ANCHOR, tokoWeapons, buyFromToko } from '../js/v3/toko.js?v=4';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const map = JSON.parse(await readFile(new URL('../../map/kallio-era1-2003-v1.json', import.meta.url)));
const data = { content, equipment: new Map(content.equipment.map(e => [e.id, e])), anchors: new Map(map.anchors.map(a => [a.id, a])), sites: new Map(map.sites.map(s => [s.id, s])) };
let n = 0; const ok = (c, m) => { assert(c, m); n += 1; };

ok(data.sites.get('toko_slomo_noodles').anchorId === TOKO_ANCHOR && TOKO_ANCHOR === 'vaasankatu', 'Tokon Ramen is on Vaasankatu (answer 16, DESIGN_LOCKS §9.2)');
ok(data.sites.get('toko_slomo_noodles').label === 'Tokon Ramen', 'named Tokon Ramen');
ok(content.schedule.find(s => s.encounter_id === 'enc-toko-quiet-voice').anchor_id === 'vaasankatu', "Toko's night is on Vaasankatu");

const s = createState(content);
ok(bowlBlocker(s) === 'not-here', 'no bowl from Piritori');
s.selectedAnchor = TOKO_ANCHOR; markSeen(s, TOKO_ANCHOR);
ok(bowlBlocker(s) === '', 'open on day one at Vaasankatu');
const before = JSON.stringify(board(s, data).rows.map(r => [r.id, r.shown.level]));
const tip = tokoTip(s, data);
ok(tip && tip.id !== TOKO_ANCHOR && tip.shown.level !== INFO.QUOTE && tip.shown.level !== INFO.RANGE, 'he talks about a place you do not know');
const best = board(s, data).rows.filter(r => !r.here && r.id !== TOKO_ANCHOR && ![INFO.QUOTE, INFO.RANGE].includes(r.shown.level))
  .sort((a, b) => b.truth.sell - a.truth.sell)[0];
ok(tip.id === best.id, 'and it is the best place to sell among those');
ok(JSON.stringify(board(s, data).rows.map(r => [r.id, r.shown.level])) === before, 'asking what he would say changes nothing');
const cash = s.cash;
const r = buyBowl(s, data);
ok(r.ok && r.anchorId === tip.id, 'a bowl buys that tip');
ok(s.cash === cash - BOWL_EUR, `a bowl costs €${BOWL_EUR}`);
const row = board(s, data).rows.find(x => x.id === tip.id);
ok(row.shown.level === INFO.RANGE && row.heard && !row.visited, 'the board shows a RANGE, heard from Toko, not a visit');
ok(row.shown.lowSell <= row.truth.sell && row.truth.sell <= row.shown.highSell, 'the band contains the true price');
ok(s.seen?.[tip.id] === undefined, 'hearing is not seeing: the place is not marked visited');
ok(buyBowl(s, data).reason === 'already-this-block', 'one bowl a block');
const saved = restoreState(JSON.parse(JSON.stringify(s)), content);
ok(board(saved, data).rows.find(x => x.id === tip.id).shown.level === INFO.RANGE, 'what he said survives a reload');
// Next block: a second bowl names a different place.
saved.scheduleIndex += 1;
const r2 = buyBowl(saved, data);
ok(r2.ok && r2.anchorId && r2.anchorId !== tip.id, 'the next block, he talks about somewhere else');
// Ageing: a range heard 5+ blocks ago is a rumour, and gone after 12 (never visited).
saved.scheduleIndex += 5;
ok(board(saved, data).rows.find(x => x.id === tip.id).shown.level === INFO.RUMOUR, 'what he said ages to a rumour');
saved.scheduleIndex += 10;
ok(board(saved, data).rows.find(x => x.id === tip.id).shown.level === INFO.NONE, 'and then to nothing, as the place was never visited');
// Cash
const poor = createState(content); poor.selectedAnchor = TOKO_ANCHOR; poor.cash = 5;
ok(bowlBlocker(poor) === 'cash' && buyBowl(poor, data).ok === false && poor.cash === 5, 'no money, no bowl, nothing spent');
// Early weapons (owner: "Slo-mo can sell early weapons as well").
const w = tokoWeapons(data);
ok(w.length >= 3 && w.every(id => data.equipment.get(id).kind === 'weapon'), `Toko sells early weapons (${w.join(', ')})`);
ok(!w.some(id => /firearm/.test(data.equipment.get(id).hold)), 'never a gun: the first handgun is the street seller\'s');
const buyer = createState(content);
ok(buyFromToko(buyer, data, w[0]).reason === 'not-here', 'not from Piritori');
buyer.selectedAnchor = TOKO_ANCHOR; const c0 = buyer.cash; const e0 = buyer.equipment.length;
const got = buyFromToko(buyer, data, w[0]);
ok(got.ok && buyer.cash === c0 - got.paid && buyer.equipment.length === e0 + 1, 'at Vaasankatu, a weapon costs its price and is carried');
ok(buyFromToko(buyer, data, 'first-handgun').reason === 'not-sold-here', 'he will not sell the handgun');
buyer.cash = 1; ok(buyFromToko(buyer, data, w[0]).reason === 'cash', 'no money, no weapon');
console.log(`toko: ${n} checks passed`);
