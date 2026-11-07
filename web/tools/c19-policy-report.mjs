#!/usr/bin/env node
// Analyze existing C.19 Act I bot evidence without changing combat rules.
// Usage: node web/tools/fight-balance.mjs > /tmp/c19.json
//        node web/tools/c19-policy-report.mjs /tmp/c19.json
// Optional: node web/tools/c19-policy-report.mjs /tmp/before.json /tmp/after.json
import fs from 'node:fs';

const read = path => {
  const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!Array.isArray(rows) || !rows.length) throw Error('Expected nonempty fight-balance JSON rows');
  const keys = new Set();
  for (const row of rows) {
    for (const key of ['fight', 'goal', 'heat', 'policy', 'win', 'rounds', 'hpLost', 'stuck']) {
      if (row[key] === undefined) throw Error('Missing ' + key + ' in ' + JSON.stringify(row));
    }
    const id = [row.fight, row.heat, row.policy].join('|');
    if (keys.has(id)) throw Error('Duplicate row ' + id);
    keys.add(id);
  }
  return rows;
};
const num = v => Number(v);
function report(rows) {
  const map = new Map(rows.map(r => [[r.fight, r.heat, r.policy].join('|'), r]));
  const fights = [...new Set(rows.map(r => r.fight))].sort();
  const heats = [...new Set(rows.map(r => r.heat))].sort((a,b)=>a-b);
  const comparisons = [];
  const missing = [];
  for (const fight of fights) for (const heat of heats) {
    const base = map.get([fight, heat, 'fight'].join('|'));
    const careful = map.get([fight, heat, 'careful'].join('|'));
    if (!base || !careful) { missing.push(fight + ' heat=' + heat); continue; }
    comparisons.push({
      fight, heat, goal: careful.goal,
      carefulMinusFightWin: num(careful.win) - num(base.win),
      carefulMinusFightHpLost: +(num(careful.hpLost) - num(base.hpLost)).toFixed(2),
      carefulMinusFightRounds: +(num(careful.rounds) - num(base.rounds)).toFixed(2),
      carefulStuck: num(careful.stuck),
      fightStuck: num(base.stuck),
      focusedWin: map.get([fight,heat,'focused'].join('|'))?.win ?? null,
      escortWin: map.get([fight,heat,'escort'].join('|'))?.win ?? null
    });
  }
  const avg = (arr,key) => arr.length ? +(arr.reduce((n,r)=>n+r[key],0)/arr.length).toFixed(2) : null;
  const groups = Object.fromEntries(['fight','getaway'].map(goal => {
    const subset = comparisons.filter(r=>r.goal===goal);
    return [goal, {pairs:subset.length,carefulWinAdvantagePp:avg(subset,'carefulMinusFightWin'),carefulHpSaved:subset.length ? -avg(subset,'carefulMinusFightHpLost') : null,carefulExtraRounds:avg(subset,'carefulMinusFightRounds'),stuckPairs:subset.filter(r=>r.carefulStuck || r.fightStuck).length}];
  }));
  return {fightCount:fights.length,heats,rows:rows.length,compared:comparisons.length,missing,groups,
    weakCarefulFights:comparisons.filter(r=>r.goal==='fight' && r.carefulMinusFightWin<=5 && r.carefulMinusFightHpLost>=-0.5),
    comparisons};
}
const files=process.argv.slice(2);
if (!files.length || files.length>2) {
  console.error('Usage: node web/tools/c19-policy-report.mjs baseline.json [candidate.json]');
  process.exit(2);
}
try {
  const before=report(read(files[0]));
  const after=files[1] ? report(read(files[1])) : null;
  console.log(JSON.stringify({source:files[0],baseline:before,candidate:after,
    note:'Measured bot-policy outcomes only. No owner/device acceptance. A change in win rate is not proof of better player decisions.'},null,2));
  if (before.missing.length || after?.missing.length) process.exitCode=1;
} catch (e) { console.error(e.message); process.exitCode=1; }
