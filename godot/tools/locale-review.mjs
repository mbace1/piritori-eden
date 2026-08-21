// Every Finnish and Japanese string in the port, beside the English it came from.
//
//   node tools/locale-review.mjs [out.html]
//
// Both packs are DRAFTS. They were written to match the game's register rather
// than translated line by line, by someone who speaks neither language as a
// first language. That is a fine starting point and not a fine shipping state,
// so this exists to make a native read cheap: one page, every triple, grouped
// by namespace, with the questions a reviewer actually has to answer stated at
// the top rather than left implicit.
//
// It reads locale/ui.csv directly — the same file the game compiles and the
// same file tests/test_locale.gd checks — so a line changed in the pack is
// changed here the next time this runs.
//
// What it does NOT do is judge the translations. It cannot. It only lays them
// out and flags the mechanical things a machine genuinely can see: a missing
// entry, a string identical to its English source, a format specifier that
// changed arity or type between languages, and a Japanese line long enough to
// be worth measuring against the button it has to fit inside.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, '..');
const CSV = path.join(PROJECT, 'locale', 'ui.csv');
const OUT = process.argv[2] || path.join(PROJECT, 'locale', 'review.html');

// ── the CSV, parsed properly ────────────────────────────────────────────────
// Quoted fields can contain commas. A split(',') would silently truncate every
// line that has one, and the reviewer would never know they were reading half
// a string.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 && r[0] !== '');
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const header = rows.shift().map(h => h.trim());
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const lang of ['en', 'fi', 'ja']) {
  if (col[lang] === undefined) {
    console.error(`locale-review: ui.csv has no '${lang}' column (found ${header.join(', ')})`);
    process.exit(1);
  }
}

// ── the mechanical checks ───────────────────────────────────────────────────
// printf specifiers, in order. A translation may reorder words freely but it
// may not change what the format string consumes.
const specs = s => (s.match(/%[-+ #0]*[\d.*]*[a-zA-Z]/g) || []);

function notesFor(en, fi, ja) {
  const out = [];
  if (!fi) out.push(['gap', 'no Finnish']);
  if (!ja) out.push(['gap', 'no Japanese']);
  if (fi && fi === en) out.push(['same', 'Finnish is identical to English']);
  if (ja && ja === en) out.push(['same', 'Japanese is identical to English']);
  const e = specs(en).join(' ');
  if (fi && specs(fi).join(' ') !== e) out.push(['fmt', `Finnish format differs: ${specs(fi).join(' ') || '(none)'} vs ${e || '(none)'}`]);
  if (ja && specs(ja).join(' ') !== e) out.push(['fmt', `Japanese format differs: ${specs(ja).join(' ') || '(none)'} vs ${e || '(none)'}`]);
  // A CJK character is roughly twice the advance of a Latin one, so a Japanese
  // string is "long" well before its character count says so.
  const wide = [...(ja || '')].filter(c => c.charCodeAt(0) > 0x2E7F).length;
  if (wide * 2 + ((ja || '').length - wide) > (en.length + 6)) {
    out.push(['wide', 'Japanese is wider than the English — check it fits its control']);
  }
  return out;
}

const groups = new Map();
let counts = { rows: 0, flagged: 0 };
for (const r of rows) {
  const key = r[0];
  const en = r[col.en] ?? '', fi = r[col.fi] ?? '', ja = r[col.ja] ?? '';
  const ns = key.split('.')[0];
  const notes = notesFor(en, fi, ja);
  counts.rows++;
  if (notes.length) counts.flagged++;
  if (!groups.has(ns)) groups.set(ns, []);
  groups.get(ns).push({ key, en, fi, ja, notes });
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const NAMESPACES = {
  ui: 'The shell — the frame around everything, and the least forgiving about length.',
  cmd: 'The five bottom-bar commands. These are BUTTONS: they have a fixed width.',
  verb: 'The LOOK / ACT grammar of an encounter.',
  state: 'A site’s status on the map.',
  battle: 'Formation combat.',
  news: 'The bulletin — the one place the game speaks in a broadcaster’s voice.',
};

const body = [...groups.entries()].map(([ns, items]) => `
<section>
  <h2>${esc(ns)} <span class="count">${items.length}</span></h2>
  ${NAMESPACES[ns] ? `<p class="ns">${NAMESPACES[ns]}</p>` : ''}
  <table>
    <thead><tr><th>key</th><th>English (source)</th><th>Finnish</th><th>Japanese</th></tr></thead>
    <tbody>
    ${items.map(it => `<tr${it.notes.length ? ' class="flag"' : ''}>
      <td class="k">${esc(it.key)}</td>
      <td class="en">${esc(it.en)}</td>
      <td class="fi" lang="fi">${esc(it.fi)}</td>
      <td class="ja" lang="ja">${esc(it.ja)}</td>
    </tr>${it.notes.length ? `<tr class="notes"><td></td><td colspan="3">${
      it.notes.map(([k, t]) => `<span class="n n-${k}">${esc(t)}</span>`).join(' ')
    }</td></tr>` : ''}`).join('\n')}
    </tbody>
  </table>
</section>`).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Piritori → Eden · fi / ja review</title>
<style>
 :root { color-scheme: light; }
 body { font: 15px/1.55 -apple-system, "Segoe UI", system-ui, sans-serif;
        margin: 0 auto; padding: 2rem 1.25rem 6rem; max-width: 1180px; color: #1b1b1b; }
 h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
 .sub { color: #666; margin: 0 0 1.5rem; }
 .ask { background: #fffbe8; border: 1px solid #e8d9a0; border-radius: 6px;
        padding: 1rem 1.25rem; margin: 0 0 2rem; }
 .ask h2 { font-size: 1rem; margin: 0 0 .5rem; }
 .ask ol { margin: 0; padding-left: 1.25rem; }
 .ask li { margin: .35rem 0; }
 section { margin: 2.5rem 0; }
 h2 { font-size: 1.1rem; border-bottom: 2px solid #1b1b1b; padding-bottom: .3rem; }
 .count { color: #888; font-weight: normal; font-size: .85rem; }
 .ns { color: #555; margin: .4rem 0 .8rem; font-size: .92rem; }
 table { border-collapse: collapse; width: 100%; }
 th { text-align: left; font-size: .78rem; text-transform: uppercase;
      letter-spacing: .04em; color: #777; padding: .4rem .6rem; }
 td { padding: .45rem .6rem; vertical-align: top; border-top: 1px solid #eee; }
 td.k { font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #777; width: 17%; }
 td.en { width: 29%; }
 td.fi, td.ja { width: 27%; }
 td.ja { font-size: 1.02rem; }
 tr.flag td { background: #fff6f6; }
 tr.notes td { border-top: 0; padding-top: 0; }
 .n { display: inline-block; font-size: .76rem; border-radius: 3px;
      padding: .1rem .4rem; margin-right: .3rem; }
 .n-gap { background: #ffd9d9; } .n-same { background: #ffe6c7; }
 .n-fmt { background: #ffd9d9; } .n-wide { background: #e6eeff; }
</style></head><body>
<h1>Piritori → Eden — Finnish and Japanese review</h1>
<p class="sub">${counts.rows} keys · ${counts.flagged} carry a mechanical flag ·
generated from <code>locale/ui.csv</code></p>

<div class="ask">
  <h2>What this needs from you</h2>
  <ol>
    <li><strong>Register.</strong> The game is Helsinki, 2003, and the people speaking are
        criminals, not officials. Is the Finnish plain-spoken and unbureaucratic? Is the
        Japanese in plain form rather than <span lang="ja">です・ます</span>?</li>
    <li><strong>Names stay put.</strong> <em>Piritori</em>, <em>Eden</em>, <em>Aatami</em>,
        <em>Kurvi</em>, <em>Sörnäinen</em> and the district names are places and people
        and should not be translated. Flag any that were.</li>
    <li><strong>Money.</strong> The slice runs on markka with the euro alongside it.
        Is the wording right for 2003 Finland?</li>
    <li><strong>Fit.</strong> Anything marked <span class="n n-wide">wide</span> is longer
        than its English source. The five <code>cmd.*</code> strings sit in fixed-width
        buttons — those are the ones that break a layout.</li>
    <li><strong>Anything that reads as translated</strong> rather than written. That is
        the whole reason this page exists, and it is the one thing no gate can see.</li>
  </ol>
  <p style="margin:.75rem 0 0;color:#555;font-size:.9rem">Prose in encounters, missions
  and bulletins is <strong>English only</strong> and is not on this page — only the
  interface is translated so far.</p>
</div>
${body}
</body></html>`;

writeFileSync(OUT, html);
console.log(`locale-review: ${counts.rows} keys, ${counts.flagged} flagged -> ${path.relative(PROJECT, OUT)}`);
