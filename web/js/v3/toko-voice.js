// Toko's sounds at the counter — the Radio Free clay films' "Toko palette".
//
// Owner, 2026-10-19: Toko should "look, move, and sound exactly like the Toko
// ones in the claymation RFH videos". In those films Toko never speaks: his
// sound is the room's — a felt piano, a music box, a plucked upright whose
// slide is his head tilt ("bwoop?"), soft foley (SOUND.md, "Toko (everyday
// life, observed; claymation)").
//
// Ported from radiofree/studio/art-motion/lib/rfsound.py (Suds-Jack, films
// branch): hz, felt_piano/_felt, music_box/_mbox, upright_slide, knock, pat.
// The tonal parts are the same formulas sample for sample; only the band-limited
// noise in the clicks (rfsound draws it by FFT) is approximated with simple
// filters. Synthesised at run time, never sampled — sound.js's house rule.
// Each cue is built once per sample rate and cached.
import { play, sampleRate } from './sound.js?v=2';

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let SR = 48000;
const N = (d) => Math.max(1, Math.round(d * SR));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** band-limited noise: Gaussian, a one-pole high-pass at lo and two one-pole low-passes at hi */
function noise(d, lo, hi, seed = 7) {
  const r = rng(seed), n = N(d), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = Math.max(1e-9, r()), v = r(); x[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  if (lo) { const a = Math.exp(-2 * Math.PI * lo / SR); let px = 0, py = 0; for (let i = 0; i < n; i++) { const y = a * (py + x[i] - px); px = x[i]; x[i] = py = y; } }
  if (hi) for (let pass = 0; pass < 2; pass++) { const a = Math.exp(-2 * Math.PI * hi / SR); let y = 0; for (let i = 0; i < n; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } }
  return x;
}
const over = (...sigs) => { const n = Math.max(...sigs.map(s => s.length)), o = new Float32Array(n); for (const s of sigs) for (let i = 0; i < s.length; i++) o[i] += s[i]; return o; };
const at = (sig, sec) => { const k = N(sec), o = new Float32Array(sig.length + k); o.set(sig, k); return o; };
const scale = (sig, g) => sig.map(v => v * g);

// A decaying sine, A * sin(2πf t + φ) * exp(-k t), added into out from sample 0 — by recurrence
// (a rotation per sample and a running decay) rather than sin() and exp() per sample: the same
// values to float precision, and several times cheaper (measured, 2026-10-20: a cue went from
// ~0.5-0.9 s to build on the main thread).
function addDecayingSine(out, f, k, A, phi = 0, n = out.length) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), r = Math.exp(-k / SR);
  let s1 = Math.sin(phi - w), s0 = Math.sin(phi), amp = A;            // s[i] = sin(w i + φ)
  for (let i = 0; i < n; i++) { out[i] += amp * s0; const s2 = 2 * c * s0 - s1; s1 = s0; s0 = s2; amp *= r; }
}
/** rfsound _felt: an upright with a felt strip down — stretched partials, two strings a cent apart, the hammer's thunk */
function felt(m, d = 1, vel = 0.5) {
  const f = hz(m), n = N(d + 0.4), s = new Float32Array(n), B = 0.00035 * (1 + Math.max(0, m - 60) / 24);
  for (let k = 1; k <= Math.floor(Math.min(28, 5200 / f)); k++) {
    const fk = f * k * Math.sqrt(1 + B * k * k), ak = k ** -(1.25 + 0.9 * (1 - vel)) * Math.exp(-fk / (1400 + 2600 * vel)), dec = 0.35 + fk / 2200 + 0.12 * k;
    // e(t) = 0.75 e^{-dec t} + 0.25 e^{-0.18 dec t}; two strings a cent apart for k <= 4
    for (const [A, kk] of [[0.75, dec], [0.25, dec * 0.18]]) {
      if (k <= 4) { addDecayingSine(s, fk, kk, ak * A * 0.5, k); addDecayingSine(s, fk * 1.0006, kk, ak * A * 0.5, 2 * k); }
      else addDecayingSine(s, fk, kk, ak * A, k);
    }
  }
  for (let i = 0; i < n; i++) { const t = i / SR; s[i] *= (t > d ? Math.exp(-(t - d) / 0.12) : 1) * Math.min(1, t / 0.006); }
  const th = noise(0.06, 70, 900, 11); for (let i = 0; i < th.length; i++) th[i] *= Math.exp(-(i / SR) * 60) * 0.10 * vel;
  return scale(over(s, th), (0.25 + 0.5 * vel) * 0.7);
}
/** rfsound _mbox: a music-box comb — a steel tooth, its next mode at ~6x, the pin's tick, the case */
function mbox(m) {
  const f = hz(m), n = N(2.2), s = new Float32Array(n);
  addDecayingSine(s, f, 1.6, 1); addDecayingSine(s, 5.93 * f, 9, 0.22);
  if (f * 13.3 < 18000) addDecayingSine(s, 13.3 * f, 30, 0.05);
  for (let i = 0; i < n; i++) s[i] *= Math.min(1, (i / SR) / 0.0015) * 0.3;
  addDecayingSine(s, 420, 30, 0.05);
  const pin = noise(0.01, 3000, 12000, 13); for (let i = 0; i < pin.length; i++) pin[i] *= Math.exp(-(i / SR) * 700) * 0.2;
  return over(s, pin);
}
/** rfsound upright_slide: the plucked upright whose finger slides — 'bwoop?' up. The harmonics
 *  sin(jθ) come from one sin/cos per sample by the Chebyshev recurrence. */
function slide(m0, m1, d = 0.35, vel = 0.8) {
  const f0 = hz(m0), f1 = hz(m1), n = N(d + 0.45), s = new Float32Array(n); let ph = 0;
  const W = Array.from({ length: 16 }, (_, j) => j ? Math.abs(Math.sin(Math.PI * j * 0.18)) / j ** 0.9 : 0);
  const R = Array.from({ length: 16 }, (_, j) => Math.exp(-(1.4 + 0.7 * j) / SR)), amp = W.slice();
  for (let i = 0; i < n; i++) { const t = i / SR, k = Math.min(1, t / d), f = f0 * (f1 / f0) ** (3 * k * k - 2 * k * k * k); ph += 2 * Math.PI * f / SR;
    const c2 = 2 * Math.cos(ph); let sm2 = 0, sm1 = Math.sin(ph), v = 0;
    for (let j = 1; j < 16; j++) { v += amp[j] * sm1; amp[j] *= R[j]; const nx = c2 * sm1 - sm2; sm2 = sm1; sm1 = nx; }
    s[i] = v * Math.min(1, t / 0.004) * 0.5 * vel; }
  const th = noise(0.05, 30, 400, 17); for (let i = 0; i < th.length; i++) th[i] *= Math.exp(-(i / SR) * 70) * 0.3 * vel;
  return over(s, th);
}
/** rfsound knock: knuckle — here, a bowl set down — on wood */
function knock(vel = 0.7, f = 310) {
  const n = N(0.15), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; s[i] = 0.4 * ((Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40)) + 0.5 * Math.sin(2 * Math.PI * f * 2.32 * t) * Math.exp(-t * 60) + 0.25 * Math.sin(2 * Math.PI * f * 4.03 * t) * Math.exp(-t * 90)); }
  const c = noise(0.01, 800, 5000, 19); for (let i = 0; i < c.length; i++) c[i] *= Math.exp(-(i / SR) * 600) * 0.2;
  return scale(over(s, c), vel);
}
/** rfsound pat: a soft muffled thump */
function pat(vel = 0.6) { const x = noise(0.08, 80, 1400, 23); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] *= Math.exp(-t * 55) * Math.min(1, t / 0.004) * 0.6 * vel; } return x; }

// The cues, timed to the clips (art-src/clay-toko/counter.js): each starts with its clip.
const CUES = {
  wave: () => over(...[[77, 0.42], [81, 0.61], [84, 0.80]].map(([m, t]) => at(mbox(m), t))),   // a music-box hello as the glove comes up
  nod: () => over(at(pat(0.6), 0.40), at(felt(69, 0.5, 0.5), 0.40)),                              // the bow lands: a pat and a felt note
  tilt: () => at(slide(41, 46, 0.35, 0.8), 0.14),                                                  // 'bwoop?' as the head tips
  bowl: () => knock(0.6, 310),                                                                     // a bowl set on the counter
};
const cache = new Map();
/** Build every cue ahead of need, one per idle slot (the counter calls this on mount). */
export function warmTokoCues() {
  const sr = sampleRate(); if (!sr) return;                       // sound not awake (or off): nothing to warm
  if (sr !== SR) { SR = sr; cache.clear(); }
  const todo = Object.keys(CUES).filter(k => !cache.has(k)), idle = globalThis.requestIdleCallback ?? ((f) => setTimeout(f, 60));
  const next = () => { const k = todo.shift(); if (!k) return; if (!cache.has(k)) cache.set(k, CUES[k]()); idle(next); };
  idle(next);
}
/** Play one of Toko's cues through the city's master gain (mute mutes it). */
export function tokoCue(name, gain = 0.4) {
  const make = CUES[name]; if (!make) return;
  play((sr) => { if (sr !== SR) { SR = sr; cache.clear(); } if (!cache.has(name)) cache.set(name, make()); return cache.get(name); }, gain);
}
