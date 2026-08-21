// Rank-based tactical fights. See FIGHT_BRIEF.md.
//
// OWNER OVERRIDE: BRIEF.md § "no combat layer" and CLAUDE_HANDOFF § "Piritori
// has no combat layer" both forbid this. The owner has asked for it twice now,
// with a full brief the second time. Recorded rather than argued, because the
// brief still reads the other way and a later reader deserves to know which won.
//
// Two theses now, after the v2 brief.
//
// WHERE YOU STAND DECIDES WHAT YOU MAY DO. A weapon declares the rows it can be
// used FROM and the rows it can REACH, so a bat is dead weight in the back and
// the blank gun is dead weight in a scrum.
//
// AND: HOW MUCH OF YOURSELF DID YOU SPEND WINNING. Every unit has harm and
// NERVE, and a fight has three exits — rout them, break them, or walk. Routing
// costs almost nothing; putting bodies down costs heat where it happened and
// trust with whoever watched. That is Steinbeck's divergence-and-return with NO
// MORALITY METER, which canon (BRIEF.md § Trust) explicitly forbids: nothing is
// scored, it is simply that people are different with you tomorrow.
//
// OWNER OVERRIDE 2 (2026-08-18, answering ART_BIBLE §3.1): "there are guns."
// BRIEF.md § Pressure/heat still reads "there is no gunfight", so the two are
// reconciled structurally rather than by deleting the sentence:
//   · live firearms exist, and they work (`live: true` below);
//   · NOBODY starts a fight holding one — not your crew, not any roster — so
//     the encounter ladder is still a scuffle you walked into;
//   · a shot is PRICED, not scored: it is heard, it shakes the whole board, and
//     consequence() charges heat and trust above every other way out.
// So the gun is real and is never the cheap answer, which is the same argument
// the routed/win split already makes, one rung further out.
//
// OWNER OVERRIDE 3 (same day, ART_BIBLE §3.4): "cover is terrain and also
// others." Cover was a body; it is now a body OR a thing standing in the lane.
//
// No DOM in this file, no wall clock, no Math.random — the whole fight is a
// pure function of (roster, seed, decisions), which is what lets the gate play
// hundreds of them in bare node.

import { Rng } from '../../flow-core/rng.js?v=1';

export const COLS = 3;
export const ROWS = 3;            // 3×4 is this number and nothing else
export const ROW_NAME = ['front', 'middle', 'back'];

const ALL_ROWS = [0, 1, 2];

// ── weapons ─────────────────────────────────────────────────────────────
// `from` — rows the wielder may use it from.  `reach` — enemy rows it strikes.
// `pierce: false` must resolve against the frontmost living enemy in that
// column, which is what makes a body in front into cover.
export const WEAPONS = {
  fists: { id: 'fists', name: 'fists', dmg: [1, 3], nerve: 1, from: [0], reach: [0], pierce: false, effect: null },
  bottle: { id: 'bottle', name: 'bottle', dmg: [2, 4], nerve: 1, from: [0, 1], reach: [0], pierce: false, effect: null },
  bat: { id: 'bat', name: 'bat', dmg: [2, 5], nerve: 2, from: [0], reach: [0], pierce: false, effect: 'shove' },
  // the most harm and the least fear in the game — it only hurts
  steel: { id: 'steel', name: 'steel', dmg: [4, 7], nerve: 0, from: [0], reach: [0], pierce: false, effect: null },
  // and its opposite: all fear, no harm. The McCormicks already sold these.
  blank: { id: 'blank', name: 'blank gun', dmg: [0, 0], nerve: 4, from: [1, 2], reach: ALL_ROWS, pierce: true, effect: 'fear' },
  hook: { id: 'hook', name: 'hook', dmg: [1, 2], nerve: 1, from: [0, 1], reach: [0, 1], pierce: true, effect: 'pull' },
  // yard tools, off the item sheet. `breach` is what a weapon does to a THING
  // rather than a person — a crowbar is poor against a man and takes a hoarding
  // apart in two swings.
  crowbar: { id: 'crowbar', name: 'crowbar', dmg: [2, 5], nerve: 1, from: [0], reach: [0], pierce: false, effect: null, breach: 3 },
  plank: { id: 'plank', name: 'plank', dmg: [1, 6], nerve: 2, from: [0, 1], reach: [0], pierce: false, effect: 'shove' },

  // ── live firearms ────────────────────────────────────────────────────
  // See OWNER OVERRIDE 2 at the top. `live: true` is the flag every rule about
  // guns keys off — the gate asserts none of these is in a starting roster and
  // that firing one is the most expensive thing that can happen in a fight.
  pistol: { id: 'pistol', name: 'pistol', dmg: [3, 6], nerve: 3, from: [1, 2], reach: ALL_ROWS, pierce: true, effect: null, live: true },
  // spread: a body really does stop it, so the cover rule holds for a shotgun
  shotgun: { id: 'shotgun', name: 'shotgun', dmg: [5, 9], nerve: 3, from: [0, 1], reach: [0, 1], pierce: false, effect: 'shove', live: true, breach: 2 },
  rifle: { id: 'rifle', name: 'rifle', dmg: [4, 8], nerve: 2, from: [2], reach: ALL_ROWS, pierce: true, effect: null, live: true },
};

// ── items ───────────────────────────────────────────────────────────────
// OWNER DECISION 2026-08-19: the mockups' ITEM button gets a real system, and
// it is two things — a bottle and a rock.
//
// Both are THROWN, which is the point of them: they are the only way anybody
// on your side reaches past the front rank without owning a gun or a blank one.
// They are one-use, they are shared by the whole crew rather than carried per
// unit, and they are picked up off the street each fight rather than bought —
// a bottle and a half brick are what the ground gives you, and making them a
// purchase would turn a scuffle into a shopping trip.
//
// A rock is the quieter one: less harm, more fright, and it can be thrown from
// anywhere. A bottle hurts more and is louder, which is the same trade the
// weapons table makes everywhere else.
export const ITEMS = {
  bottle: { id: 'bottle', name: 'bottle', dmg: [3, 6], nerve: 2, reach: ALL_ROWS, pierce: true },
  rock: { id: 'rock', name: 'rock', dmg: [1, 3], nerve: 3, reach: ALL_ROWS, pierce: true },
};
export const ITEM_STOCK = { bottle: 2, rock: 2 };

// ── arenas ──────────────────────────────────────────────────────────────
// Where a fight happens, which is what the delivered backgrounds hang on. Four
// exist; three are spoken for by the three ways an encounter can be caused, and
// `yard` is the FALLBACK — any opponent added later without an arena of its own
// gets it rather than getting bare paper, and it is the one a new encounter
// inherits. A default that is a real place beats a default that is nothing.
export const ARENAS = ['harbour', 'court', 'park', 'yard'];
export const DEFAULT_ARENA = 'yard';
export const arenaFor = kind => OPPONENTS[kind]?.arena || DEFAULT_ARENA;

// ── cover ───────────────────────────────────────────────────────────────
// Terrain, off the props sheet. A standing prop occupies a cell nobody may
// move into and shields the lane behind it. `hard` means it stops a bullet as
// well as a fist — concrete and stone do, a wheelie bin does not.
export const COVER = {
  barrier: { id: 'barrier', name: 'concrete barrier', hp: 14, hard: true },
  rock: { id: 'rock', name: 'boulder', hp: 16, hard: true },
  bin: { id: 'bin', name: 'bin', hp: 7, hard: false },
  crate: { id: 'crate', name: 'crate', hp: 6, hard: false },
  rack: { id: 'rack', name: 'bike rack', hp: 5, hard: false },
};

export class Prop {
  constructor({ id, kind, side, col, row }) {
    const c = COVER[kind] || COVER.crate;
    this.id = id; this.kind = c.id; this.name = c.name;
    this.side = side; this.col = col; this.row = row;
    this.hp = c.hp; this.maxHp = c.hp;
    this.hard = c.hard;
    this.prop = true;
    this.guard = 0; this.bracing = false; this.downed = false;
  }
  get alive() { return this.hp > 0; }
  get rowName() { return ROW_NAME[this.row] ?? `row ${this.row}`; }
}
export class Unit {
  constructor({ id, name, side, col, row, hp = 10, nerve = 8, speed = 5, guard = 0, weapons = ['fists'] }) {
    this.id = id; this.name = name; this.side = side;
    this.col = col; this.row = row;
    this.hp = hp; this.maxHp = hp;
    // nerve is whether they still want to be here. It is a UNIT stat, not a
    // score kept on the player — canon forbids a good/evil meter.
    this.nerve = nerve; this.maxNerve = nerve;
    this.speed = speed;
    this.guard = guard;          // flat reduction
    this.bracing = false;
    this.weapons = weapons;
    this.fled = false;
    this.downed = false;
  }
  get alive() { return this.hp > 0 && !this.fled; }
  get standing() { return !this.downed; }
  get rowName() { return ROW_NAME[this.row] ?? `row ${this.row}`; }
}

// ── the board ───────────────────────────────────────────────────────────
export class Fight {
  constructor({ you, them, seed = 1, rows = ROWS, cover = [] }) {
    this.rows = rows;
    this.rng = new Rng(seed, 'fight');
    this.units = [];
    for (const u of you) this.units.push(new Unit({ ...u, side: 'you' }));
    for (const u of them) this.units.push(new Unit({ ...u, side: 'them' }));
    // props live OUTSIDE this.units on purpose: they are not people, so they
    // never take a turn, never carry nerve, and cannot win or lose the fight.
    this.props = cover.map((c, i) => new Prop({ id: `p${i}`, ...c }));
    this.fired = 0;               // live rounds discharged, by anyone
    // shared by your whole side: what is lying about on this particular street
    this.items = { ...ITEM_STOCK };
    this.round = 1;
    this.log = [];
    this.over = null;            // 'win' | 'lose' | 'fled' | 'paid'
    this.order = [];
    this.turn = 0;
    this.auto = false;
    this.broke = false;   // did anybody go down in this fight
    this.rollOrder();
  }

  say(line) { this.log.unshift(line); this.log.length = Math.min(this.log.length, 40); }

  living(side) { return this.units.filter(u => u.side === side && u.alive); }
  standing(side) { return this.props.filter(p => p.side === side && p.alive); }
  at(side, col, row) {
    return this.units.find(u => u.side === side && u.col === col && u.row === row && u.alive)
      || this.props.find(p => p.side === side && p.col === col && p.row === row && p.alive);
  }
  byId(id) { return this.units.find(u => u.id === id) || this.props.find(p => p.id === id); }

  // What a thrown item can reach. Piercing, so it goes over a bin — but HARD
  // cover still shuts the lane, because a boulder stops a bottle exactly the
  // way it stops a bullet, and one rule for "what is in the way" is the whole
  // reason cover generalised in the first place.
  itemTargets(unit) {
    const foe = unit.side === 'you' ? 'them' : 'you';
    const out = [];
    for (let c = 0; c < COLS; c++) {
      for (const t of this.blockersIn(foe, c)) {
        if (!t.prop) out.push(t);
        if (t.prop && t.hard) break;
      }
    }
    return out;
  }

  canThrow(unit, id) {
    return unit.side === 'you' && !!ITEMS[id] && (this.items[id] || 0) > 0;
  }

  // Everything standing in one lane, nearest the middle first. A body and a
  // barrier are the same kind of thing to a swing — that is the whole of
  // "cover is terrain and also others".
  blockersIn(side, col) {
    return [...this.living(side), ...this.standing(side)]
      .filter(t => t.col === col)
      .sort((a, b) => a.row - b.row || (a.id < b.id ? -1 : 1));
  }

  // speed descending, ties by id — a seed always replays identically
  rollOrder() {
    this.order = this.units.filter(u => u.alive)
      .sort((a, b) => b.speed - a.speed || (a.id < b.id ? -1 : 1))
      .map(u => u.id);
    this.turn = 0;
  }

  get actor() {
    for (let i = this.turn; i < this.order.length; i++) {
      const u = this.byId(this.order[i]);
      if (u?.alive) { this.turn = i; return u; }
    }
    return null;
  }

  // ── legality: the whole positioning game lives in these two ───────────
  canUse(unit, weaponId) {
    const w = WEAPONS[weaponId];
    return !!w && w.from.includes(unit.row);
  }

  // Every enemy this weapon may actually be aimed at from here. Cover is
  // applied HERE rather than at resolve time, so the UI can only ever offer a
  // legal target and the player can see the cover working.
  targets(unit, weaponId) {
    const w = WEAPONS[weaponId];
    if (!w || !this.canUse(unit, weaponId)) return [];
    const foe = unit.side === 'you' ? 'them' : 'you';
    const out = [];
    for (let c = 0; c < COLS; c++) {
      const column = this.blockersIn(foe, c);
      if (!column.length) continue;
      // a weapon that draws no blood has nothing to say to a bin: the blank gun
      // still gets BLOCKED by cover, it just cannot be aimed at it
      const aimable = t => w.reach.includes(t.row) && !(t.prop && w.dmg[1] === 0);
      if (w.pierce) {
        // a bullet goes through people and bins, and stops at concrete. So the
        // first HARD thing in the lane is the last thing a piercing weapon can
        // touch — everything behind it is out of the fight until it comes down.
        for (const t of column) {
          if (aimable(t)) out.push(t);
          if (t.prop && t.hard) break;
        }
      } else {
        // only the frontmost thing in the lane is reachable — it IS the cover
        // for everything behind it, body or barrier alike
        const front = column[0];
        if (aimable(front)) out.push(front);
      }
    }
    return out;
  }

  // Everything a unit could legally do right now.
  options(unit) {
    const acts = [];
    for (const id of unit.weapons) {
      const t = this.targets(unit, id);
      if (this.canUse(unit, id) && t.length) acts.push({ kind: 'attack', weapon: id, targets: t.map(u => u.id) });
    }
    for (const d of [-1, 1]) {
      const r = unit.row + d;
      if (r >= 0 && r < this.rows && !this.at(unit.side, unit.col, r)) {
        acts.push({ kind: 'move', row: r });
      }
    }
    for (const id of Object.keys(ITEMS)) {
      if (!this.canThrow(unit, id)) continue;
      const t = this.itemTargets(unit);
      if (t.length) acts.push({ kind: 'throw', item: id, targets: t.map(u => u.id) });
    }
    acts.push({ kind: 'guard' });
    return acts;
  }

  // ── resolution ────────────────────────────────────────────────────────
  act(action) {
    const u = this.actor;
    if (!u || this.over) return null;
    u.bracing = false;

    if (action.kind === 'throw') {
      const it = ITEMS[action.item];
      const target = this.byId(action.target);
      if (!this.canThrow(u, action.item)) return { error: 'nothing to throw' };
      if (!this.itemTargets(u).some(t => t.id === target?.id)) return { error: 'not from there' };
      this.items[action.item] -= 1;
      const roll = this.rng.int(it.dmg[0], it.dmg[1]);
      const dealt = Math.max(0, roll - target.guard - (target.bracing ? 2 : 0));
      target.hp -= dealt;
      this.shake(target, it.nerve);
      this.say(`${u.name} throws the ${it.name}. ${target.name} takes ${dealt}.`);
      if (target.hp <= 0) this.down(target);
      this.advance();
      return { dealt };
    }

    if (action.kind === 'attack') {
      const w = WEAPONS[action.weapon];
      const target = this.byId(action.target);
      const legal = this.targets(u, action.weapon).some(t => t.id === target?.id);
      if (!legal) return { error: 'not from there' };
      if (w.live) this.discharge(u, w);
      const roll = this.rng.int(w.dmg[0], w.dmg[1]);
      const dealt = target.prop
        // a thing has no guard and does not flinch; what matters is whether the
        // weapon is any good at taking things apart
        ? Math.max(0, roll * (w.breach || 1))
        : Math.max(0, roll - target.guard - (target.bracing ? 2 : 0));
      target.hp -= dealt;
      if (w.nerve && !target.prop) this.shake(target, w.nerve);
      this.say(target.prop
        ? `${u.name} puts the ${w.name} through the ${target.name}.`
        : dealt
          ? `${u.name} — ${w.name} — ${target.name} takes ${dealt}.`
          : w.dmg[1] === 0
            ? `${u.name} levels the ${w.name} at ${target.name}, who does not know it is empty.`
            : `${u.name} swings the ${w.name} at ${target.name}. Nothing in it.`);
      if (target.hp <= 0) this.down(target);
      else if (w.effect) this.applyEffect(w.effect, u, target);
    } else if (action.kind === 'move') {
      u.row = action.row;
      this.say(`${u.name} moves to the ${u.rowName}.`);
    } else if (action.kind === 'guard') {
      u.bracing = true;
      u.nerve = Math.min(u.maxNerve, u.nerve + 3);
      u._shookThisRound = true;              // bracing is not "left alone"
      this.say(`${u.name} braces, and gets a grip.`);
    }

    this.advance();
    return this.over;
  }

  // A body on the ground is the loudest thing that can happen in a scuffle.
  // Everyone still on that side loses nerve for it — which is why breaking one
  // person often routs the rest, and why it is never free.
  // A live round is the loudest thing that can happen anywhere in this game.
  // It is counted, everyone on the board hears it, and consequence() charges
  // for it afterwards — nothing here scores it, per canon's no-morality-meter.
  discharge(actor, w) {
    this.fired += 1;
    this.say(`${actor.name} fires the ${w.name}. Half of Kallio just heard that.`);
    for (const side of ['you', 'them']) {
      for (const u of this.living(side)) if (u.id !== actor.id) this.shake(u, 1);
    }
  }

  down(target) {
    target.downed = true;
    if (target.prop) { this.say(`The ${target.name} comes apart.`); return; }
    this.say(`${target.name} goes down.`);
    this.broke = true;                       // somebody was hurt in this fight
    for (const u of this.living(target.side)) this.shake(u, 3);
    for (const u of this.living(target.side === 'you' ? 'them' : 'you')) this.shake(u, 1);
  }

  // Nerve loss can cascade: somebody walking out shakes the people they leave
  // behind, which is how breaking one man's will can empty a corner without a
  // hand laid on anyone. Done as a queue rather than recursion so a chain
  // cannot blow the stack.
  shake(unit, n) {
    const queue = [[unit, n]];
    while (queue.length) {
      const [u, amount] = queue.shift();
      if (!u.alive) continue;
      u.nerve = Math.max(0, u.nerve - amount);
      u._shookThisRound = true;
      if (u.nerve > 0 || u.hp <= 0) continue;
      u.fled = true;
      this.say(`${u.name} has had enough and walks out of it.`);
      for (const mate of this.living(u.side)) queue.push([mate, 1]);
    }
  }

  // A win where a shot was fired is never "routed", whoever is still standing:
  // the noise is the thing that gets remembered.
  resolveWin() { return (this.broke || this.fired) ? 'win' : 'routed'; }

  // Their side's appetite for this, 0..1 — what STAND DOWN is offered against.
  resolveOf(side) {
    const us = this.living(side);
    if (!us.length) return 0;
    return us.reduce((s, u) => s + u.nerve / u.maxNerve, 0) / us.length;
  }

  // The return-to-safety move. The BUTTON is available every round and never
  // greys out — timshel, the choice stays open to the last turn — but whether
  // they TAKE it depends on whether their will is actually broken. At 0.55
  // they capitulated on round two and the fight never happened.
  canStandDown() { return !this.over && this.resolveOf('them') < 0.38; }

  standDown() {
    if (this.over) return this.over;
    if (!this.canStandDown()) {
      this.say('You offer them the out. Nobody moves — they are not finished yet.');
      this.advance();
      return this.over;
    }
    for (const u of this.living('them')) u.fled = true;
    this.over = this.resolveWin();
    this.say('You offer them the out, and they take it. Everybody walks away on their own feet.');
    return this.over;
  }

  // Formation-breakers. These are the point: taking a shape away beats
  // out-damaging, because a pistol stranded in the front row is a spectator.
  applyEffect(effect, actor, target) {
    if (target.prop) return;       // a barrier does not back off
    if (effect === 'shove' || effect === 'fear') {
      const r = target.row + 1;
      if (r < this.rows && !this.at(target.side, target.col, r)) {
        target.row = r;
        this.say(effect === 'fear'
          ? `${target.name} backs off the gun, into the ${target.rowName}.`
          : `${target.name} is driven into the ${target.rowName}.`);
      } else if (effect === 'fear' && target.row === this.rows - 1) {
        // Nowhere left to back into. This USED to shake harder, which was both
        // a one-shot bug (4 from the weapon + 3 here beat a 6-nerve unit) and
        // backwards: a cornered man is exactly the one who starts to suspect
        // the gun is empty. Cornering makes it weaker, not stronger.
        this.shake(target, 1);
      }
    } else if (effect === 'pull') {
      const r = target.row - 1;
      if (r >= 0 && !this.at(target.side, target.col, r)) {
        target.row = r;
        this.say(`${target.name} is dragged into the ${target.rowName}.`);
      }
    }
  }

  advance() {
    this.turn += 1;
    if (!this.actor) {
      this.round += 1;
      // Steadying happens ONCE A ROUND, not once an action. advance() runs per
      // action, so regenerating here-per-call handed every unit one point per
      // enemy on the board and fear could never land at all.
      for (const u of this.units) {
        if (!u.alive) continue;
        if (u._shookThisRound) u._shookThisRound = false;
        else u.nerve = Math.min(u.maxNerve, u.nerve + 1);
      }
      this.rollOrder();
    }
    const you = this.living('you').length, them = this.living('them').length;
    if (!them) {
      // WHICH win matters more than the win: routed means nobody was hurt
      this.over = this.resolveWin();
      this.say(this.broke
        ? 'That is the end of that. Somebody is going to need a doctor.'
        : 'They are gone, and everybody still has their teeth.');
    } else if (!you) { this.over = 'lose'; this.say('You are done here.'); }
    else if (this.round > 20) { this.over = this.living('you').length >= this.living('them').length ? this.resolveWin() : 'lose'; }
  }

  // ── the resolver both sides use ───────────────────────────────────────
  // Auto-battler and the opposition run the SAME function, so auto can never
  // be a secretly worse or better player than the enemy.
  choose(unit) {
    const opts = this.options(unit);
    const attacks = opts.filter(o => o.kind === 'attack');
    if (attacks.length) {
      let best = null, bestScore = -Infinity;
      for (const a of attacks) {
        const w = WEAPONS[a.weapon];
        for (const tid of a.targets) {
          const t = this.byId(tid);
          const avg = (w.dmg[0] + w.dmg[1]) / 2;
          // finish what is nearly down; value a formation-breaker on anything
          // standing where its own weapons work
          let s = avg + (t.hp <= avg ? 6 : 0);
          if (t.prop) {
            // cover is worth breaking, but only once nothing softer is on offer
            s = (avg * (w.breach || 1)) / 2 - 4 + (t.hp <= avg * (w.breach || 1) ? 3 : 0);
            if (s > bestScore) { bestScore = s; best = { kind: 'attack', weapon: a.weapon, target: tid }; }
            continue;
          }
          // The auto-battler will not reach for a gun while anything else is in
          // range. Restraint has to be the default of the resolver too, or
          // handing the fight to AUTO quietly plays a different game.
          if (w.live) s -= 12;
          // a target already close to walking out is worth frightening, not hitting
          if (w.nerve && t.nerve <= w.nerve) s += 7;
          else s += (w.nerve || 0) * 0.8;
          if (w.effect === 'fear' || w.effect === 'shove') s += t.row === 0 ? 1 : 4;
          if (w.effect === 'pull') s += t.row >= 1 ? 4 : 0;
          s -= t.guard * 0.5;
          if (s > bestScore) { bestScore = s; best = { kind: 'attack', weapon: a.weapon, target: tid }; }
        }
      }
      if (best) return best;
    }
    // nothing reaches from here: step toward a row where a weapon works
    const wants = unit.weapons.map(id => WEAPONS[id]).flatMap(w => w.from);
    // nerve going and nothing in reach: get a grip rather than shuffle
    if (unit.nerve <= unit.maxNerve * 0.4) return { kind: 'guard' };
    const move = opts.filter(o => o.kind === 'move')
      .sort((a, b) => (wants.includes(a.row) ? -1 : 1) - (wants.includes(b.row) ? -1 : 1))[0];
    if (move && wants.includes(move.row)) return move;
    return move || { kind: 'guard' };
  }

  // The auto-battler must know about all THREE exits, not just elimination.
  // Offering the out is a player-side verb — the opposition never does it —
  // and without this, auto could only ever win by putting people down, which
  // makes the whole restraint design invisible to anyone who uses it.
  autoTurn() {
    const u = this.actor;
    if (!u) return this.over;
    if (u.side === 'you' && this.canStandDown()) return this.standDown();
    return this.act(this.choose(u));
  }

  // Always available, always honest about the cost — the brief's rule that
  // walking away and paying are never worse than a losing brawl.
  flee() { this.over = 'fled'; this.say('You go out through the yards. Whatever was in your hands stays behind.'); return this.over; }
  pay() { this.over = 'paid'; this.say('Paid, and nothing happened. Which is what paying buys.'); return this.over; }

  // What the next actor is about to do — the telegraph, in a rank fight, is
  // the board plus this line.
  intent() {
    const u = this.actor;
    if (!u || this.over) return '';
    if (u.side === 'you') return `${u.name}, ${u.rowName}.`;
    const a = this.choose(u);
    if (a.kind === 'attack') {
      const t = this.byId(a.target);
      const w = WEAPONS[a.weapon].name;
      return t.prop
        ? `${u.name} is going at the ${t.name} with the ${w}.`
        : `${u.name} is lining up the ${w} on ${t.name}.`;
    }
    if (a.kind === 'move') return `${u.name} is shifting to the ${ROW_NAME[a.row]}.`;
    return `${u.name} is bracing.`;
  }
}

// ── rosters ─────────────────────────────────────────────────────────────
// Kept small and hand-cut. Who the player's other fighters are is an open
// question in FIGHT_BRIEF.md §10 — this fields a fixed pair until it is answered.
//
// NOBODY in here carries a live firearm, and that is a rule the gate enforces
// rather than a coincidence: guns exist in this city, but a gun in a fight is
// something the player brought.
export const OPPONENTS = {
  mccormick: {
    name: 'the McCormicks', size: 3, pay: 400,
    arena: 'harbour',
    // pallets and a crate at the wholesale end — soft cover, all of it
    cover: [
      { kind: 'crate', side: 'them', col: 2, row: 0 },
      { kind: 'crate', side: 'you', col: 0, row: 0 },
    ],
    open: 'Three of the brothers are waiting where the line comes out. They are not in a hurry, which is the worrying part.',
    win: 'They sit down on the kerb, more surprised than hurt.',
    lose: 'You wake up against a wall with your pockets lighter and the evening gone.',
    payLine: 'He takes it, counts it, and holds the door for you. Family rates.',
    roster: [
      { id: 'm1', name: 'Sean', col: 1, row: 0, hp: 12, nerve: 10, speed: 5, guard: 1, weapons: ['bat', 'fists'] },
      { id: 'm2', name: 'Declan', col: 0, row: 0, hp: 10, nerve: 7, speed: 6, weapons: ['fists'] },
      { id: 'm3', name: 'Quiet', col: 1, row: 2, hp: 8, nerve: 5, speed: 4, weapons: ['blank'] },
    ],
  },
  collector: {
    name: "Igor's men", size: 3, pay: 700,
    arena: 'court',
    // the barrier is HARD, and it is standing in front of the man with the
    // blank gun: that lane is shut until somebody takes it apart
    cover: [
      { kind: 'barrier', side: 'them', col: 2, row: 0 },
      { kind: 'bin', side: 'them', col: 0, row: 0 },
      { kind: 'bin', side: 'you', col: 2, row: 0 },
    ],
    open: 'Two men you have seen in the back booth are at the top of the stairs, and a third is already behind you.',
    win: 'They step aside. It is not mercy, it is arithmetic — you are worth more walking.',
    lose: 'They take what you are carrying and tell you the number has gone up.',
    payLine: 'The money goes into a coat pocket. Nothing is written down, which is worse.',
    roster: [
      { id: 'c1', name: 'Big', col: 1, row: 0, hp: 12, nerve: 10, speed: 3, guard: 1, weapons: ['steel', 'fists'] },
      { id: 'c2', name: 'Driver', col: 0, row: 1, hp: 9, nerve: 8, speed: 7, weapons: ['hook', 'bottle'] },
      { id: 'c3', name: 'Coat', col: 2, row: 2, hp: 8, nerve: 6, speed: 5, weapons: ['blank'] },
    ],
  },
  rival: {
    name: 'the other crew', size: 2, pay: 200,
    arena: 'park',
    // Karhupuisto: a bike rack and the plinth. The HARD cover is on your side
    // deliberately — a boulder in front of their blank gun shut that lane and
    // took the bloodless rout off the table against the weakest crew, which is
    // the one rung of the moral ladder that has to stay climbable. Igor's men
    // are the ones who get to choose their ground.
    cover: [
      { kind: 'rack', side: 'them', col: 2, row: 0 },
      { kind: 'rock', side: 'you', col: 0, row: 0 },
    ],
    open: 'Two who work the same square have decided there is one of you too many on it.',
    win: 'They go back down the steps without a word.',
    lose: 'You lose the argument and most of what you were carrying.',
    payLine: 'He takes the money and the corner. For tonight.',
    roster: [
      { id: 'r1', name: 'Loud', col: 1, row: 0, hp: 10, nerve: 6, speed: 6, weapons: ['bottle', 'fists'] },
      { id: 'r2', name: 'Mate', col: 2, row: 1, hp: 8, nerve: 5, speed: 5, weapons: ['blank'] },
    ],
  },
};

export const YOUR_CREW = [
  { id: 'y1', name: 'Aatami', col: 1, row: 0, hp: 14, nerve: 11, speed: 6, weapons: ['fists', 'bat', 'steel'] },
  { id: 'y2', name: 'Jaska', col: 0, row: 1, hp: 9, nerve: 7, speed: 5, weapons: ['bottle', 'hook'] },
  { id: 'y3', name: 'Reko', col: 2, row: 2, hp: 8, nerve: 6, speed: 4, weapons: ['blank'] },
];

export function startFight(kind, seed, crewSize = 3) {
  const o = OPPONENTS[kind];
  const f = new Fight({
    you: YOUR_CREW.slice(0, crewSize),
    them: o.roster.slice(0, o.size),
    cover: o.cover || [],
    seed,
  });
  f.kind = kind;
  f.foe = o;
  f.say(o.open);
  return f;
}

// What an outcome costs, applied by main.js against the market.
//
// `fight` is optional and carries the one thing an outcome word cannot: whether
// a live round went off. A shot is the most expensive thing in the game and it
// is charged on TOP of however the fight ended — including a win, and including
// one you then paid your way out of.
export function consequence(outcome, foeKind, fight = null) {
  const o = OPPONENTS[foeKind];
  const shots = fight?.fired || 0;
  const base = baseConsequence(outcome, o);
  if (!shots) return base;
  return {
    ...base,
    heat: Math.max(base.heat, 0.45) + 0.12 * (shots - 1),
    trust: Math.min(base.trust, 0) - 3,
    shots,
    line: base.line + ' A gun went off on a Kallio street, and that is the only part anybody will repeat.',
  };
}

function baseConsequence(outcome, o) {
  switch (outcome) {
    // Routed: you won and nobody is bleeding. Costs almost nothing, and the
    // people who saw it think BETTER of you. This is the design arguing for
    // restraint with the only currencies canon allows — heat and trust.
    case 'routed': return { cash: 0, stockLoss: 0, heat: 0.02, trust: +1, line: 'They went home on their own feet. That gets round the square too.' };
    case 'win': return { cash: 0, stockLoss: 0, heat: 0.14, trust: -1, line: 'Word goes round the square that you do not fold. Word also goes round about the ambulance.' };
    case 'lose': return { cash: -Math.round(o.pay * 0.6), stockLoss: 0.5, heat: 0.18, trust: -1, line: 'It costs you, and it is seen.' };
    case 'paid': return { cash: -o.pay, stockLoss: 0, heat: 0, trust: +1, line: 'Paid, and nothing happened. Which is what paying buys.' };
    case 'fled': return { cash: 0, stockLoss: 0.35, heat: 0.05, trust: 0, line: 'You keep your teeth and lose the load.' };
    default: return { cash: 0, stockLoss: 0, heat: 0, trust: 0, line: '' };
  }
}
