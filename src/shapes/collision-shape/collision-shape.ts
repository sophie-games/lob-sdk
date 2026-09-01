import { Point2 } from "@lob-sdk/vector";
import { convexOverlapRatio } from "../polygon/utils";

/** Unit-local corners of a `width` x `height` box in OBB corner order (front = +X). */
export function localObbCorners(width: number, height: number): Point2[] {
  const hw = width / 2;
  const hh = height / 2;
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
}

/**
 * Outline (flat [x0,y0,...]) of the region a fire edge [a,b] (outward unit normal nx,ny,
 * half-arc `halfArc`) reaches out to `maxRadius`: each corner fans to maxRadius along its
 * flank ray (normal +/- halfArc), an arc sweeps up to dead-ahead, and a flat top spans the
 * frontage. A degenerate edge (a equals b) collapses to one cone. Directional arcs only
 * (the caller draws an omni face as a ring). Pure.
 */
export function fireEdgeRegionPolygon(
  a: Point2,
  b: Point2,
  nx: number,
  ny: number,
  halfArc: number,
  maxRadius: number,
): number[] {
  if (maxRadius <= 0) return [];

  // Clamp to <90 so the flank rays stay in front of the face.
  const half = Math.min(halfArc, Math.PI / 2 - 1e-3);
  const nAng = Math.atan2(ny, nx);
  const steps = Math.max(6, Math.ceil((half * 48) / Math.PI));

  const pts: number[] = [];
  const pushPoint = (x: number, y: number) => {
    const last = pts.length - 2;
    if (last < 0 || pts[last] !== x || pts[last + 1] !== y) {
      pts.push(x, y);
    }
  };

  // Pixi divides by segment length while tessellating strokes. Keep every adjacent
  // pair distinct, including for a one-emitter edge or a valid zero-degree arc.
  pushPoint(a.x, a.y);
  // a-corner arc: flank ray (nAng - half) sweeping up to dead-ahead (nAng).
  for (let i = 0; i <= steps; i++) {
    const ang = nAng - half + (half * i) / steps;
    pushPoint(a.x + Math.cos(ang) * maxRadius, a.y + Math.sin(ang) * maxRadius);
  }
  // Flat top at maxRadius spanning the frontage (a-side dead-ahead -> b-side).
  pushPoint(b.x + nx * maxRadius, b.y + ny * maxRadius);
  // b-corner arc: dead-ahead (nAng) sweeping out to flank ray (nAng + half).
  for (let i = 1; i <= steps; i++) {
    const ang = nAng + (half * i) / steps;
    pushPoint(b.x + Math.cos(ang) * maxRadius, b.y + Math.sin(ang) * maxRadius);
  }
  pushPoint(b.x, b.y);
  return pts;
}

/** Squared distance from point `p` to the segment `a`->`b`. */
function pointToSegmentDistanceSq(p: Point2, a: Point2, b: Point2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  let t = lenSq > 0 ? (apx * abx + apy * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = apx - t * abx;
  const dy = apy - t * aby;
  return dx * dx + dy * dy;
}

/** Min squared distance from point `p` to any edge of polygon `poly`. */
function pointToPolygonEdgesDistanceSq(p: Point2, poly: Point2[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = pointToSegmentDistanceSq(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Minimum edge-to-edge distance between two DISJOINT convex polygons. For convex
 * shapes the closest pair is always a vertex against the other's edge (vertex-vertex
 * falls out as a segment endpoint), so it suffices to test every vertex of each
 * against every edge of the other. Callers must rule out overlap first (returns a
 * spurious positive if the polygons intersect).
 */
function convexPolygonsGap(a: Point2[], b: Point2[]): number {
  let minSq = Infinity;
  for (const p of a)
    minSq = Math.min(minSq, pointToPolygonEdgesDistanceSq(p, b));
  for (const p of b)
    minSq = Math.min(minSq, pointToPolygonEdgesDistanceSq(p, a));
  return Math.sqrt(minSq);
}

/** A rotated rectangle (oriented bounding box) given by its four corners. */
export class ObbShape {
  constructor(readonly corners: Point2[]) {}

  get center(): Point2 {
    return {
      x: (this.corners[0].x + this.corners[2].x) / 2,
      y: (this.corners[0].y + this.corners[2].y) / 2,
    };
  }

  boundingRadius(): number {
    const c = this.center;
    let max = 0;
    for (const p of this.corners) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d > max) max = d;
    }
    return max;
  }

  overlapRatio(other: ObbShape): number {
    return convexOverlapRatio(this.corners, other.corners);
  }

  distanceTo(other: ObbShape): number {
    // Any overlap (a vertex inside, or crossing edges) means zero gap.
    if (convexOverlapRatio(this.corners, other.corners) > 0) return 0;
    return convexPolygonsGap(this.corners, other.corners);
  }
}
