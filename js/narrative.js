// Contacts, trust and the ending matrix.
//
// House rules from the brief, all of them load-bearing: one to three lines per
// event, every line anchored to a person or a place already on the map, no
// codex, no narrator, and no good/evil meter — trust shows in what people DO,
// offer or refuse. Everything here is invented; the districts are real, nobody
// in them is.

export const CONTACTS = [
  {
    id: 'jaska', name: 'Jaska', at: 'karhupuisto', start: 3,
    role: 'your brother. Paints. Does not ask what the jacket is for.',
    gift: 'cools the square', // lowers node failure pressure where he sits
  },
  {
    id: 'toko', name: 'Toko Slomo', at: 'vaasankatu', start: 2,
    role: 'noodle chef. Hears every kitchen on the street before you do.',
    gift: 'names tomorrow\'s shock',
  },
  {
    id: 'sean', name: 'Sean McCormick', at: 'kuudeslinja', start: 1,
    role: 'the bar family. Sells muscle, steel and the benefit of the doubt.',
    gift: 'one line runs unwatched',
  },
  {
    id: 'igor', name: 'Igor', at: 'sornainen', start: 0,
    role: 'holds the paper on you. Never raises his voice.',
    gift: 'takes the money and the evening',
  },
];

export const LINES = {
  open: [
    'Aatami Taskila. One jacket, one debt, one square.',
    'Igor fronted two thousand and smiled like a door closing.',
    'The book your mother left has one word underlined through the page. Sinä saat.',
  ],
  close_edge: at => [`${at} is shut. Somebody in a coat is writing down faces.`],
  slow_edge: at => [`Works on ${at}. Everything is twenty minutes older than it was.`],
  surge: at => [`Half the city wants to be at ${at} tonight. Nobody says why.`],
  warn: at => [`Sean rings. "That line of yours, Finn. It has a shape now."`],
  inspect: at => [`They took ${at} for the night. Nothing found. Nothing needed finding.`],
  abandoned: ['Somebody waited at the square until waiting stopped being worth it.'],
  choice: {
    text: 'Jaska is on the bench with charcoal on his hands. "There is a road out of this park," he says, "and a road further in. They look the same at night."',
    options: [
      { id: 'sit', label: 'Sit down with him', trust: +2, cash: 0 },
      { id: 'work', label: 'Say you are working', trust: -1, cash: 120 },
    ],
  },
};

export class Cast {
  constructor() {
    this.trust = Object.fromEntries(CONTACTS.map(c => [c.id, c.start]));
    this.met = new Set();
  }
  nudge(id, n) { this.trust[id] = Math.max(-3, Math.min(5, (this.trust[id] ?? 0) + n)); }
  get intact() { return CONTACTS.filter(c => (this.trust[c.id] ?? 0) >= 2).length; }
  // What a contact will do for you is the meter. There is no other one.
  offers(id) { return (this.trust[id] ?? 0) >= 3; }
}

// Mission goals — pinned to the map, each one openable for its detail. A goal
// names a place, what is wanted there, and how to read whether it is done;
// main.js evaluates `done` against live state every paint.
export const MISSIONS = [
  {
    id: 'debt', at: 'sornainen', title: 'Clear the paper',
    text: 'Igor holds two thousand plus interest, and interest works nights. Clear it before the last settlement — the back booth takes payment any evening.',
    done: s => s.debt <= 0,
  },
  {
    id: 'network', at: 'vaasanaukio', title: 'Feed the square',
    text: 'Nothing moves until a line calls at the square. Draw one, keep it quiet, and land a consignment while the price is still standing.',
    done: s => s.landed > 0,
  },
  {
    id: 'exit', at: 'hakaniemi', title: 'The way out',
    text: 'Three thousand, banked where you cannot spend it, buys the life this was supposed to be for. It is south of here, past the hall, off this map.',
    done: s => s.exitFund >= 3000,
  },
  {
    id: 'jaska', at: 'karhupuisto', title: 'Keep your brother',
    text: 'Jaska sits by the bear with charcoal on his hands. Endings where somebody still knows you require somebody still knowing you.',
    done: s => s.jaskaTrust >= 3,
  },
];

// The matrix, not a score: debt cleared, exit fund reached, heat, relationships.
export function ending({ debtCleared, exitReached, heat, intact }) {
  if (!debtCleared && heat > 0.7) return {
    id: 'collected', title: 'IGOR COLLECTS',
    lines: [
      'The back booth at Sörnäinen. He does not raise his voice; men like Igor never have to.',
      'What you owe, you work off. The jacket is his, the square is his, the evenings are his.',
      'From the bridge you can see Karhupuisto, small and green and impossibly far.',
    ],
  };
  if (!debtCleared) return {
    id: 'owing', title: 'STILL OWING',
    lines: [
      'The season ends with the number still on the paper, smaller and still there.',
      'Igor is patient the way weather is patient.',
    ],
  };
  if (exitReached && intact >= 2) return {
    id: 'eden', title: 'EAST OF THE SQUARE',
    lines: [
      'You pay him in a bar-napkin fold and he nods like a border opening.',
      'Pasila. A flat over the rail yard, and two boys asleep in the next room.',
      'You are out. You tell yourself you are out.',
    ],
  };
  if (exitReached) return {
    id: 'alone', title: 'OUT, AND ALONE',
    lines: [
      'The fund is full. The flat is real. Nobody comes to see it.',
      'Jaska\'s number rings out. You let it.',
      'Sinä saat, the book said. It never said what it would cost.',
    ],
  };
  return {
    id: 'season', title: 'ANOTHER SEASON',
    lines: [
      'Debt cleared. That is all that cleared.',
      'The square in September rain looks exactly like the square in June rain.',
      'Jaska paints you standing on it, and does not show you the painting.',
    ],
  };
}
