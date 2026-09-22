import type { DeploymentPolygon, TeamDeploymentZone } from "@lob-sdk/types";
import type { Point2 } from "@lob-sdk/vector";
import { Vector2 } from "@lob-sdk/vector";

export type DeploymentZoneShape = Pick<
  TeamDeploymentZone,
  "polygons" | "rotation"
>;

/** The bounds are useful for layout and viewport framing, never for placement. */
export const getDeploymentZoneBounds = (zone: DeploymentZoneShape) => {
  const points = zone.polygons.flatMap(({ outer }) => outer);
  if (points.length === 0) throw new Error("Deployment zone has no vertices");
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

export const polygonFromBounds = (
  left: number,
  top: number,
  right: number,
  bottom: number,
): DeploymentPolygon => ({
  outer: [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ],
});

const onSegment = (point: Point2, a: Point2, b: Point2): boolean => {
  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > 1e-8) return false;
  return (
    point.x >= Math.min(a.x, b.x) &&
    point.x <= Math.max(a.x, b.x) &&
    point.y >= Math.min(a.y, b.y) &&
    point.y <= Math.max(a.y, b.y)
  );
};

const inRing = (
  ring: Point2[],
  point: Point2,
  includeEdge: boolean,
): boolean => {
  let inside = false;
  for (let i = 0, previous = ring.length - 1; i < ring.length; previous = i++) {
    const a = ring[previous]!;
    const b = ring[i]!;
    if (onSegment(point, a, b)) return includeEdge;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
};

export const isInsideDeploymentZone = (
  zone: DeploymentZoneShape,
  point: Point2,
): boolean =>
  zone.polygons.some(
    ({ outer, holes }) =>
      inRing(outer, point, true) &&
      !(holes ?? []).some((hole) => inRing(hole, point, false)),
  );

const nearestPointOnSegment = (point: Point2, a: Point2, b: Point2): Point2 => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
          ),
        );
  return { x: a.x + t * dx, y: a.y + t * dy };
};

/** Returns the requested point or the nearest point on an allowed edge. */
export const getClosestPointInsideDeploymentZone = (
  zone: DeploymentZoneShape,
  point: Point2,
): Vector2 => {
  if (isInsideDeploymentZone(zone, point)) return new Vector2(point.x, point.y);
  let nearest: Point2 | undefined;
  let distanceSquared = Infinity;
  for (const polygon of zone.polygons) {
    for (const ring of [polygon.outer, ...(polygon.holes ?? [])]) {
      for (let i = 0; i < ring.length; i++) {
        const candidate = nearestPointOnSegment(
          point,
          ring[i]!,
          ring[(i + 1) % ring.length]!,
        );
        if (!isInsideDeploymentZone(zone, candidate)) continue;
        const dx = candidate.x - point.x;
        const dy = candidate.y - point.y;
        const distance = dx * dx + dy * dy;
        if (distance < distanceSquared) {
          nearest = candidate;
          distanceSquared = distance;
        }
      }
    }
  }
  if (!nearest) throw new Error("Deployment zone has no edges");
  return new Vector2(nearest.x, nearest.y);
};

const ringArea = (ring: Point2[]): number =>
  Math.abs(
    ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length]!;
      return sum + point.x * next.y - next.x * point.y;
    }, 0),
  ) / 2;

const orientation = (a: Point2, b: Point2, c: Point2): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const segmentsIntersect = (
  a: Point2,
  b: Point2,
  c: Point2,
  d: Point2,
): boolean => {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return (
    (abC === 0 && onSegment(c, a, b)) ||
    (abD === 0 && onSegment(d, a, b)) ||
    (cdA === 0 && onSegment(a, c, d)) ||
    (cdB === 0 && onSegment(b, c, d)) ||
    (abC > 0 !== abD > 0 && cdA > 0 !== cdB > 0)
  );
};

const ringsIntersect = (a: Point2[], b: Point2[]): boolean =>
  a.some((point, i) =>
    b.some((other, j) =>
      segmentsIntersect(
        point,
        a[(i + 1) % a.length]!,
        other,
        b[(j + 1) % b.length]!,
      ),
    ),
  );

export const isValidDeploymentRing = (ring: Point2[]): boolean => {
  if (
    ring.length < 3 ||
    ring.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y)) ||
    ringArea(ring) < 1e-6
  )
    return false;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    if (a.x === b.x && a.y === b.y) return false;
    for (let j = i + 1; j < ring.length; j++) {
      if (j === i + 1 || (i === 0 && j === ring.length - 1)) continue;
      if (segmentsIntersect(a, b, ring[j]!, ring[(j + 1) % ring.length]!))
        return false;
    }
  }
  return true;
};

/** Rejects cutouts that cross the boundary or each other. */
export const isValidDeploymentPolygon = ({
  outer,
  holes = [],
}: DeploymentPolygon): boolean => {
  if (!isValidDeploymentRing(outer)) return false;
  return holes.every(
    (hole, index) =>
      isValidDeploymentRing(hole) &&
      hole.every((point) => inRing(outer, point, false)) &&
      !ringsIntersect(outer, hole) &&
      holes.every(
        (other, otherIndex) =>
          otherIndex === index ||
          (!ringsIntersect(hole, other) &&
            !inRing(other, hole[0]!, true) &&
            !inRing(hole, other[0]!, true)),
      ),
  );
};

export const getDeploymentZoneArea = (zone: DeploymentZoneShape): number =>
  zone.polygons.reduce(
    (sum, { outer, holes }) =>
      sum +
      ringArea(outer) -
      (holes ?? []).reduce((holeArea, ring) => holeArea + ringArea(ring), 0),
    0,
  );

export const deploymentZoneGeometryKey = (zone: DeploymentZoneShape): string =>
  JSON.stringify(zone.polygons);

/** Applies a map transform to every outer and cutout vertex. */
export const mapDeploymentZonePoints = <T extends DeploymentZoneShape>(
  zone: T,
  transform: (point: Point2) => Point2,
): T => ({
  ...zone,
  polygons: zone.polygons.map(({ outer, holes }) => ({
    outer: outer.map(transform),
    ...(holes ? { holes: holes.map((ring) => ring.map(transform)) } : {}),
  })),
});
