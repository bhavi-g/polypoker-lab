/**
 * Set a deterministic Math.random using a seed.
 * If no seed is provided, do nothing (use default Math.random).
 *
 * Based on mulberry32 + xmur3 hash => fast & good enough for shuffles.
 */

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function setGlobalSeed(seed?: string | number | null) {
  if (seed === undefined || seed === null || seed === '') return;
  const seedStr = String(seed);
  const h = xmur3(seedStr);
  const s = h(); // 32-bit uint
  const prng = mulberry32(s);
  // Override Math.random for this process
  const rng = prng;
  // @ts-ignore
  globalThis.Math.random = rng as unknown as () => number;
}

export function setGlobalSeedFromEnv() {
  const envSeed = process.env.SEED;
  if (envSeed) setGlobalSeed(envSeed);
}
