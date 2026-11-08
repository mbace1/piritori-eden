// Summarise bot runs: per run, then per block of chapter 1.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const content = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const rows = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).flatMap(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
const runs = new Map();
for (const r of rows) { const k = `${r.kind}#${r.seed}`; if (!runs.has(k)) runs.set(k, []); runs.get(k).push(r); }
const money = x => (x == null ? '—' : `€${Math.round(x)}`);
console.log('=== RUNS');
const perRun = [];
for (const [k, L] of runs) {
  const close = L.find(r => r.ev === 'chapter-close'), done = L.find(r => r.ev === 'done'), fights = L.filter(r => r.ev === 'fight');
  const acts = L.filter(r => r.ev === 'act');
  const ship = acts.find(r => r.snap.idx === 19 && r.why === 'choose');
  const ending = close?.screen?.match(/(pasila-[a-z]+|Pasila[^\n]{0,80})/i)?.[0] ?? null;
  const peak = Math.max(...acts.map(r => r.snap.cash));
  const zeroBlocks = new Set(acts.filter(r => r.snap.cash < 1).map(r => r.snap.idx)).size;
  const run = { k, closed: !!close, blocks: close ? 20 : Math.max(...acts.map(r => r.snap.idx)), steps: done?.steps, sec: Math.round((done?.ms ?? 0) / 1000), fights: fights.length,
    won: fights.filter(f => f.fight?.result === 'win').length, cash: close?.snap.cash, debt: close?.snap.debt, peak, zeroBlocks, earned: close?.snap.earned, ship: ship ? ship.choice : null, ending,
    stuck: L.find(r => ['stuck', 'crash', 'fight-timeout'].includes(r.ev))?.ev ?? null, errors: done?.errors?.length ?? 0 };
  perRun.push(run);
  console.log(`${k.padEnd(12)} ${run.closed ? 'closed' : 'OPEN  '} b${String(run.blocks).padStart(2)} ${String(run.steps).padStart(3)} steps ${String(run.sec).padStart(3)}s · fights ${run.fights} (won ${run.won}) · end ${money(run.cash)} debt ${money(run.debt)} peak ${money(run.peak)} · €0 in ${run.zeroBlocks} blocks · shipment: ${run.ship} · ${run.stuck ?? ''} ${run.errors ? 'page errors ' + run.errors : ''}`);
}
console.log('\n=== BLOCKS');
for (let idx = 0; idx < 20; idx += 1) {
  const slot = content.schedule[idx];
  const enc = content.encounters.find(e => e.id === slot.encounter_id);
  const picks = {}, deltas = [], fightsHere = [], roads = {}, doorsTaken = {}, hard = [];
  for (const [, L] of runs) {
    const here = L.filter(r => r.ev === 'act' && r.snap.idx === idx);
    if (!here.length) continue;
    const first = here[0], next = L.find(r => r.ev === 'act' && r.snap.idx > idx);
    if (next) deltas.push(next.snap.cash - first.snap.cash);
    for (const r of here) {
      if (r.why === 'choose') picks[r.choice] = (picks[r.choice] || 0) + 1;
      if (r.why === 'road') roads[r.choice] = (roads[r.choice] || 0) + 1;
      if (r.why === 'door') doorsTaken[r.choice] = (doorsTaken[r.choice] || 0) + 1;
    }
    const iFirst = L.indexOf(first), iNext = next ? L.indexOf(next) : L.length;
    for (const f of L.slice(iFirst, iNext).filter(r => r.ev === 'fight')) fightsHere.push(`${f.fight.goal}:${f.fight.result}/${f.fight.rounds}r`);
    hard.push(here.length);
  }
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  console.log(`${String(idx).padStart(2)} d${slot.day} ${slot.block.padEnd(5)} ${(enc ? enc.id : 'door block').padEnd(28)} picks ${JSON.stringify(picks)} · €Δ avg ${Math.round(avg(deltas))} (min ${Math.round(Math.min(...deltas))}, max ${Math.round(Math.max(...deltas))}) · actions ${avg(hard).toFixed(1)}${fightsHere.length ? ' · fights ' + fightsHere.join(' ') : ''}${Object.keys(roads).length ? ' · road ' + JSON.stringify(roads) : ''}${Object.keys(doorsTaken).length ? ' · doors ' + JSON.stringify(doorsTaken) : ''}`);
}
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(perRun, null, 1));
