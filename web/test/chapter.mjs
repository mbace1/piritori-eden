// The chapter turn (H7): what crosses a chapter boundary.
//
//   node web/test/chapter.mjs
//
// Owner, 2026-09-29 (answer 22): weapons carry; cash and produce need not,
// and a chapter opens on a standard stake. The rules are data, so this also
// flips them and checks the code follows the data rather than a habit.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, restoreState, attemptChapterEnding } from '../js/v3/state.js?v=7';
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

console.log(`chapter: ${checks} checks passed`);
