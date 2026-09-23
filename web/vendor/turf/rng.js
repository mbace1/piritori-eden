// Seeded PRNG (mulberry32) — GDD §2 allows some RNG (unlike ITB's near-zero
// dogma), but a hit roll you can't reproduce is a bug in a costume: every
// encounter is seeded, so the same seed replays the same fight, which is
// what makes the combat engine testable in bare node (test/smoke.cjs).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
