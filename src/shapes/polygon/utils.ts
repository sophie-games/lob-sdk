import { Point2 } from "@lob-sdk/vector";

/** Absolute area of a simple polygon (shoelace). */
export function polygonArea(poly: Point2[]): number {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(sum) / 2;
}

/** Signed area; sign encodes winding (used to make clipping winding-agnostic). */
function signedArea(poly: Point2[]): number {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  }
  return sum / 2;
}

function isInside(a: Point2, b: Point2, p: Point2, ccw: boolean): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  return ccw ? cross >= 0 : cross <= 0;
}

/** Intersection of segment p1->p2 with the infinite line a->b (caller ensures they cross). */
function lineIntersect(p1: Point2, p2: Point2, a: Point2, b: Point2): Point2 {
  const denom =
    (p1.x - p2.x) * (a.y - b.y) - (p1.y - p2.y) * (a.x - b.x);
  const t =
    ((p1.x - a.x) * (a.y - b.y) - (p1.y - a.y) * (a.x - b.x)) / denom;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/**
 * Intersection polygon of two CONVEX polygons via Sutherland-Hodgman.
 * Returns the clipped vertices, or [] when they do not overlap.
 */
export function convexPolygonIntersection(
  subject: Point2[],
  clip: Point2[],
): Point2[] {
  if (subject.length < 3 || clip.length < 3) return [];

  let output: Point2[] = subject;
  const ccw = signedArea(clip) > 0;

  for (let e = 0; e < clip.length; e++) {
    if (output.length === 0) break;
    const a = clip[e];
    const b = clip[(e + 1) % clip.length];
    const input = output;
    output = [];

    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const currIn = isInside(a, b, curr, ccw);
      const prevIn = isInside(a, b, prev, ccw);

      if (currIn) {
        if (!prevIn) output.push(lineIntersect(prev, curr, a, b));
        output.push(curr);
      } else if (prevIn) {
        output.push(lineIntersect(prev, curr, a, b));
      }
    }
  }

  return output;
}

/**
 * Overlap of two convex footprints as a fraction (0..1) of the SMALLER area.
 * 1 means one shape is fully inside the other; 0 means no overlap.
 */
export function convexOverlapRatio(a: Point2[], b: Point2[]): number {
  const interArea = polygonArea(convexPolygonIntersection(a, b));
  if (interArea <= 0) return 0;
  const minArea = Math.min(polygonArea(a), polygonArea(b));
  return minArea > 0 ? Math.min(interArea / minArea, 1) : 0;
}
