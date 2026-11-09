// The chapter turn (H7): what crosses a chapter boundary.
//
//   node web/test/chapter.mjs
//
// Owner, 2026-09-29 (answer 22): weapons carry; cash and produce need not,
// and a chapter opens on a standard stake. The rules are data, so this also
// flips them and checks the code follows the data rather than a habit.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, restoreState, attemptChapterEnding, shipmentOdds, shipmentRoutes } from '../js/v3/state.js?v=17';
import { turnPlan, turnChapter, nextChapter } from '../js/v3/chapter.js?v=1';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const data = {
  content,
  crew: new Map(content.crew.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
};
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };

// Canon: every rule is one of three words, and the owner's answer is what it says.
const r = content.chapter_turn.rules;
for (const [k, v] of Object.entries(r)) ok(['carry', 'reset', 'stake'].includes(v), `${k}: ${v} is a rule`);
ok(r.cash === 'stake' && content.chapter_turn.opening_cash_eur > 0, 'cash opens on a standard stake');
ok(r.stock === 'reset', 'produce does not carry');
ok(r.gear === 'carry', 'weapons carry');
ok(r.crew === 'carry' && r.upgrades === 'carry', 'what you built carries');
ok(r.mission_unlocks === 'reset', 'access is re-earned');

// A chapter that has been played: money made, stock held, a weapon bought.
function played() {
  const s = createState(content);
  s.cash = 900; s.stock.piri = 3; s.chapterEarned = 450; s.debt = 275; s.markka = 300;
  s.equipment.push({ id: 'knife', cond: 0 });
  s.recruited = [content.crew[0].id];
  s.revealedMissions = ['mission-paper-bag'];
  s.selectedAnchor = content.chapters[0].ending.anchor_id;
  return s;
}

{
  const s = played();
  ok(turnChapter(s, content).reason === 'chapter-not-cleared', 'no turn before the ending');
  ok(s.chapter === 1 && s.cash === 900, 'a refused turn changes nothing');
  const plan = turnPlan(s, content);
  const row = k => plan.find(p => p.key === k);
  ok(row('cash').now === 900 && row('cash').next === content.chapter_turn.opening_cash_eur, 'the plan shows cash going to the stake');
  ok(row('stock').next === 0 && row('gear').next === row('gear').now, 'the plan shows stock gone and gear kept');
  ok(JSON.stringify(s.stock) === '{"piri":3}', 'the plan reads, it never writes');
}

{
  const s = played();
  ok(attemptChapterEnding(s, data) === '', 'the shipment runs');
  const gear = s.equipment.length, crew = [...s.recruited], debt = s.debt, upgrades = [...s.upgrades];
  const res = turnChapter(s, content);
  ok(res.ok, 'the chapter turns');
  ok(s.chapter === 2 && !s.chapterCleared, 'chapter 2 opens');
  ok(s.cash === content.chapter_turn.opening_cash_eur, `cash is the stake (€${s.cash})`);
  ok(Object.values(s.stock).every(v => v === 0), 'stock is gone');
  ok(s.equipment.length === gear, 'weapons carry');
  ok(JSON.stringify(s.recruited) === JSON.stringify(crew), 'crew carry');
  ok(JSON.stringify(s.upgrades) === JSON.stringify(upgrades), 'built upgrades carry');
  ok(s.debt === debt && s.markka === 300, 'debt and markka carry');
  ok(s.chapterEarned === 0 && s.chapterLootTaken === 0 && s.chapterFightsWon === 0, 'the threshold counts this chapter only');
  ok(s.revealedMissions.length === 0, 'mission unlocks are re-earned');
  ok(s.flags.includes('memory:chapter-turned:1'), 'the city remembers the turn');
  ok(res.authored === Boolean(nextChapter({ chapter: 1 }, content)), 'says whether chapter 2 is authored yet');
  ok(turnChapter(s, content).reason === 'chapter-not-cleared', 'one turn per ending');
  const saved = restoreState(JSON.parse(JSON.stringify(s)), content);
  ok(saved.chapter === 2 && saved.cash === s.cash && saved.equipment.length === gear, 'the turn survives a reload');
}

// The rules are data: flip them and the turn follows.
{
  const flipped = structuredClone(content);
  flipped.chapter_turn.rules.cash = 'carry';
  flipped.chapter_turn.rules.gear = 'reset';
  flipped.chapter_turn.rules.stock = 'carry';
  const s = played();
  attemptChapterEnding(s, data);
  const cash = s.cash;
  turnChapter(s, flipped);
  ok(s.cash === cash, 'cash:carry keeps the cash');
  ok(s.equipment.length === 0, 'gear:reset empties the stash');
  ok(s.stock.piri === 3, 'stock:carry keeps the stock');
}

// The shipment night (owner, 2026-11-09: "a choice, odds shown"): who goes and
// which route, with the odds before the stake; the routes are day 9's promises.
{
  const s = played();
  s.recruited = content.crew.slice(0, 3).map(c => c.id);
  const all = { crew: [...s.recruited], route: 'quay-road' };
  const odds = shipmentOdds(s, data, all);
  ok(odds.clean + odds.messy + odds.lost === 100, `the odds add to 100 (${odds.clean}/${odds.messy}/${odds.lost})`);
  ok(shipmentOdds(s, data, { crew: s.recruited.slice(0, 1), route: 'quay-road' }).lost > odds.lost, 'fewer hands, likelier lost');
  const van = () => shipmentRoutes(s, data).find(r => r.id === 'mccormick-van');
  ok(van() && !van().open, "the McCormicks' van needs day 9's promise");
  s.flags.push('mccormick-escort');
  ok(van().open, 'standing with them opens it');
  const byVan = shipmentOdds(s, data, { crew: [...s.recruited], route: 'mccormick-van' });
  ok(byVan.clean > odds.clean, `their van is safer (${byVan.clean}% clean against ${odds.clean}%)`);
  s.flags.push('stalled-the-families');
  ok(shipmentOdds(s, data, { crew: [...s.recruited], route: 'mccormick-van' }).clean < byVan.clean, 'telling the families to wait makes it riskier');
  const before = JSON.stringify(s);
  ok(attemptChapterEnding(s, data, { crew: ['nobody'], route: 'quay-road' }) === 'crew-not-able', 'only able crew can go');
  ok(attemptChapterEnding(s, data, { crew: [], route: 'jade-warehouse' }) === 'route-closed', 'a route day 9 did not open stays closed');
  ok(JSON.stringify(s) === before, 'a refused plan changes nothing');
  const owed = s.obligations?.mccormick_family ?? 0;
  ok(attemptChapterEnding(s, data, { crew: [...s.recruited], route: 'mccormick-van' }) === '', 'the planned shipment runs');
  ok(['clean', 'messy', 'lost'].includes(s.lastEndingOutcome) && s.lastShipment.outcome === s.lastEndingOutcome, `it resolves (${s.lastEndingOutcome})`);
  ok(s.flags.includes('memory:shipment-route:mccormick-van'), 'chapter 2 can read the route taken');
  ok((s.obligations?.mccormick_family ?? 0) === owed + 1, 'and you owe the McCormicks for the van');
}
// One roll per playthrough: the same week gives the same night; it does not depend on the plan's crew.
{
  const a = played(), b = played();
  a.recruited = b.recruited = content.crew.slice(0, 3).map(c => c.id);
  a.choices['enc-first-purchase'] = b.choices['enc-first-purchase'] = 'buy';
  attemptChapterEnding(a, data); attemptChapterEnding(b, data);
  ok(a.lastEndingOutcome === b.lastEndingOutcome, 'the same week, the same night');
}

console.log(`chapter: ${checks} checks passed`);
