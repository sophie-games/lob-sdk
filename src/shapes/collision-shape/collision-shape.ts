import { Point2 } from "@lob-sdk/vector";
import { ShapeType } from "../types";
import { convexOverlapRatio } from "../polygon/utils";

/** An OBB's centre, unit local axes and half-extents, derived from its corners. */
export interface ObbLocalFrame {
  cx: number;
  cy: number;
  /** Unit axis along corners[0]->corners[1] (the box's local X). */
  ux: number;
  uy: number;
  /** Unit axis along corners[0]->corners[3] (the box's local Y). */
  vx: number;
  vy: number;
  /** Half-extents along u and v. */
  hu: number;
  hv: number;
}

/**
 * Resolve an OBB's centre, unit axes and half-extents from its four corners, so a
 * point can be projected into the box's local frame (local x = rel onto u, y = onto v).
 */
export function obbLocalFrame(corners: Point2[]): ObbLocalFrame {
  const c0 = corners[0];
  const c2 = corners[2];
  const ux = corners[1].x - c0.x;
  const uy = corners[1].y - c0.y;
  const vx = corners[3].x - c0.x;
  const vy = corners[3].y - c0.y;
  const lu = Math.hypot(ux, uy) || 1;
  const lv = Math.hypot(vx, vy) || 1;
  return {
    cx: (c0.x + c2.x) / 2,
    cy: (c0.y + c2.y) / 2,
    ux: ux / lu,
    uy: uy / lu,
    vx: vx / lv,
    vy: vy / lv,
    hu: lu / 2,
    hv: lv / 2,
  };
}

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
 * Closest point on an OBB (corners in corner order) to `from`: projects `from` onto the
 * box's axes, clamps to the half-extents and reconstructs, so a shot can aim at the
 * nearest face rather than the centre. Pure.
 */
export function closestPointOnObb(corners: Point2[], from: Point2): Point2 {
  const { cx, cy, ux, uy, vx, vy, hu, hv } = obbLocalFrame(corners);
  const dx = from.x - cx;
  const dy = from.y - cy;
  const pu = Math.max(-hu, Math.min(hu, dx * ux + dy * uy));
  const pv = Math.max(-hv, Math.min(hv, dx * vx + dy * vy));
  return { x: cx + pu * ux + pv * vx, y: cy + pu * uy + pv * vy };
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

  const pts: number[] = [a.x, a.y];
  // a-corner arc: flank ray (nAng - half) sweeping up to dead-ahead (nAng).
  for (let i = 0; i <= steps; i++) {
    const ang = nAng - half + (half * i) / steps;
    pts.push(a.x + Math.cos(ang) * maxRadius, a.y + Math.sin(ang) * maxRadius);
  }
  // Flat top at maxRadius spanning the frontage (a-side dead-ahead -> b-side).
  pts.push(b.x + nx * maxRadius, b.y + ny * maxRadius);
  // b-corner arc: dead-ahead (nAng) sweeping out to flank ray (nAng + half).
  for (let i = 1; i <= steps; i++) {
    const ang = nAng + (half * i) / steps;
    pts.push(b.x + Math.cos(ang) * maxRadius, b.y + Math.sin(ang) * maxRadius);
  }
  pts.push(b.x, b.y);
  return pts;
}

/**
 * A unit's collision footprint as a single convex primitive. Two implementations,
 * `ObbShape` (a rotated rectangle, napoleonic) and `CircleShape` (WW2), share this
 * interface so collision consumers stay shape-agnostic. The binary `overlapRatio`
 * is resolved by pair-dispatch on the concrete type (the classic double-dispatch
 * case); every other op is unary. Adding a new shape = a new class plus its overlap
 * cases. A circle stays a true circle (centre + radius), never a polygon.
 *
 * This is the collision LAYER: it depends on the geometry helpers (ShapeType,
 * convexOverlapRatio) one-way, and nothing in geometry depends back on it.
 */
export interface CollisionShape {
  readonly shapeType: ShapeType;
  readonly center: Point2;
  /** Distance from the centre to the farthest point of the footprint. */
  boundingRadius(): number;
  /** Overlap as a fraction (0..1) of the smaller footprint's area; 0 = disjoint. */
  overlapRatio(other: CollisionShape): number;
}

/** A rotated rectangle (oriented bounding box) given by its four corners. */
export class ObbShape implements CollisionShape {
  readonly shapeType = ShapeType.Rectangle;

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

  overlapRatio(other: CollisionShape): number {
    if (other instanceof ObbShape) {
      return convexOverlapRatio(this.corners, other.corners);
    }
    // The circle owns the exact circle-vs-rectangle math; delegate to it.
    if (other instanceof CircleShape) {
      return other.overlapWithObb(this);
    }
    return 0;
  }
}

/** A circle given by its centre and radius. */
export class CircleShape implements CollisionShape {
  readonly shapeType = ShapeType.Circle;

  constructor(
    readonly center: Point2,
    readonly radius: number,
  ) {}

  boundingRadius(): number {
    return this.radius;
  }

  overlapRatio(other: CollisionShape): number {
    if (other instanceof CircleShape) {
      return this.overlapWithCircle(other);
    }
    if (other instanceof ObbShape) {
      return this.overlapWithObb(other);
    }
    return 0;
  }

  /**
   * Overlap with another circle as a fraction (0..1) of the smaller disc's area: 0
   * when disjoint, 1 when the smaller sits fully inside the larger, the lens-area
   * fraction in between. A zero-radius circle (no-collision) overlaps nothing.
   */
  private overlapWithCircle(other: CircleShape): number {
    const r1 = this.radius;
    const r2 = other.radius;
    if (r1 <= 0 || r2 <= 0) return 0;
    const d = Math.hypot(other.center.x - this.center.x, other.center.y - this.center.y);
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return 1;

    const r1s = r1 * r1;
    const r2s = r2 * r2;
    const a1 = Math.acos((d * d + r1s - r2s) / (2 * d * r1));
    const a2 = Math.acos((d * d + r2s - r1s) / (2 * d * r2));
    const lens =
      r1s * a1 +
      r2s * a2 -
      0.5 *
        Math.sqrt(
          Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)),
        );
    const minArea = Math.PI * Math.min(r1, r2) ** 2;
    return Math.min(lens / minArea, 1);
  }

  /**
   * Overlap with a rotated rectangle as a fraction (0..1) of the smaller footprint.
   * The circle is kept exact (centre + radius): we move it into the rectangle's local
   * frame so the box is axis-aligned, then measure the circle-AABB intersection area.
   * Public so `ObbShape.overlapRatio` can delegate the cross-shape pair here.
   */
  overlapWithObb(obb: ObbShape): number {
    const r = this.radius;
    if (r <= 0) return 0;
    const { cx, cy, ux, uy, vx, vy, hu, hv } = obbLocalFrame(obb.corners);
    const relX = this.center.x - cx;
    const relY = this.center.y - cy;
    // Circle centre in the box's local frame.
    const lx = relX * ux + relY * uy;
    const ly = relX * vx + relY * vy;

    // Translate so the circle sits at the origin; the box spans [-hu-lx, hu-lx] x ...
    const inter = CircleShape.circleAabbArea(r, -hu - lx, -hv - ly, hu - lx, hv - ly);
    const minArea = Math.min(Math.PI * r * r, 2 * hu * (2 * hv));
    return minArea > 0 ? Math.min(inter / minArea, 1) : 0;
  }

  /** Intersection area of a disc (radius r at the origin) and the box [x0,x1]x[y0,y1]. */
  private static circleAabbArea(
    r: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): number {
    const xa = Math.max(x0, -r);
    const xb = Math.min(x1, r);
    if (xa >= xb) return 0;

    const strips = 64;
    const dx = (xb - xa) / strips;
    let area = 0;
    for (let i = 0; i < strips; i++) {
      const x = xa + (i + 0.5) * dx;
      const h = Math.sqrt(Math.max(0, r * r - x * x));
      const lo = Math.max(y0, -h);
      const hi = Math.min(y1, h);
      if (hi > lo) area += (hi - lo) * dx;
    }
    return area;
  }
}
