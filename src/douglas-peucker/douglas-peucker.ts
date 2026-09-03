import { Point2 } from "@lob-sdk/vector";

/**
 * Simplifies a path with the Douglas-Peucker algorithm: drops points within `epsilon` (coordinate
 * units) of the kept segment, measured point-to-segment (clamped at the endpoints), not to the
 * classic infinite line. Iterative (no recursion), never mutates the input, and handles zero-length
 * segments (duplicate points / closed loops) without dividing by zero.
 *
 * @param path - Points to simplify. Not mutated.
 * @param epsilon - Max allowed deviation; must be finite and >= 0.
 * @returns New simplified array, points in original order.
 * @throws RangeError if epsilon is negative, NaN, or infinite.
 */
export function douglasPeucker<T extends Point2>(
  path: readonly T[],
  epsilon: number = 0.5,
): T[] {
  if (!Number.isFinite(epsilon) || epsilon < 0) {
    throw new RangeError(`epsilon must be finite and >= 0, got ${epsilon}`);
  }
  if (path.length < 3) {
    return path.slice();
  }

  const keep = new Uint8Array(path.length);
  keep[0] = 1;
  keep[path.length - 1] = 1;

  // Pending segments as [startIndex, endIndex] into `path`.
  // Replaces recursion: no call-stack risk, no intermediate slices.
  const stack: Array<[number, number]> = [[0, path.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;

    let maxDist = -1;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const dist = pointToSegmentDistance(path[i], path[start], path[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (index !== -1 && maxDist > epsilon) {
      keep[index] = 1;
      if (index - start > 1) stack.push([start, index]);
      if (end - index > 1) stack.push([index, end]);
    }
  }

  return path.filter((_, i) => keep[i] === 1);
}

/**
 * Distance from `point` to the segment [segStart, segEnd].
 * Uses the clamped projection, so it measures against the actual segment
 * (not the infinite line) and falls back to point-to-point distance when
 * the segment has zero length (segStart === segEnd).
 */
function pointToSegmentDistance(
  point: Point2,
  segStart: Point2,
  segEnd: Point2,
): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(point.x - segStart.x, point.y - segStart.y);
  }

  let t =
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;

  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}
