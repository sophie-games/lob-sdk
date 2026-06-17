import { Point2 } from "@lob-sdk/vector";

/** A covered sub-range of a segment, as params [t0, t1] in 0..1 along it. */
export type Interval = [number, number];

/**
 * Sub-interval of segment p0->p1 (params 0..1) that lies within `radius` of the
 * circle centre, or null if it never gets that close. Bake any contact margin
 * into `radius`.
 */
export function segmentCircleCoverage(
  p0: Point2,
  p1: Point2,
  cx: number,
  cy: number,
  radius: number,
): Interval | null {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lenSq = dx * dx + dy * dy;
  const rSq = radius * radius;

  if (lenSq === 0) {
    const ex = p0.x - cx;
    const ey = p0.y - cy;
    return ex * ex + ey * ey <= rSq ? [0, 0] : null;
  }

  const t = ((cx - p0.x) * dx + (cy - p0.y) * dy) / lenSq;
  const closestX = p0.x + t * dx;
  const closestY = p0.y + t * dy;
  const perpSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
  if (perpSq > rSq) return null;

  const half = Math.sqrt((rSq - perpSq) / lenSq); // half-chord in t units
  const t0 = Math.max(0, t - half);
  const t1 = Math.min(1, t + half);
  return t0 <= t1 ? [t0, t1] : null;
}

/** Union of covered intervals, sorted and merged. Does not mutate inputs. */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [s, e] = sorted[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

/** Total covered fraction (0..1) of a segment given its covered intervals. */
export function coveredFraction(intervals: Interval[]): number {
  let sum = 0;
  for (const [a, b] of mergeIntervals(intervals)) sum += b - a;
  return Math.min(sum, 1);
}

/** Free (uncovered) sub-intervals of [0,1] (the gaps fire originates from). */
export function freeIntervals(intervals: Interval[]): Interval[] {
  const merged = mergeIntervals(intervals);
  const free: Interval[] = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) free.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < 1) free.push([cursor, 1]);
  return free;
}
