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
const BUILDERS = [marketVectors, exposureVectors, missionVectors, peopleVectors];
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
