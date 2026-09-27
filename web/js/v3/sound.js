// The city's sound (Act I v4.59). Owner, 2026-09-27, answer 7: "yes" to a
// tram bell, the till and street rain.
//
// Synthesised, never sampled (the house rule: no audio files to fetch, cache
// or license). Every voice goes through ONE master gain, so mute really mutes
// and anything added later inherits it. Nothing starts before a user gesture
// (browsers refuse to), and a browser with no WebAudio gets a silent stub:
// sound is never the reason the city does not open.
const KEY = 'piritori-to-eden:sound';

let ctx = null, master = null, bed = null, bellTimer = 0;
let on = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();

function noiseBuffer(seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  // Deterministic noise: a sound bug you cannot reproduce is a bug in a costume.
  let x = 0x9e3779b9;
  for (let i = 0; i < d.length; i += 1) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = ((x >>> 0) / 4294967296) * 2 - 1; }
  return buffer;
}

function tone(freq, start, dur, peak, type = 'sine', dest = master) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(dest); o.start(start); o.stop(start + dur + 0.05);
}

function burst(start, dur, peak, lo, hi) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(Math.max(0.2, dur));
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (lo + hi) / 2; f.Q.value = (lo + hi) / 2 / (hi - lo);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(master); s.start(start); s.stop(start + dur + 0.05);
}

/** Wake the audio graph. Call from a user gesture; safe to call again. */
export function wake() {
  if (ctx || !on) { if (ctx?.state === 'suspended') ctx.resume(); return; }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  try { ctx = new AC(); } catch { ctx = null; return; }
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  startBed();
}

/** The street: rain on a roof, the city's low hum, a far tram bell now and then. */
function startBed() {
  const t = ctx.currentTime;
  const rain = ctx.createBufferSource(); rain.buffer = noiseBuffer(4); rain.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const rg = ctx.createGain(); rg.gain.setValueAtTime(0.0001, t); rg.gain.exponentialRampToValueAtTime(0.05, t + 3);
  rain.connect(hp).connect(lp).connect(rg).connect(master); rain.start();
  const hum = ctx.createBufferSource(); hum.buffer = noiseBuffer(4); hum.loop = true;
  const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 160;
  const hg = ctx.createGain(); hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.09, t + 4);
  hum.connect(hl).connect(hg).connect(master); hum.start();
  bed = { rain, hum };
  const far = () => {
    if (!ctx) return;
    bell(0.25);
    bellTimer = setTimeout(far, 22000 + Math.random() * 26000);
  };
  bellTimer = setTimeout(far, 9000);
}

/** A tram bell: two struck tones, the second a little lower. */
export function bell(level = 1) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.02;
  for (const [dt, f] of [[0, 1318], [0.16, 1175]]) {
    tone(f, t + dt, 1.1, 0.12 * level, 'sine');
    tone(f * 2.76, t + dt, 0.35, 0.03 * level, 'sine');
  }
}

/** The till: a drawer, then a bright double ring. Up for money in, down for money out. */
export function till(direction = 1) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.01;
  burst(t, 0.08, 0.25, 1800, 4200);
  const [a, b] = direction >= 0 ? [1568, 2093] : [1397, 1047];
  tone(a, t + 0.06, 0.35, 0.10, 'triangle');
  tone(b, t + 0.14, 0.55, 0.10, 'triangle');
}

/** Footsteps on wet stone, for a journey. */
export function steps(count = 4) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.02;
  for (let i = 0; i < count; i += 1) burst(t + i * 0.26, 0.09, 0.22 - i * 0.02, 250, 900);
}

/** Something on the road: a low, short sting. */
export function sting() {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.02;
  tone(110, t, 0.9, 0.16, 'sawtooth');
  tone(116.5, t, 0.9, 0.10, 'sawtooth');
  burst(t, 0.3, 0.12, 300, 1200);
}

/** The tram pulling in: brakes, then the bell. */
export function arrival() {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.05;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(3);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9;
  f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(900, t + 2.2);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.10, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 2.6);
  setTimeout(() => bell(1), 2300);
}

export function soundOn() { return on; }

export function setSound(next) {
  on = Boolean(next);
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private window */ }
  if (!on && ctx) {
    clearTimeout(bellTimer);
    try { bed?.rain.stop(); bed?.hum.stop(); } catch { /* already stopped */ }
    ctx.close(); ctx = null; master = null; bed = null;
  } else if (on) wake();
  return on;
}

/** For tests: is a graph running, and is it audible? */
export function soundState() {
  return { on, running: Boolean(ctx), context: ctx?.state ?? 'none', gain: master?.gain.value ?? 0 };
}
