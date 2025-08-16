export interface RNG {
  next(): number;          // [0,1)
}

export const DefaultRNG: RNG = {
  next: () => Math.random()
};

// Utility if you later want seeded RNG without adding deps:
// Simple LCG (good enough for tests; not crypto)
export function makeLCG(seed=123456789): RNG {
  let x = seed >>> 0;
  return {
    next: () => {
      x = (1664525 * x + 1013904223) >>> 0;
      return (x >>> 8) / 0x01000000;
    }
  };
}
