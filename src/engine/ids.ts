export function newId(prefix='id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2,10)}`;
}
