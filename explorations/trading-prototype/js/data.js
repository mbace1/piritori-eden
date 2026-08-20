// Piritori to Eden — chapter one: the square, 2003.
// Everything narrative and geographic lives here: the stations, the lines,
// the goods, the news wire and the story beats. All of it is fiction — the
// places are real Helsinki, the people and every bulletin are invented.

// ── the map ─────────────────────────────────────────────────────────────
// A diagram, not a street map: Mini Metro's rule of 0/45/90° segments on a
// 160×100 design grid. Travel is free-form (any station, one evening);
// the lines are how the night reads, not a pathfinding graph.

export const STATIONS = [
  {
    id: 'piritori', name: 'Piritori', sub: 'Vaasanaukio',
    x: 78, y: 50, icon: 'square', heat: 34,
    bias: { piri: 0.85, buds: 1.0, pills: 0.95 },
    blurb: 'The square. Everyone buys here, everyone is seen here.',
  },
  {
    id: 'kurvi', name: 'Kurvi', sub: 'Hämeentie',
    x: 104, y: 46, icon: 'dot', heat: 22,
    bias: { piri: 1.1, buds: 1.05, pills: 1.0 },
    blurb: 'The bend. Traffic all night, faces you half know.',
  },
  {
    id: 'vaasankatu', name: 'Vaasankatu', sub: 'Toko Slomon ramen',
    x: 92, y: 34, icon: 'bowl', heat: 12,
    bias: { piri: 1.15, buds: 0.95, pills: 1.05 },
    special: 'ramen',
    blurb: 'Steam on the window. Toko Slomo hears everything the Chinese kitchens plan.',
  },
  {
    id: 'kuudeslinja', name: 'Kuudes linja', sub: 'the McCormicks',
    x: 48, y: 66, icon: 'pint', heat: 18,
    bias: { piri: 1.2, buds: 1.15, pills: 1.25 },
    special: 'mccormick',
    blurb: 'Irish bar money. The brothers sell protection, hard steel and blank guns.',
  },
  {
    id: 'kirkko', name: 'Kallion kirkko', sub: 'the grey tower',
    x: 40, y: 40, icon: 'spire', heat: 4,
    bias: { piri: 1.3, buds: 1.2, pills: 1.3 },
    special: 'sit',
    blurb: 'The bells carry over the whole district. Nobody deals in its shadow.',
  },
  {
    id: 'karhupuisto', name: 'Karhupuisto', sub: 'the bear statue',
    x: 62, y: 34, icon: 'dot', heat: 14,
    bias: { piri: 1.05, buds: 0.8, pills: 1.1 },
    special: 'jaska',
    blurb: 'Grass, guitars, your brother sketching people who do not know it.',
  },
  {
    id: 'hakaniemi', name: 'Hakaniemi', sub: 'the market hall',
    x: 25, y: 80, icon: 'dot', heat: 20,
    bias: { piri: 1.1, buds: 1.1, pills: 0.85 },
    blurb: 'Union flags and restaurant kitchens. The Chinese families are buying doors here.',
  },
  {
    id: 'sornainen', name: 'Sörnäinen', sub: 'metro',
    x: 118, y: 70, icon: 'metro', heat: 26,
    bias: { piri: 0.75, buds: 0.9, pills: 0.8 },
    special: 'igor',
    blurb: 'Where the wholesale comes up from the harbour. Igor drinks in the back booth.',
  },
];

// Polylines on the same grid; every bend is 0/45/90. Drawn fat, metro-style.
export const LINES = [
  { id: 'metro', color: 'METRO', pts: [[25, 80], [48, 80], [78, 50], [98, 50], [118, 70]] },
  { id: 'tram9', color: 'TRAM', pts: [[40, 40], [56, 40], [62, 34], [92, 34], [104, 46], [104, 56], [118, 70]] },
  { id: 'tram3', color: 'LINJA', pts: [[25, 80], [34, 80], [48, 66], [48, 48], [40, 40]] },
  { id: 'tram8', color: 'SPUR', pts: [[62, 34], [78, 50]] },
];

// ── the goods ───────────────────────────────────────────────────────────
// Numbers are a market abstraction, nothing more. `min`/`max` bound the
// city-wide base price; per-station bias and events move it from there.
export const GOODS = [
  { id: 'piri', name: 'piri', unit: 'g', min: 14, max: 46, start: 24, drift: 0.22 },
  { id: 'buds', name: 'buds', unit: 'g', min: 7, max: 16, start: 10, drift: 0.12 },
  { id: 'pills', name: 'pills', unit: 'kpl', min: 3, max: 11, start: 5, drift: 0.3 },
];

// ── the wire ────────────────────────────────────────────────────────────
// Kanava K, ILTAKATSAUS, read by Arvi Lintu — a newscaster of the old
// school: every word level, every word landing. Bulletins tagged with an
// `effect` move the market the evening AFTER they air; Toko Slomo's tip is
// hearing tomorrow's bulletin tonight.
export const ANCHOR = 'ARVI LINTU';
export const CHANNEL = 'KANAVA K · ILTAKATSAUS';

export const WIRE = [
  // event bulletins — the market movers, drawn by the event engine
  {
    id: 'drought', effect: { good: 'piri', mult: 2.1, days: 3 },
    text: 'Customs report a record seizure in Vuosaari harbour. Street sources describe the eastern supply as, quote, dry as a sauna stove.',
  },
  {
    id: 'shipment', effect: { good: 'piri', mult: 0.5, days: 2 },
    text: 'Police suspect a new route over the eastern border. An officer, off the record: right now it moves cheaper than coffee.',
  },
  {
    id: 'festival', effect: { good: 'pills', mult: 1.9, days: 2 },
    text: 'Twenty thousand expected at the weekend\'s dance event in Suvilahti. Organisers promise, quote, an unforgettable atmosphere.',
  },
  {
    id: 'budscare', effect: { good: 'buds', mult: 1.6, days: 2 },
    text: 'A greenhouse operation raided in Sipoo. Growers association denies any connection to, quote, that kind of gardening.',
  },
  {
    id: 'sweep', effect: null,
    text: 'Helsinki police announce increased evening patrols in Kallio following residents\' complaints. The operation has no announced end date.',
  },
  // colour bulletins — the era, one per quiet evening
  { id: 'c1', text: 'Nokia posts another record quarter. Analysts ask whether a telephone can get any smaller.' },
  { id: 'c2', text: 'The city considers ordering trams in a new colour. Helsinki, say critics, has exactly one correct green.' },
  { id: 'c3', text: 'A Kallio resident has complained to the city about the new parking meters. The meters could not be reached for comment.' },
  { id: 'c4', text: 'Restaurant owners on Vaasankatu report the best summer in years. The street, one says, feeds whoever stands on it long enough.' },
  { id: 'c5', text: 'The euro has been in Finnish pockets for a year. Older residents report still counting in marks, quote, out of respect.' },
  { id: 'c6', text: 'A sculpture proposal for Karhupuisto divides opinion. The bear, sculptors note, was also controversial once.' },
  { id: 'c7', text: 'Text message use among the young reaches new records. Researchers are unsure what everyone has left to say.' },
  { id: 'c8', text: 'The harbour reports quiet nights and full manifests. Everything, says the harbourmaster, is exactly where the papers say it is.' },
];

// ── the story ───────────────────────────────────────────────────────────
// Interstitials, keyed to the evening they open on. Chapter one belongs to
// Aatami; the last card hands the story to his sons. "Sinä saat" is this
// game's timshel — thou mayest.
export const STORY = [
  {
    day: 1, id: 'intro', title: 'KESÄKUU 2003',
    lines: [
      'Aatami Taskila. Twenty-six. One jacket, one debt, one square.',
      'Igor fronted you two thousand and smiled like a door closing. Thirty evenings to turn it into a life — his way, or yours.',
      'Your brother Jaska says the square eats everyone who stands on it. He says it from a bench, drawing the people it is eating.',
      'The old book your mother left had one word underlined so hard the pen went through. Sinä saat. Thou mayest.',
    ],
  },
  {
    day: 8, id: 'jaska', title: 'JASKA',
    lines: [
      'He finds you at the bear statue, smelling of turpentine and rolling papers.',
      '"I sold a painting," he says. "A hundred and twenty euros. You made that while I said the sentence."',
      'He looks at your jacket, the pockets of it, and does not ask.',
      '"There is a road out of this park," he says, "and a road further in. They look the same at night."',
    ],
  },
  {
    day: 15, id: 'toko', title: 'TOKO SLOMO',
    lines: [
      'The ramen shop after close. Toko Slomo pours two bowls of the staff broth, the good one.',
      '"The kitchens in Hakaniemi have new owners," he says. "The families are patient. They buy the building, then the block, then the street."',
      '"You they will not buy. You they will wait out." He slides the bowl over.',
      '"Eat. Patience needs feeding too."',
    ],
  },
  {
    day: 22, id: 'mccormick', title: 'THE McCORMICKS',
    lines: [
      'Six of the brothers in the back room of Kuudes linja, arms like dock rope.',
      'Sean McCormick puts a blank-firing pistol on the table. It looks real because most of it is.',
      '"The square is getting crowded, Finn. Crowded needs friends. Friends," he says, turning the gun barrel toward himself, "cost."',
      'Behind the bar, someone is singing about a green island neither of you has seen.',
    ],
  },
];

// The endings. `min` is net worth (cash − debt + stash at street value).
export const ENDINGS = [
  {
    id: 'eden', min: 20000, title: 'EAST OF THE SQUARE',
    lines: [
      'The last evening. You pay Igor in a bar napkin fold and he nods like a border opening.',
      'Pasila. A flat with a view of the rail yard, two boys asleep in the next room — Kalle, who watches your hands, and Aaro, who watches the trains.',
      'You are out. You tell yourself you are out.',
      'TO BE CONTINUED — 2024. The sons take up the story: one of them the keeper, one of them kept. Cain and Abel, on the same map.',
    ],
  },
  {
    id: 'square', min: 0, title: 'ANOTHER SEASON',
    lines: [
      'You cleared the debt. That is all you cleared.',
      'The square in September rain looks exactly like the square in June rain.',
      'Jaska paints you standing on it. He does not show you the painting.',
      'Sinä saat, the book said. You may. It never said when.',
    ],
  },
  {
    id: 'igor', min: -Infinity, title: 'IGOR COLLECTS',
    lines: [
      'The back booth at Sörnäinen. Igor does not raise his voice. Men like Igor never have to.',
      'What you owe, you will work off. The jacket is his now, the square is his, the evenings are his.',
      'From the metro bridge you can see Karhupuisto, small and green and impossibly far.',
      'Sinä saat, the book said. Not tonight.',
    ],
  },
];

export const BUSTED_ENDING = {
  id: 'busted', title: 'THIRD STRIKE',
  lines: [
    'The third time, they do not even hurry. The van door slides like a curtain.',
    'Two years, out in one. The square will still be there. That is the worst thing about it.',
    'Jaska visits with paper and charcoal. "Draw the window," he says. "It helps."',
    'It does, a little.',
  ],
};
