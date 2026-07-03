// Seeded RNG with per-turn streams. This is load-bearing for the
// counterfactual ledger (§6.3): two forks of a run with the same runSeed must
// see the *same* event cards on the same turn, diverging only through state —
// "same shock, opposite meaning" made reproducible.

/** mulberry32 — small, fast, decent-quality 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** splitmix-style mix to combine two 32-bit ints into a stream seed. */
export function hash2(a: number, b: number): number {
  let h = (a >>> 0) ^ Math.imul((b >>> 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface Rng {
  next(): number; // float in [0, 1)
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  bool(p: number): boolean;
}

export function makeRng(seed: number): Rng {
  const f = mulberry32(seed);
  return {
    next: f,
    int: (m) => Math.floor(f() * m),
    range: (min, max) => min + f() * (max - min),
    bool: (p) => f() < p,
  };
}

/**
 * An independent, reproducible RNG stream for a single turn. Two runs with the
 * same runSeed draw identically on the same turn regardless of allocation, so a
 * forked branch (§6.3) diverges only through the state it carries in.
 */
export function turnRng(runSeed: number, turn: number): Rng {
  return makeRng(hash2(runSeed, turn));
}
