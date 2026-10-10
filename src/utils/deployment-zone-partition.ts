import type { TeamDeploymentZone } from "@lob-sdk/types";
import type { Point2 } from "@lob-sdk/vector";
import polygonClipping from "polygon-clipping";
import type { Pair, Polygon, Ring } from "polygon-clipping";
import {
  getDeploymentZoneArea,
  getDeploymentZoneBounds,
} from "./deployment-zone";

const toClipRing = (ring: Point2[]): Ring =>
  ring.map(({ x, y }): Pair => [x, y]);

const fromClipRing = (ring: Ring): Point2[] => {
  const points =
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring;
  return points.map(([x, y]) => ({ x, y }));
};

/** Splits a shared polygon across team seats without rotating its ground. */
export const clipDeploymentZoneToXRange = (
  zone: TeamDeploymentZone,
  left: number,
  right: number,
): TeamDeploymentZone => {
  if (right <= left || zone.polygons.length === 0)
    return { ...zone, polygons: [] };
  const { top, bottom } = getDeploymentZoneBounds(zone);
  const slab: Polygon = [
    [
      [left, top - 1],
      [right, top - 1],
      [right, bottom + 1],
      [left, bottom + 1],
    ],
  ];
  return {
    ...zone,
    polygons: zone.polygons.flatMap(({ outer, holes }) => {
      const subject: Polygon = [
        toClipRing(outer),
        ...(holes ?? []).map(toClipRing),
      ];
      return polygonClipping
        .intersection(subject, slab)
        .map(([clippedOuter, ...clippedHoles]) => ({
          outer: fromClipRing(clippedOuter),
          ...(clippedHoles.length
            ? { holes: clippedHoles.map(fromClipRing) }
            : {}),
        }));
    }),
  };
};

/** Shared ground is divided by usable area, including concavities and cutouts. */
const divisionCache = new WeakMap<
  TeamDeploymentZone,
  Map<
    number,
    {
      edges: Map<number, number>;
      parts: Map<number, TeamDeploymentZone>;
    }
  >
>();

export const divideDeploymentZoneByArea = (
  zone: TeamDeploymentZone,
  index: number,
  count: number,
): TeamDeploymentZone => {
  if (
    !Number.isInteger(count) ||
    !Number.isInteger(index) ||
    count <= 0 ||
    index < 0 ||
    index >= count
  ) {
    throw new Error("Cannot divide an empty deployment zone");
  }
  if (count === 1) {
    if (getDeploymentZoneArea(zone) <= 0)
      throw new Error("Cannot divide an empty deployment zone");
    return zone;
  }
  let byCount = divisionCache.get(zone);
  if (!byCount) {
    byCount = new Map();
    divisionCache.set(zone, byCount);
  }
  let cache = byCount.get(count);
  if (cache?.parts.has(index)) return cache.parts.get(index)!;
  if (!cache) {
    cache = { edges: new Map(), parts: new Map() };
    byCount.set(count, cache);
  }
  const { left, right } = getDeploymentZoneBounds(zone);
  const totalArea = getDeploymentZoneArea(zone);
  if (totalArea <= 0) throw new Error("Cannot divide an empty deployment zone");
  const edgeAt = (share: number): number => {
    if (share === 0) return left;
    if (share === 1) return right;
    const cached = cache.edges.get(share);
    if (cached !== undefined) return cached;
    let low = left;
    let high = right;
    for (let iteration = 0; iteration < 32; iteration++) {
      const mid = (low + high) / 2;
      const area = getDeploymentZoneArea(
        clipDeploymentZoneToXRange(zone, left, mid),
      );
      if (area < totalArea * share) low = mid;
      else high = mid;
    }
    const edge = (low + high) / 2;
    cache.edges.set(share, edge);
    return edge;
  };
  const part = clipDeploymentZoneToXRange(
    zone,
    edgeAt(index / count),
    edgeAt((index + 1) / count),
  );
  cache.parts.set(index, part);
  return part;
};
