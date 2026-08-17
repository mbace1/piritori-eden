// Turn-based encounters.
//
// OWNER OVERRIDE, 2026-08-17: BRIEF.md § "no combat layer" and CLAUDE_HANDOFF
// § "Piritori has no combat layer" both forbid this; the owner has asked for
// turn-based fights, so they are in. Recorded here rather than argued, but
// recorded, because the brief still reads the other way.
//
// The brief's surrounding rules DO still hold and they shape this:
//   · no random punishment without a readable warning — so the opponent
//     TELEGRAPHS next turn's intent and you answer it;
//   · rerouting, paying and walking away are real options, never worse than a
//     losing brawl;
//   · nobody is a faceless combat target and there are no guns as prizes.
// It is a reading test on a three-beat clock, not a damage race: guard beats
// swing, swing beats grab, grab beats guard. You lose by not looking.

import { Rng } from '../../flow-core/rng.js?v=1';

export const INTENT = {
  SWING: { id: 'swing', tell: 'shifts his weight onto his back foot' },
  GRAB: { id: 'grab', tell: 'steps in close, hands open' },
  HOLD: { id: 'hold', tell: 'plants himself and waits' },
};

// what you may do, and what it answers
export const MOVES = [
  { id: 'guard', label: 'GUARD', beats: 'swing', tell: 'you cover up' },
  { id: 'swing', label: 'SWING', beats: 'grab', tell: 'you go first' },
  { id: 'shove', label: 'SHOVE', beats: 'hold', tell: 'you drive him back' },
];

export const OPPONENTS = {
  mccormick: {
    name: 'A McCormick', grit: 6, hit: 2,
    open: 'One of the brothers is waiting where the line comes out. He is not in a hurry, which is the worrying part.',
    win: 'He sits down on the kerb, more surprised than hurt. "Right," he says. "Right."',
    lose: 'You wake up against a wall with your pockets lighter and the evening gone.',
    pay: 400,
    payLine: 'He takes it, counts it, and holds the door for you. Family rates.',
  },
  collector: {
    name: 'Igor\'s man', grit: 8, hit: 3,
    open: 'A man you have seen in the back booth is standing at the top of the stairs. He says your name like he is reading it off a list.',
    win: 'He steps aside. It is not mercy — it is arithmetic. You are worth more walking.',
    lose: 'He takes what you are carrying and tells you the number has gone up.',
    pay: 700,
    payLine: 'The money goes into a coat pocket. Nothing is written down, which is worse.',
  },
  rival: {
    name: 'Somebody from the square', grit: 5, hit: 2,
    open: 'Somebody who works the same square has decided there is one of you too many on it.',
    win: 'He goes back down the steps without a word. The square is quiet again for a while.',
    lose: 'You lose the argument and most of what you were carrying.',
    pay: 200,
    payLine: 'He takes the money and the corner. For tonight.',
  },
};

export class Fight {
  constructor(kind, seed) {
    const o = OPPONENTS[kind];
    this.kind = kind;
    this.foe = { ...o };
    this.rng = new Rng(seed, `fight/${kind}`);
    this.grit = 6;              // yours
    this.foeGrit = o.grit;
    this.round = 1;
    this.log = [o.open];
    this.over = null;           // 'win' | 'lose' | 'paid' | 'fled'
    this.intent = this.roll();
  }

  roll() {
    const k = this.rng.next();
    return k < 0.42 ? INTENT.SWING : k < 0.76 ? INTENT.GRAB : INTENT.HOLD;
  }

  // The telegraph. Shown BEFORE the player commits, always.
  tell() { return `${this.foe.name} ${this.intent.tell}.`; }

  play(moveId) {
    if (this.over) return this.over;
    const move = MOVES.find(m => m.id === moveId);
    const answered = move.beats === this.intent.id;

    if (answered) {
      const d = 2 + (this.rng.chance(0.4) ? 1 : 0);
      this.foeGrit -= d;
      this.log.unshift(`You read it. ${move.tell} — he gives ground.`);
    } else if (this.intent.id === 'hold') {
      this.log.unshift('He does not take the bait. Nothing lands, either way.');
    } else {
      this.grit -= this.foe.hit;
      this.log.unshift(`Wrong answer. ${this.foe.name} gets through.`);
    }

    if (this.foeGrit <= 0) { this.over = 'win'; this.log.unshift(this.foe.win); return this.over; }
    if (this.grit <= 0) { this.over = 'lose'; this.log.unshift(this.foe.lose); return this.over; }

    this.round += 1;
    this.intent = this.roll();
    return null;
  }

  // Always available, always honest about the cost. Walking away is a real
  // option, not a punishment — the brief's line about rerouting and sacrificing
  // profit rather than fighting still applies even now that fighting exists.
  flee() {
    this.over = 'fled';
    this.log.unshift('You go down the stairs two at a time and out through the yards. Whatever was in your hands stays behind.');
    return this.over;
  }

  pay() {
    this.over = 'paid';
    this.log.unshift(this.foe.payLine);
    return this.over;
  }
}

// What an outcome costs, applied by main.js against the market.
export function consequence(outcome, foeKind) {
  const o = OPPONENTS[foeKind];
  switch (outcome) {
    case 'win': return { cash: 0, stockLoss: 0, heat: 0.10, trust: -1, line: 'Word goes round the square that you do not fold.' };
    case 'lose': return { cash: -Math.round(o.pay * 0.6), stockLoss: 0.5, heat: 0.18, trust: -1, line: 'It costs you, and it is seen.' };
    case 'paid': return { cash: -o.pay, stockLoss: 0, heat: 0, trust: +1, line: 'Paid, and nothing happened. Which is what paying buys.' };
    case 'fled': return { cash: 0, stockLoss: 0.35, heat: 0.05, trust: 0, line: 'You keep your teeth and lose the load.' };
    default: return { cash: 0, stockLoss: 0, heat: 0, trust: 0, line: '' };
  }
}
