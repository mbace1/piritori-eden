#!/usr/bin/env node
/**
 * check-locale.mjs — the locale gate.
 *
 * CLAUDE.md records the exact failure this exists to stop: "The gate now also
 * fails if anything is left in English in a pack — three CHANGED entries
 * shipped English-only in both packs and nothing caught it, because per-key
 * fallback is the right behaviour and completely silent."
 *
 * So this does three things:
 *   1. every key has a cell in every language;
 *   2. no fi/ja cell is silently identical to the English one, unless it is
 *      listed below as a deliberate shared token (numbers, proper nouns);
 *   3. every tr("...") key used in GDScript exists in the CSV, and every CSV
 *      key is actually used — a stale key is drift.
 *
 *   node tools/check-locale.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CSV = resolve(root, 'locale/ui.csv');

/** Keys whose translation is legitimately the same string in every language. */
const SHARED_ALLOWED = new Set([
  'ui.era_line', // "2003 · AATAMI" — a year and a character name
]);

let problems = 0;
const fail = (msg) => { console.error(msg); problems++; };

// ── parse the CSV (quoted cells may contain commas) ───────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 && r[0].trim() !== '');
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const header = rows.shift();
const langs = header.slice(1).map((s) => s.trim());

if (langs[0] !== 'en') fail(`first language column must be en, got '${langs[0]}'`);

const keys = new Set();
for (const row of rows) {
  const key = row[0].trim();
  if (keys.has(key)) fail(`duplicate key: ${key}`);
  keys.add(key);

  for (let i = 0; i < langs.length; i++) {
    const cell = (row[i + 1] ?? '').trim();
    if (!cell) fail(`${key}: empty ${langs[i]} cell`);
  }

  const en = (row[1] ?? '').trim();
  for (let i = 1; i < langs.length; i++) {
    const cell = (row[i + 1] ?? '').trim();
    if (cell && cell === en && !SHARED_ALLOWED.has(key)) {
      fail(`${key}: ${langs[i]} is identical to en ("${en}") — silent fallback`);
    }
  }

  // format specifiers must match across languages, or a %d meets a string
  const spec = (s) => (s.match(/%[0-9]*[a-z]/g) ?? []).sort().join(',');
  for (let i = 1; i < langs.length; i++) {
    const cell = (row[i + 1] ?? '').trim();
    if (cell && spec(cell) !== spec(en)) {
      fail(`${key}: ${langs[i]} format specifiers ${spec(cell) || '(none)'} != en ${spec(en) || '(none)'}`);
    }
  }
}

// ── cross-check against the code ──────────────────────────────────────────
function gdFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'data' || name === '.godot') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) gdFiles(full, out);
    else if (name.endsWith('.gd')) out.push(full);
  }
  return out;
}

const used = new Map();
for (const file of gdFiles(root)) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\btr\("([^"]+)"\)/g)) {
    if (!used.has(m[1])) used.set(m[1], relative(root, file));
  }
  // Keys also reach tr() indirectly: returned from a helper
  // (PiritoriPalette.state_key) or carried in a spec array and translated at
  // the point of use (the command bar). Count any key-shaped literal.
  for (const m of src.matchAll(/"((?:ui|cmd|verb|state|battle)\.[a-z_0-9.]+)"/g)) {
    if (!used.has(m[1])) used.set(m[1], relative(root, file));
  }
}

for (const [key, file] of used) {
  if (!keys.has(key)) fail(`${file}: tr("${key}") has no row in locale/ui.csv`);
}
for (const key of keys) {
  if (!used.has(key)) fail(`locale/ui.csv: '${key}' is never used — stale key`);
}

if (problems) {
  console.error(`\nLOCALE FAIL: ${problems} problem(s).`);
  process.exit(1);
}
console.log(`LOCALE OK: ${keys.size} keys × ${langs.length} languages (${langs.join('/')}), all used, none silently English.`);
