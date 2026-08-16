// Piritori to Eden — orchestration. market.js owns the numbers, map.js owns
// the picture; this file owns the DOM, the overlays and the clock between
// them. window.__pt is the smoke test's way in.

import { GOODS, ANCHOR, CHANNEL, stationLabel } from './data.js?v=1';
import { STATIONS } from './data.js?v=1';
import * as M from './market.js?v=1';
import { MetroMap } from './map.js?v=1';
import { PAL } from './palette.js?v=1';

const $ = id => document.getElementById(id);
const eur = n => `${Math.round(n).toLocaleString('fi-FI')} €`;

let run = null;
let qty = 1;                 // 1 | 10 | 'max'
const map = new MetroMap($('map'));

// ── overlays ────────────────────────────────────────────────────────────
function show(id) { $(id).hidden = false; const b = $(id).querySelector('.btn'); if (b) b.focus({ preventScroll: true }); }
function hide(id) { $(id).hidden = true; }
const anyVeil = () => ['story', 'bulletin', 'modal'].some(id => !$(id).hidden) || !$('title').hidden;

function showStory(beat, { kicker = `evening ${run.day} / ${run.maxDay}`, worth = null, btn = 'CONTINUE', then = null } = {}) {
  $('storykicker').textContent = kicker;
  $('storytitle').textContent = beat.title;
  $('storylines').innerHTML = '';
  for (const l of beat.lines) {
    const p = document.createElement('p'); p.textContent = l; $('storylines').append(p);
  }
  $('storyworth').hidden = worth === null;
  if (worth !== null) $('storyworth').textContent = worth;
  $('storybtn').textContent = btn;
  $('storybtn').onclick = () => { hide('story'); if (then) then(); };
  show('story');
}

function showModal(title, text, buttons) {
  $('modaltitle').textContent = title;
  $('modaltext').textContent = text;
  const row = $('modalbtns'); row.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'btn wide' + (b.prime ? ' prime' : '');
    el.textContent = b.label;
    el.onclick = () => { hide('modal'); if (b.then) b.then(); };
    row.append(el);
  }
  show('modal');
}

// ── render ──────────────────────────────────────────────────────────────
function render() {
  if (!run) return;
  const here = M.stationById(run.at);
  $('loc').textContent = here.name;
  $('sub').textContent = here.sub;
  $('date').textContent = `kesäkuu 2003 · evening ${Math.min(run.day, run.maxDay)}/${run.maxDay}`;
  $('cash').textContent = eur(run.cash);
  $('debt').textContent = eur(run.debt);
  $('stash').textContent = `${M.stashUsed(run)}/${run.cap}`;
  $('heat').textContent = heatWord(run.heat);
  $('blurb').textContent = here.blurb;
  $('tickertext').textContent = run.news ? run.news.text : '';

  // the counter
  const tb = $('market'); tb.innerHTML = '';
  for (const g of GOODS) {
    const price = M.priceAt(run, g.id);
    const tr = document.createElement('tr');
    const own = run.stash[g.id];
    const n = qty === 'max' ? 999 : qty;
    tr.innerHTML = `
      <td class="good">${g.name} <span class="unit">/ ${g.unit}</span></td>
      <td class="price">${price} €</td>
      <td class="own">own ${own}</td>
      <td class="deal"></td>`;
    const deal = tr.querySelector('.deal');
    const bb = document.createElement('button');
    bb.type = 'button'; bb.className = 'btn buy'; bb.textContent = 'BUY';
    bb.disabled = run.cash < price || M.stashUsed(run) >= run.cap;
    bb.onclick = () => { M.buy(run, g.id, n); render(); };
    const sb = document.createElement('button');
    sb.type = 'button'; sb.className = 'btn sell'; sb.textContent = 'SELL';
    sb.disabled = own <= 0;
    sb.onclick = () => { M.sell(run, g.id, n); render(); };
    deal.append(bb, sb);
    tb.append(tr);
  }

  // specials + the ledger
  const sp = $('specialbtn');
  const labels = {
    ramen: 'RAMEN & RUMOURS · 10 €', mccormick: 'TALK TO THE McCORMICKS',
    sit: 'SIT A WHILE', jaska: 'FIND JASKA', igor: 'THE BACK BOOTH',
  };
  if (here.special && !run.over) {
    sp.hidden = false;
    sp.textContent = labels[here.special];
    sp.disabled = run.usedSpecial;
  } else sp.hidden = true;
  $('paybtn').textContent = `PAY IGOR (${eur(Math.min(run.cash, Math.ceil(run.debt)))})`;
  $('paybtn').disabled = run.debt <= 0 || run.cash <= 0;

  $('log').innerHTML = '';
  for (const l of run.log.slice(0, 6)) {
    const d = document.createElement('div'); d.textContent = l; $('log').append(d);
  }
  document.title = `Piritori to Eden · evening ${Math.min(run.day, run.maxDay)}`;
}

function heatWord(h) {
  return h < 12 ? 'cold' : h < 25 ? 'warm' : h < 45 ? 'hot' : 'burning';
}

// ── the clock ───────────────────────────────────────────────────────────
function travelTo(id) {
  if (!run || run.over || anyVeil()) return;
  const ev = M.travel(run, id);
  render();
  if (run.over) return endSeason();
  if (run.story) {
    const beat = run.story;
    showStory(beat, { then: () => ev && handleEvent(ev) });
  } else if (ev) handleEvent(ev);
}

function handleEvent(ev) {
  if (ev.type === 'police') {
    showModal('KONTROLLI', ev.text, [
      { label: `PAY THE EVENING TAX (${eur(ev.bribe)})`, then: () => { const r = M.resolvePolice(run, 'bribe'); render(); showModal('KONTROLLI', r.text, [{ label: 'CONTINUE', prime: true }]); } },
      { label: 'RUN THROUGH THE YARDS', then: () => { const r = M.resolvePolice(run, 'run'); render(); if (run.over) { showModal('KONTROLLI', r.text, [{ label: 'CONTINUE', prime: true, then: endSeason }]); } else showModal('KONTROLLI', r.text, [{ label: 'CONTINUE', prime: true }]); } },
    ]);
  } else if (ev.type === 'mugged') {
    render();
    showModal('JUMPED', ev.text, [{ label: 'CONTINUE', prime: true }]);
  }
}

function doSpecial() {
  const r = M.special(run);
  render();
  if (r) showModal(M.stationById(run.at).name.toUpperCase(), r.text, [{ label: 'CONTINUE', prime: true }]);
}

function endSeason() {
  const best = Math.max(run.over.worth ?? 0, Number(localStorage.getItem('piritoriBest') || 0));
  localStorage.setItem('piritoriBest', String(best));
  showStory(run.over, {
    kicker: 'the season ends',
    worth: `net worth ${eur(run.over.worth)} · best ${eur(best)}`,
    btn: 'PLAY THE SEASON AGAIN',
    then: () => start(),
  });
}

// ── boot ────────────────────────────────────────────────────────────────
function start(seed) {
  run = M.newRun(seed);
  hide('story'); hide('bulletin'); hide('modal');
  render();
  if (run.story) showStory(run.story, { kicker: 'chapter one' });
}

$('startbtn').addEventListener('click', () => { $('title').hidden = true; start(); });

$('map').addEventListener('pointerup', e => {
  const r = $('map').getBoundingClientRect();
  const id = map.hit(e.clientX - r.left, e.clientY - r.top);
  if (id) travelTo(id);
});

addEventListener('resize', () => map.resize());

$('ticker').addEventListener('click', () => {
  if (!run || !run.news) return;
  $('channel').textContent = CHANNEL;
  $('anchorname').textContent = ANCHOR;
  $('bulletintext').textContent = run.news.text;
  drawAnchor();
  show('bulletin');
});
$('bulletinbtn').addEventListener('click', () => hide('bulletin'));

for (const b of document.querySelectorAll('.qty')) {
  b.addEventListener('click', () => {
    qty = b.dataset.q === 'max' ? 'max' : Number(b.dataset.q);
    for (const o of document.querySelectorAll('.qty')) o.setAttribute('aria-pressed', String(o === b));
    render();
  });
}

$('specialbtn').addEventListener('click', doSpecial);
$('paybtn').addEventListener('click', () => { M.payDebt(run, run.cash); render(); });

addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const id of ['bulletin', 'modal']) if (!$(id).hidden) { hide(id); return; }
});

// the anchor, 32×32, drawn not photographed: grey suit, steady tie, the
// haircut of a man who has read the nine o'clock news since before you
function drawAnchor() {
  const c = $('anchorface').getContext('2d');
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(0, 0, 32, 32, '#0a1420');                    // studio blue-black
  px(2, 2, 28, 2, '#12283c');                     // set light
  px(9, 6, 14, 13, '#d8c8a8');                    // face
  px(9, 4, 14, 3, '#8a8a92');                     // the grey haircut
  px(8, 5, 2, 4, '#8a8a92'); px(22, 5, 2, 4, '#8a8a92');
  px(11, 10, 3, 2, '#20242c'); px(18, 10, 3, 2, '#20242c'); // steady eyes
  px(14, 15, 4, 1, '#a08868');                    // the mouth, level
  px(6, 19, 20, 13, '#3a4250');                   // the suit
  px(13, 19, 6, 13, '#e8e4da');                   // shirt
  px(15, 19, 2, 10, '#7a2830');                   // the tie
  px(2, 26, 5, 4, '#12283c'); px(25, 26, 5, 4, '#12283c'); // desk corners
}

// ── the loop ────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  map.draw(run, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ── the way in for tests ────────────────────────────────────────────────
window.__pt = {
  get run() { return run; },
  market: M,
  stations: STATIONS,
  debug: {
    start: s => { $('title').hidden = true; start(s); },
    travel: id => travelTo(id),
    closeVeils: () => { hide('story'); hide('bulletin'); hide('modal'); },
    setCash: n => { run.cash = n; render(); },
    setDay: n => { run.day = n; render(); },
    render,
  },
};
