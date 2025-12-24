import { Point2 } from "@lob-sdk/vector";

/**
 * Simplifies a path using the Douglas-Peucker algorithm.
 * Removes points that are within epsilon distance of the line segment between their neighbors.
 * @param path - The path to simplify.
 * @param epsilon - The maximum distance a point can be from the line segment before it's kept (default: 0.5).
 * @returns A simplified path with fewer points.
 * @template T - The type of point, must extend Point2.
 */
export function douglasPeucker<T extends Point2>(
  path: T[],
  epsilon: number = 0.5
): T[] {
  if (path.length < 3) {
    return path;
  }

  const index = findFurthestPoint(path, epsilon);
  if (index === -1) {
    return [path[0], path[path.length - 1]];
  }

  const left = douglasPeucker(path.slice(0, index + 1), epsilon);
  const right = douglasPeucker(path.slice(index), epsilon);

  return left.slice(0, -1).concat(right);
}

/**
 * Finds the index of the point furthest from the line segment between the first and last points.
 * @param path - The path to search.
 * @param epsilon - The epsilon threshold for the Douglas-Peucker algorithm.
 * @returns The index of the furthest point, or -1 if no point exceeds epsilon.
 */
function findFurthestPoint(path: Point2[], epsilon: number): number {
  let maxDist = -1;
  let index = -1;

  const start = path[0];
  const end = path[path.length - 1];

  for (let i = 1; i < path.length - 1; i++) {
    const dist = perpendicularDistance(path[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  return maxDist > epsilon ? index : -1;
}

/**
 * Calculates the perpendicular distance from a point to a line segment.
 * @param point - The point to measure distance from.
 * @param lineStart - The start point of the line segment.
 * @param lineEnd - The end point of the line segment.
 * @returns The perpendicular distance from the point to the line segment.
 */
function perpendicularDistance(
  point: Point2,
  lineStart: Point2,
  lineEnd: Point2
): number {
  const x0 = point.x;
  const y0 = point.y;
  const x1 = lineStart.x;
  const y1 = lineStart.y;
  const x2 = lineEnd.x;
  const y2 = lineEnd.y;

  const num = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  return num / den;
}
