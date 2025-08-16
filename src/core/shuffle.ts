import { randomInt } from 'crypto';
export function shuffleInPlace<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); // 0..i
    [a[i], a[j]] = [a[j], a[i]];
  }
}
export function shuffled<T>(a: T[]): T[] { const c=a.slice(); shuffleInPlace(c); return c; }
