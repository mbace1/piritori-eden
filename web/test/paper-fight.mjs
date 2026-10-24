// Paper fights (Act I v4.72): the motion vocabulary and the beats it acts out.
//
//   node web/test/paper-fight.mjs
//
// Owner, 2026-10-23: "3d might not be the future. Recent steps are using
// motion graphics." paper-motion.js is pure, so its rules are held here in
// bare node: a strike leans away before it commits, the card bends when hit,
// a fall topples and lies, beats play one after another, and reduced motion
// still says what happened. battle.js records the beats; no rule reads them.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  RHYTHM, REST, DURATION, IMPACT, REACT, STILL_HOLD, LYING, stepped, strikePose, reactPose, downProgress,
  schedule, figureAt, stepLength, cellDistance, idlePose, isRanged,
} from '../js/v3/paper-motion.js?v=1';
import { createState, fighters } from '../js/v3/state.js?v=9';
import { createBattleState, selectAction, brace, moveUnit, validMoveCells, endPlayerPhase } from '../js/v3/battle.js?v=14';
import { nameFrom } from '../../people/roster.mjs?v=1';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const data = {
  content,
  // Named the way content.js names them at load (COMBAT.md §7.1).
  crew: new Map(content.crew.map(c => [c.id, { ...c, name: c.name ?? nameFrom(c.id) }])),
  battles: new Map(content.battles.map(b => [b.id, b])),
  equipment: new Map(content.equipment.map(e => [e.id, e])),
  missions: new Map(content.missions.map(m => [m.id, m])),
};
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ── the rhythm ───────────────────────────────────────────────────────────
ok(RHYTHM === 12, 'poses step twelve times a second');
ok(stepped(0.04) === 0 && near(stepped(0.09), 1 / 12) && near(stepped(1), 1), 'a time snaps down to its step');
ok(near(idlePose(stepped(0.04), 0).squash, idlePose(0, 0).squash), 'between steps the pose holds');

// ── a strike leans away, commits under half a step, holds, settles ─────────
const windup = strikePose(0.15), release = strikePose(IMPACT), held = strikePose(IMPACT + 0.1), end = strikePose(DURATION.strike);
ok(windup.lean < 0 && windup.fsh < 0, 'it leans away and draws the arm back before it commits');
ok(release.lean > 0 && release.dx > 0, 'at the impact it is over its front foot');
ok(release.dx < 0.5, 'the commit is under half a step: it never reads as having moved');
ok(JSON.stringify(held) === JSON.stringify(release), 'the recovery holds the release first');
ok(Object.keys(REST).every(k => near(end[k], REST[k], 1e-9)), 'and settles back to rest');
ok(strikePose(IMPACT, { ranged: true }).dx <= 0 && strikePose(IMPACT, { ranged: true }).fsh > 80, 'a gun is raised level and kicks back, not swung');
ok(isRanged('first-handgun') && isRanged('lifted-handgun') && !isRanged('baseball-bat'), 'handguns are ranged, bats are not');

// ── being hit bends the card ─────────────────────────────────────────────────
const hurt0 = reactPose('hurt', 0), guard0 = reactPose('guard', 0);
ok(hurt0.shear < 0 && hurt0.lean < 0, 'a hit bends the card back from the blow');
ok(Math.abs(guard0.shear) < Math.abs(hurt0.shear), 'a torn guard is a smaller flinch than a wound');
ok(guard0.fsh > 90, 'with the arms up');
ok(near(reactPose('hurt', REACT.hurt).shear, 0, 1e-9), 'and it straightens when the reaction is over');

// ── a fall topples and lies ───────────────────────────────────────────────────
ok(downProgress(0) === 0 && downProgress(0.1) < 0.2, 'a fall starts slow');
ok(downProgress(0.42) > 1, 'it overshoots a little');
ok(near(downProgress(REACT.down), 1) && near(downProgress(5), 1), 'and lies still');
ok(LYING.down === 1, 'lying is fully down');

// ── beats play one after another ─────────────────────────────────────────────
const beats = [
  { seq: 1, kind: 'brace', actor: 'a' },
  { seq: 2, kind: 'strike', actor: 'e1', target: 'a', effect: 'hurt', weapon: 'pipe' },
  { seq: 3, kind: 'step', actor: 'b', from: '1,1', to: '1,5' },
  { seq: 4, kind: 'strike', actor: 'e2', target: 'b', effect: 'down', weapon: 'baton' },
];
const plan = schedule(beats, 0, 10);
ok(plan.length === 4 && plan[0].start === 10, 'everything new is laid from now');
ok(plan.every((p, i) => i === 0 || p.start === plan[i - 1].end), 'one after another, never at once');
ok(near(plan[0].end - plan[0].start, DURATION.brace), 'a brace takes its own time');
ok(plan[1].end - plan[1].start >= IMPACT + REACT.hurt - 1e-9, 'a strike lasts until its reaction is over');
ok(near(plan[2].end - plan[2].start, stepLength(beats[2])) && stepLength(beats[2]) > DURATION.step, 'a long hop takes longer than a short one');
ok(cellDistance('1,1', '1,5') === 4 && stepLength({ from: '0,0', to: '0,1' }) === DURATION.step, 'one cell is the base hop');
ok(schedule(beats, 2, 0).map(p => p.beat.seq).join() === '3,4', 'what has played is not played again');
ok(schedule(beats, 0, 0, { reduced: true }).every(p => near(p.end - p.start, STILL_HOLD)), 'reduced motion: each beat held briefly');

// ── what a figure looks like at a moment ─────────────────────────────────────
const b = { id: 'b', side: 'player', cell: '1,5', alive: false, nerve: 2 };
const atStart = figureAt(b, 10, plan);
ok(atStart.cell === '1,1' && atStart.standing, 'before its hop it stands where it was, still up');
const midHop = figureAt(b, (plan[2].start + plan[2].end) / 2, plan);
ok(midHop.from === '1,1' && midHop.to === '1,5' && midHop.k > 0 && midHop.k < 1 && midHop.pose.dy < 0, 'mid-hop it is between the cells, in the air');
const beforeFall = figureAt(b, plan[3].start + 0.1, plan);
ok(beforeFall.standing && beforeFall.cell === '1,5', 'down in the rules, it stands until the blow lands');
const falling = figureAt(b, plan[3].start + IMPACT + 0.2, plan);
ok(!falling.standing && falling.pose.down > 0 && falling.face === 'e2', 'then it topples, facing who hit it');
ok(figureAt(b, plan[3].end + 1, plan).pose === LYING, 'and lies there for the rest of the fight');
const striker = figureAt({ id: 'e1', side: 'enemy', cell: '2,6', alive: true, nerve: 3 }, plan[1].start + 0.15, plan);
ok(striker.face === 'a' && striker.pose.lean < 0, 'a striker faces its target and winds up');
const struck = figureAt({ id: 'a', side: 'player', cell: '2,1', alive: true, nerve: 3 }, plan[1].start + IMPACT + 0.05, plan);
ok(struck.face === 'e1' && struck.pose.shear < 0, 'the target reacts at the impact, turned to the blow');
ok(figureAt({ id: 'a', side: 'player', cell: '2,1', alive: true, nerve: 3 }, plan[1].start + IMPACT - 0.05, plan).pose.shear === 0, 'not before it');
const shaken = figureAt({ id: 'z', side: 'player', cell: '0,0', alive: true, nerve: 0 }, 50, []);
ok(shaken.pose.head < 0 && shaken.pose.lean < 0, 'at zero nerve a figure stoops');
const still = figureAt({ id: 'z', side: 'player', cell: '0,0', alive: true, nerve: 3 }, 50, [], { reduced: true });
ok(still.pose.squash === 1, 'reduced motion: no breath');
const rPlan = schedule(beats, 0, 0, { reduced: true });
ok(figureAt(b, rPlan[3].start + 0.01, rPlan, { reduced: true }).pose.down === 1, 'reduced motion: a fall is its end pose');

// ── battle.js records the beats ──────────────────────────────────────────────
const s = createState(content);
s.recruited = content.crew.slice(0, 1).map(c => c.id); s.deployed = [...s.recruited];
const battle = createBattleState(data.battles.get('battle-karhupuisto-2v2'), fighters(s, data), s, data);
ok(Array.isArray(battle.beats) && battle.beats.length === 0 && battle.beatSeq === 0, 'a new fight has no beats');
selectAction(battle, 'brace'); brace(battle);
ok(battle.beats.at(-1).kind === 'brace' && battle.beats.at(-1).actor === battle.players[0].id && battle.beatSeq === 1, 'a brace is a beat');
const mover = battle.players.find(p => !battle.acted.includes(p.id));
battle.selectedId = mover.id; selectAction(battle, 'move');
const to = validMoveCells(battle, mover)[0]; const from = mover.cell;
moveUnit(battle, to);
ok(battle.beats.at(-1).kind === 'step' && battle.beats.at(-1).from === from && battle.beats.at(-1).to === to, 'a reposition is a hop from where to where');
const weakest = battle.players[0]; weakest.hp = 1; weakest.guard = 0;
endPlayerPhase(battle);
const strikes = battle.beats.filter(x => x.kind === 'strike');
ok(strikes.length >= 1 && strikes.every(x => battle.enemies.some(e => e.id === x.actor)), 'the enemy phase is strikes, by the enemies');
ok(strikes.some(x => x.target === weakest.id && x.effect === 'down') && !weakest.alive, 'a blow that downs says so');
ok(strikes.every(x => ['guard', 'hurt', 'down'].includes(x.effect) && x.weapon), 'every strike says what it did, and with what');
ok(battle.beats.every((x, i, all) => i === 0 || x.seq === all[i - 1].seq + 1), 'beats are numbered in order');
ok(JSON.stringify(JSON.parse(JSON.stringify(battle)).beats) === JSON.stringify(battle.beats), 'beats survive a save');
// Bounded, and an older saved fight gains them.
const tough = createBattleState(data.battles.get('battle-karhupuisto-2v2'), fighters(s, data), s, data);
tough.players.forEach(p => { p.hp = 999; p.maxHp = 999; });
tough.training = true; // no heat, so no police calling the fight off at round 12
for (let r = 0; r < 20; r += 1) endPlayerPhase(tough);
ok(tough.beats.length === 24 && tough.beatSeq > 24 && tough.beats.at(-1).seq === tough.beatSeq, 'the last 24 are kept and the count only rises');
const old = createBattleState(data.battles.get('battle-karhupuisto-2v2'), fighters(s, data), s, data);
delete old.beats; delete old.beatSeq;
selectAction(old, 'brace'); brace(old);
ok(old.beats.length === 1 && old.beatSeq === 1, 'a fight saved before v4.72 starts counting');

console.log(`paper-fight: ${checks} checks passed`);
