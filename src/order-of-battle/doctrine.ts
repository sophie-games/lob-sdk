/** Control-group keys, so the divisions past the tenth carry no digit. */
export const KEYED_DIVISIONS = 10;

/**
 * Divisions a body of the given strength needs to stay under the ceiling. It is
 * the ceiling that is fixed, so a bigger army is more divisions rather than
 * bigger ones.
 */
export function divisionsNeeded(strength: number, max: number): number {
  return strength === 0 ? 0 : Math.ceil(strength / max);
}

/** Brigades a division of `strength` units needs to stay under the ceiling. */
export function brigadesNeeded(
  strength: number,
  max: number,
  maxBrigades: number,
): number {
  return Math.max(1, Math.min(maxBrigades, Math.ceil(strength / max)));
}

/**
 * Cut `items` into `count` groups of roughly equal weight, in order. `weigh`
 * reports what an item counts for, so a named regiment can be cut as one body.
 */
export function cutIntoGroups<T>(
  items: T[],
  count: number,
  weigh: (item: T) => number,
): T[][] {
  if (count <= 1) return items.length === 0 ? [] : [items];

  const total = items.reduce((sum, item) => sum + weigh(item), 0);
  const groups: T[][] = Array.from({ length: count }, () => []);
  let taken = 0;

  for (const item of items) {
    // The group this item belongs to, by how far along the body it sits.
    const group = Math.min(count - 1, Math.floor((taken * count) / total));
    groups[group].push(item);
    taken += weigh(item);
  }

  return groups.filter((group) => group.length > 0);
}
