#!/usr/bin/env node
/**
 * Vectors — what "ported" means, as a file.
 *
 *   node port/vectors.mjs            write port/vectors/*.json
 *   node port/vectors.mjs --check    fail if any is stale   <- the gate
 *
 * `PORTING.md` §4. The Godot side cannot run these models — GDScript is not
 * JavaScript — so a port is a re-implementation, and a re-implementation is
 * exactly where two builds silently stop agreeing. Rules therefore do not
 * travel as code. They travel as (input, expected output) rows, and the port
 * has one test that must reproduce every one of them.
 *
 * That turns "did you port it correctly" from a code review into a boolean.
 *
 * Two rules here are load-bearing rather than tidy:
 *
 *   - Every row carries the CAUSE, not just the number. A port that gets the
 *     price right and the reason wrong has reproduced the arithmetic and not
 *     the game — and the reason is what the player is shown.
 *   - `rev` moves when the OUTPUTS move, not when the file is regenerated.
 *     A no-op run must not tell the Godot side to go and do work.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import { offer, exposure, nodeProfile, decay, INFO, BLOCKS } from '../market/model.mjs';
import { cost, validate, fire } from '../missions/model.mjs';
import { hireling } from '../people/roster.mjs';
import { createBattleState, syncAlliesFor } from '../web/js/v3/battle.js';
import { parseCellFor, slotKey, ROWS } from '../web/js/v3/grid.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const outDir = join(here, 'vectors');

const board = JSON.parse(readFileSync(join(repo, 'map/kallio-era1-2003-v1.json')));
const anchors = board.anchors.filter(a => a.sliceState === 'active');

/** GDScript and JS do not have to agree to seventeen digits, and asking them to
 *  turns a port into a fight with IEEE 754. Four places is far finer than any
 *  price the player sees. */
const r = n => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : n);

// ── market ─────────────────────────────────────────────────────────────────
function marketVectors() {
  const rows = [];
  for (const a of anchors) {
    for (const day of [0, 3, 9]) {
      for (const block of BLOCKS) {
        for (const units of [0, 8, -8]) {
          const o = offer(a, 'piri', { day, block }, { seed: 'port', saturation: { units } });
          rows.push({
            in: { anchor: a.id, good: 'piri', day, block, seed: 'port', saturation: units },
            out: { buy: r(o.buy), sell: r(o.sell), mid: r(o.mid), marketMid: r(o.marketMid), cause: o.cause },
          });
        }
      }
    }
  }
  // The profile is what every price is built on, so it is vectored separately —
  // a port whose prices are right by luck and whose profiles are wrong will
  // diverge the moment content adds an anchor.
  const profiles = anchors.map(a => {
    const p = nodeProfile(a);
    return { in: { anchor: a.id, roles: a.roles }, out: { demand: r(p.demand), spread: r(p.spread), liquidity: r(p.liquidity), volatility: r(p.volatility), watch: r(p.watch) } };
  });
  const decays = [];
  for (const level of [INFO.QUOTE, INFO.RANGE, INFO.RUMOUR]) {
    for (const blocks of [0, 1, 3, 8, 12, 40]) {
      decays.push({ in: { level, blocks }, out: { level: decay(level, blocks) } });
    }
  }
  return { model: 'market', rows: { offers: rows, profiles, decay: decays } };
}

// ── exposure ───────────────────────────────────────────────────────────────
function exposureVectors() {
  const rows = [];
  for (const a of anchors) {
    for (const block of BLOCKS) {
      for (const condition of ['clear', 'drunk', 'stoned']) {
        for (const crew of [1, 3, 5]) {
          const e = exposure(a, { block, condition, crew, units: 6, armed: crew > 2 });
          rows.push({
            in: { anchor: a.id, block, condition, crew, units: 6, armed: crew > 2 },
            out: { score: r(e.score), band: e.band, cause: e.cause },
          });
        }
      }
    }
  }
  return { model: 'exposure', rows: { calls: rows } };
}

// ── missions ───────────────────────────────────────────────────────────────
function missionVectors() {
  const slice = JSON.parse(readFileSync(join(repo, 'content/era1-slice-v1.json')));
  const authored = (slice.missions ?? []).map(m => {
    const v = validate(m);
    return {
      in: { mission: m.id },
      out: { ok: v.ok, errors: v.findings.filter(f => f.level === 'error').length, igm: v.cost.igm, real: r(v.cost.real), steps: v.cost.steps },
    };
  });

  // A synthetic beat, because the authored four have no steps yet (MISSIONS.md
  // §6) and a port needs at least one full-shaped mission to check against.
  const beat = {
    id: 'port-beat',
    signal_encounter_id: 'enc-toko-quiet-voice',
    deadline: { day: 5, block: 'night' },
    steps: [
      { verb: 'MEET', anchor: 'vaasankatu', alternatives: ['send a crew member'] },
      { verb: 'MOVE', anchor: 'harju', alternatives: ['walk it'], triggers: ['smell', 'bulk'] },
      { verb: 'SELL', anchor: 'harju', alternatives: ['split the load'], triggers: ['dry'] },
      { verb: 'LOSE', anchor: 'siltasaari', alternatives: ['go to ground'] },
    ],
    success_effects: ['flag:van-pattern', 'rapport:toko:+1'],
    partial_effects: ['pressure:harju:+1'],
    failure_effects: ['relationship:toko:-1'],
  };
  const c = cost(beat);

  const anchorOf = id => board.anchors.find(a => a.id === id);
  const fires = [];
  const cases = [
    { step: { verb: 'MOVE', triggers: ['smell'] }, ctx: { anchor: 'piritori', carrying: ['weed'], transport: 'public', block: 'day', busy: true, units: 3 } },
    { step: { verb: 'MOVE', triggers: ['smell'] }, ctx: { anchor: 'piritori', carrying: ['weed'], transport: 'public', block: 'day', busy: true, units: 3, kit: ['carbon-bag'] } },
    { step: { verb: 'MOVE', triggers: ['bulk'] }, ctx: { anchor: 'piritori', units: 12, block: 'day' } },
    { step: { verb: 'MOVE', triggers: ['bulk'] }, ctx: { anchor: 'torkkelinmaki', units: 12, block: 'night' } },
    { step: { verb: 'SELL', triggers: ['dry'] }, ctx: { anchor: 'harju', saturation: 9, block: 'evening' } },
    { step: { verb: 'LOSE', triggers: ['known'] }, ctx: { anchor: 'piritori', grievance: 2, block: 'night' } },
    { step: { verb: 'LOSE', triggers: ['known'] }, ctx: { anchor: 'piritori', grievance: 2, block: 'night', speaker: 'mira' } },
  ];
  for (const { step, ctx } of cases) {
    const f = fire(step, { ...ctx, anchor: anchorOf(ctx.anchor) }, exposure);
    fires.push({
      in: { step, ctx },
      out: {
        ends: f.ends,
        clean: f.clean,
        fired: f.fired.map(x => ({ id: x.id, answered: x.answered, band: x.band, severity: r(x.severity) })),
      },
    });
  }

  return {
    model: 'missions',
    rows: {
      authored,
      cost: [{ in: { mission: 'port-beat' }, out: { igm: c.igm, real: r(c.real), fitsBlock: c.fitsBlock, fitsReal: c.fitsReal, thin: c.thin } }],
      fire: fires,
    },
  };
}

// ── sync fire (COMBAT.md §9.13) ───────────────────────────────────────────
//
// Designed on this side first (PORTING.md §3.2: "we develop on js... you
// control the primary tester build"), unlike stance/chrome, which are the
// two named exceptions running the other way. Godot's fight_manager.gd
// already carries its own working implementation of the same RULE, built
// before this vectors file existed — this is what makes it canonical here
// going forward, not a claim that Godot's copy is wrong.
//
// Until the grid rebuild (VERSIONS.md, this entry), this file deliberately
// did NOT attempt a literal position-for-position replay on the Godot
// side: the two boards did not share a coordinate system. They do now —
// `battle.js`'s board IS `grid.js`, the same unified lane/depth axis ported
// from `godot/scripts/fight/board.gd` — so a row's `cells` are real board
// coordinates, not a JS-only layout, even though a cross-build replay
// fixture (like `stance.json`/`chrome.json`) is still a separate, larger
// job than sync fire itself and not attempted here.
function syncVectors() {
  const slice = JSON.parse(readFileSync(join(repo, 'content/era1-slice-v1.json')));
  const battleDef = slice.battles.find(b => b.id === 'battle-courtyard-3v3');
  const crew = slice.crew.slice(0, 3);
  const equipment = slice.equipment;
  const state = { crewStatus: Object.fromEntries(crew.map(c => [c.id, { status: 'available' }])), battleOpeningNerve: 0 };
  const dataForBattle = { equipment: new Map(equipment.map(item => [item.id, item])) };

  // Authored "front-2" text -> a real `battle.js` cell (a grid.js slotKey),
  // for the given side — what `createBattleState` itself does when it reads
  // a battle definition's own authored cells.
  const cellFor = (text, isPlayer) => { const { lane, depth } = parseCellFor(text, isPlayer); return slotKey(lane, depth); };
  const playerCell = text => cellFor(text, true);
  const enemyCell = text => cellFor(text, false);

  // Each scenario is a hand-placed formation (cells set directly, not the
  // authored opening layout) so reach is unambiguous rather than
  // incidental. The slice's first three crew are runner/muscle/watcher (in
  // that order): runner and watcher both carry a feature-phone
  // (front-same-lane, 0 lane spread — and support items reach exactly like
  // a weapon since `equipment.js` doesn't special-case `kind`); muscle
  // carries a baseball-bat (front-same-or-adjacent-lane, 1 lane spread).
  // Reach comes ONLY from the held item now — nothing here reads `role` —
  // so lane 3 is the shared hub for attacker/target throughout: courtyard-
  // 3v3's own authored cover ("stone-bin") sits at the opposition's
  // front-1, and cover blocks a non-piercing walk through that depth even
  // when the walk's own target is the body standing on it, so front-1 is a
  // real no-shot cell here and every scenario below avoids it on purpose
  // rather than by accident.
  const scenarios = [
    {
      name: 'adjacent-lane-front-row-ally-syncs',
      place(b) {
        b.players[0].cell = playerCell('front-3');
        b.players[1].cell = playerCell('front-2'); // adjacent lane, front row: also in reach
        b.players[2].cell = playerCell('back-1');  // watcher: feature-phone only fires from the front row
        b.enemies[0].cell = enemyCell('front-3');
        return { attacker: b.players[0], target: b.enemies[0] };
      },
    },
    {
      name: 'same-lane-non-front-row-does-not-sync-a-front-only-weapon',
      place(b) {
        b.players[0].cell = playerCell('front-3');
        b.players[1].cell = playerCell('middle-3'); // same lane, but baseball-bat only fires from the front row
        b.players[2].cell = playerCell('back-1');
        b.enemies[0].cell = enemyCell('front-3');
        return { attacker: b.players[0], target: b.enemies[0] };
      },
    },
    {
      name: 'two-lanes-away-is-out-of-reach-for-a-one-lane-spread',
      place(b) {
        b.players[0].cell = playerCell('front-3');
        b.players[1].cell = playerCell('front-1'); // 2 lanes from the target: past baseball-bat's 1-lane spread
        b.players[2].cell = playerCell('back-1');
        b.enemies[0].cell = enemyCell('front-3');
        return { attacker: b.players[0], target: b.enemies[0] };
      },
    },
    {
      name: 'no-ally-in-reach-syncs-nobody',
      place(b) {
        b.players[0].cell = playerCell('front-3');
        b.players[1].cell = playerCell('back-2'); // baseball-bat cannot fire from the back row either
        b.players[2].cell = playerCell('back-1');
        b.enemies[0].cell = enemyCell('front-3');
        return { attacker: b.players[0], target: b.enemies[0] };
      },
    },
    {
      // fight_manager.gd's own ruling: a fighter who has advanced out of
      // their own band counts as ROW_FRONT by definition, not as "nowhere"
      // — crossing the whole shared board is a normal position. Player[0]
      // (muscle, baseball-bat) attacks normally from the front row;
      // player[1] (runner, feature-phone — 0 lane spread, front row only)
      // is placed PAST their own band, in the real, occupiable neutral
      // strip, same lane as the target: still counts as front, still syncs.
      name: 'advanced-past-own-band-still-counts-as-front',
      place(b) {
        b.players[0].cell = playerCell('front-3');
        b.players[1].cell = slotKey(parseCellFor('front-3', true).lane, ROWS); // first neutral depth
        b.players[2].cell = playerCell('back-1');
        b.enemies[0].cell = enemyCell('front-3');
        return { attacker: b.players[0], target: b.enemies[0] };
      },
    },
  ];

  const rows = scenarios.map(({ name, place }) => {
    const battle = createBattleState(battleDef, crew, state, dataForBattle);
    const { attacker, target } = place(battle);
    const allies = syncAlliesFor(battle, attacker, target);
    return {
      in: {
        scenario: name,
        cells: Object.fromEntries(battle.players.map(p => [p.id, p.cell])),
        attacker: attacker.id,
        target: target.id,
      },
      out: { syncAllies: allies.map(u => u.id).sort() },
    };
  });

  return { model: 'sync', rows: { allies: rows } };
}

// ── people ─────────────────────────────────────────────────────────────────
function peopleVectors() {
  const rows = [];
  for (let i = 0; i < 24; i++) {
    const h = hireling('port', i);
    rows.push({
      in: { seed: 'port', index: i },
      out: { id: h.id, name: h.name, nick: h.nick, aptitudes: h.aptitudes, look: h.look, traits: h.traits.map(t => t.id).sort() },
    });
  }
  return { model: 'people', rows: { hirelings: rows } };
}

// ── write / check ──────────────────────────────────────────────────────────
const BUILDERS = [marketVectors, exposureVectors, missionVectors, syncVectors, peopleVectors];
const check = process.argv.includes('--check');

if (!check) mkdirSync(outDir, { recursive: true });

let stale = 0, wrote = 0, same = 0;
for (const build of BUILDERS) {
  const fresh = build();
  const path = join(outDir, `${fresh.model}.json`);
  const prev = existsSync(path) ? JSON.parse(readFileSync(path)) : null;

  // `rev` tracks the OUTPUTS, so regenerating an unchanged model does not tell
  // the Godot side to re-port anything.
  const changed = !prev || JSON.stringify(prev.rows) !== JSON.stringify(fresh.rows);
  fresh.rev = changed ? (prev?.rev ?? 0) + 1 : prev.rev;
  fresh.note = 'Generated by port/vectors.mjs — see PORTING.md §4. Do not hand-edit.';

  const count = Object.values(fresh.rows).reduce((n, a) => n + a.length, 0);
  if (check) {
    if (changed) { stale++; console.log(`  STALE  ${fresh.model}  (${count} rows; rev would go ${prev?.rev ?? 0} -> ${fresh.rev})`); }
    else console.log(`  ok     ${fresh.model}@${fresh.rev}  ${count} rows`);
  } else if (changed) {
    writeFileSync(path, JSON.stringify(fresh, null, 1) + '\n');
    wrote++; console.log(`  wrote  ${fresh.model}@${fresh.rev}  ${count} rows`);
  } else {
    same++; console.log(`  same   ${fresh.model}@${fresh.rev}  ${count} rows`);
  }
}

if (check && stale) {
  console.log(`\nport vectors: ${stale} stale. Run \`node port/vectors.mjs\`, then name the new revs in VERSIONS.md's Port block.\n`);
  process.exit(1);
}
console.log(check ? '\nport vectors: all current\n' : `\nport vectors: ${wrote} written, ${same} unchanged\n`);
