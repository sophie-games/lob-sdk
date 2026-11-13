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

const clipDeploymentZoneToRect = (
  zone: TeamDeploymentZone,
  left: number,
  top: number,
  right: number,
  bottom: number,
): TeamDeploymentZone => {
  if (right <= left || bottom <= top || zone.polygons.length === 0)
    return { ...zone, polygons: [] };
  const rect: Polygon = [
    [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
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
        .intersection(subject, rect)
        .map(([clippedOuter, ...clippedHoles]) => ({
          outer: fromClipRing(clippedOuter),
          ...(clippedHoles.length
            ? { holes: clippedHoles.map(fromClipRing) }
            : {}),
        }));
    }),
  };
};

/** Splits a shared polygon across team seats without rotating its ground. */
export const clipDeploymentZoneToXRange = (
  zone: TeamDeploymentZone,
  left: number,
  right: number,
): TeamDeploymentZone => {
  if (zone.polygons.length === 0) return { ...zone, polygons: [] };
  const { top, bottom } = getDeploymentZoneBounds(zone);
  return clipDeploymentZoneToRect(zone, left, top - 1, right, bottom + 1);
};

/** A player's ground is never more than this many times deeper than it is wide. */
const MAX_PLAYER_DEPTH_RATIO = 2;

interface Cell {
  left: number;
  top: number;
  right: number;
  bottom: number;
  firstColumn: boolean;
  lastColumn: boolean;
  firstRow: boolean;
  lastRow: boolean;
}

/** Players per row, front to back: side by side until their ground turns into slivers. */
const rowSizes = (zone: TeamDeploymentZone, count: number): number[] => {
  const { width, height } = getDeploymentZoneBounds(zone);
  let rows = 1;
  while (
    rows < count &&
    height / rows > (width / Math.ceil(count / rows)) * MAX_PLAYER_DEPTH_RATIO
  ) {
    rows++;
  }
  return Array.from(
    { length: rows },
    (_, row) => Math.floor(count / rows) + (row < count % rows ? 1 : 0),
  );
};

/** Coordinate along one axis where the clipped ground reaches the target area. */
const cutAt = (
  measure: (edge: number) => number,
  low: number,
  high: number,
  target: number,
): number => {
  for (let iteration = 0; iteration < 32; iteration++) {
    const mid = (low + high) / 2;
    if (measure(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

/** Equal-area cells: rows cut across the depth, then each row across its width. */
const gridCells = (zone: TeamDeploymentZone, count: number): Cell[] => {
  const { left, top, right, bottom } = getDeploymentZoneBounds(zone);
  const totalArea = getDeploymentZoneArea(zone);
  if (totalArea <= 0) throw new Error("Cannot divide an empty deployment zone");
  const sizes = rowSizes(zone, count);
  const cells: Cell[] = [];
  let rowTop = top;
  let seated = 0;
  sizes.forEach((size, row) => {
    seated += size;
    const lastRow = row === sizes.length - 1;
    const rowBottom = lastRow
      ? bottom
      : cutAt(
          (edge) =>
            getDeploymentZoneArea(
              clipDeploymentZoneToRect(zone, left - 1, top, right + 1, edge),
            ),
          top,
          bottom,
          (totalArea * seated) / count,
        );
    const band = clipDeploymentZoneToRect(
      zone,
      left - 1,
      rowTop,
      right + 1,
      rowBottom,
    );
    const bandArea = getDeploymentZoneArea(band);
    let cellLeft = left;
    for (let column = 0; column < size; column++) {
      const lastColumn = column === size - 1;
      const cellRight = lastColumn
        ? right
        : cutAt(
            (edge) =>
              getDeploymentZoneArea(
                clipDeploymentZoneToRect(band, left, rowTop, edge, rowBottom),
              ),
            left,
            right,
            (bandArea * (column + 1)) / size,
          );
      cells.push({
        left: cellLeft,
        top: rowTop,
        right: cellRight,
        bottom: rowBottom,
        firstColumn: column === 0,
        lastColumn,
        firstRow: row === 0,
        lastRow,
      });
      cellLeft = cellRight;
    }
    rowTop = rowBottom;
  });
  return cells;
};

/** Whether all of `inner`'s ground lies inside `outer`. */
const surrounds = (
  outer: TeamDeploymentZone,
  inner: TeamDeploymentZone,
): boolean => {
  const innerArea = getDeploymentZoneArea(inner);
  const toClip = ({ polygons }: TeamDeploymentZone): Polygon[] =>
    polygons.map(({ outer: ring, holes }) => [
      toClipRing(ring),
      ...(holes ?? []).map(toClipRing),
    ]);
  const overlap = polygonClipping
    .intersection(toClip(outer), toClip(inner))
    .reduce(
      (sum, [ring, ...holes]) =>
        sum +
        getDeploymentZoneArea({
          polygons: [
            { outer: fromClipRing(ring), holes: holes.map(fromClipRing) },
          ],
        }),
      0,
    );
  return overlap >= innerArea * (1 - 1e-9);
};

const gridCache = new WeakMap<TeamDeploymentZone, Map<number, Cell[]>>();
const partCache = new WeakMap<
  TeamDeploymentZone,
  WeakMap<TeamDeploymentZone, Map<string, TeamDeploymentZone>>
>();
const surroundCache = new WeakMap<
  TeamDeploymentZone,
  WeakMap<TeamDeploymentZone, boolean>
>();

const cachedGrid = (zone: TeamDeploymentZone, count: number): Cell[] => {
  let byCount = gridCache.get(zone);
  if (!byCount) gridCache.set(zone, (byCount = new Map()));
  let cells = byCount.get(count);
  if (!cells) byCount.set(count, (cells = gridCells(zone, count)));
  return cells;
};

const cachedSurrounds = (
  outer: TeamDeploymentZone,
  inner: TeamDeploymentZone,
): boolean => {
  let byInner = surroundCache.get(outer);
  if (!byInner) surroundCache.set(outer, (byInner = new WeakMap()));
  let result = byInner.get(inner);
  if (result === undefined) byInner.set(inner, (result = surrounds(outer, inner)));
  return result;
};

/**
 * Shared ground is divided by usable area, including concavities and cutouts.
 * A zone that surrounds `guide` (a forward zone around its main zone) is cut
 * along the guide's lines, so each player's share surrounds their guide share.
 */
export const divideDeploymentZoneByArea = (
  zone: TeamDeploymentZone,
  index: number,
  count: number,
  guide?: TeamDeploymentZone,
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
  const source =
    guide && guide !== zone && cachedSurrounds(zone, guide) ? guide : zone;
  let bySource = partCache.get(zone);
  if (!bySource) partCache.set(zone, (bySource = new WeakMap()));
  let parts = bySource.get(source);
  if (!parts) bySource.set(source, (parts = new Map()));
  const key = `${count}:${index}`;
  const cached = parts.get(key);
  if (cached) return cached;

  const cell = cachedGrid(source, count)[index]!;
  // The outer cells reach the edge of the surrounding zone.
  const bounds = getDeploymentZoneBounds(zone);
  const part = clipDeploymentZoneToRect(
    zone,
    cell.firstColumn ? Math.min(cell.left, bounds.left) - 1 : cell.left,
    cell.firstRow ? Math.min(cell.top, bounds.top) - 1 : cell.top,
    cell.lastColumn ? Math.max(cell.right, bounds.right) + 1 : cell.right,
    cell.lastRow ? Math.max(cell.bottom, bounds.bottom) + 1 : cell.bottom,
  );
  parts.set(key, part);
  return part;
};
