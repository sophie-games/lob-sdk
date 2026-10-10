import {
  getDeploymentZoneArea,
  getClosestPointInsideDeploymentZone,
  isInsideDeploymentZone,
  isValidDeploymentPolygon,
  isValidDeploymentRing,
  polygonFromBounds,
} from "./deployment-zone";
import {
  clipDeploymentZoneToXRange,
  divideDeploymentZoneByArea,
} from "./deployment-zone-partition";
import type { TeamDeploymentZone } from "@lob-sdk/types";

const zone: TeamDeploymentZone = {
  team: 1,
  type: "main",
  rotation: Math.PI / 2,
  polygons: [
    {
      outer: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 12 },
        { x: 8, y: 12 },
        { x: 8, y: 4 },
        { x: 0, y: 4 },
      ],
      holes: [
        [
          { x: 9, y: 1 },
          { x: 11, y: 1 },
          { x: 11, y: 3 },
          { x: 9, y: 3 },
        ],
      ],
    },
  ],
};

describe("polygon deployment geometry", () => {
  it("rejects crossed, flat, and self-intersecting boundaries", () => {
    expect(
      isValidDeploymentRing([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 },
        { x: 4, y: 0 },
      ]),
    ).toBe(false);
    expect(
      isValidDeploymentRing([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 8, y: 0 },
      ]),
    ).toBe(false);
    expect(isValidDeploymentRing(polygonFromBounds(0, 0, 4, 4).outer)).toBe(
      true,
    );
  });

  it("accepts contained cutouts and rejects cutouts crossing the boundary", () => {
    const outer = polygonFromBounds(0, 0, 10, 10).outer;
    expect(
      isValidDeploymentPolygon({
        outer,
        holes: [polygonFromBounds(2, 2, 4, 4).outer],
      }),
    ).toBe(true);
    expect(
      isValidDeploymentPolygon({
        outer,
        holes: [polygonFromBounds(8, 8, 12, 12).outer],
      }),
    ).toBe(false);
  });

  it("keeps the authored shape in place when facing changes", () => {
    expect(isInsideDeploymentZone(zone, { x: 2, y: 2 })).toBe(true);
    expect(isInsideDeploymentZone(zone, { x: 2, y: 8 })).toBe(false);
    expect(
      isInsideDeploymentZone({ ...zone, rotation: 0 }, { x: 2, y: 2 }),
    ).toBe(true);
  });

  it("clips concave ground and protected holes to the nearest allowed edge", () => {
    expect(
      getClosestPointInsideDeploymentZone(zone, { x: 2, y: 8 }).toPoint(),
    ).toEqual({ x: 2, y: 4 });
    expect(
      getClosestPointInsideDeploymentZone(zone, { x: 10, y: 2 }).toPoint(),
    ).toEqual({ x: 10, y: 1 });
  });

  it("uses the nearest disconnected piece", () => {
    const separate = {
      ...zone,
      polygons: [
        polygonFromBounds(0, 0, 2, 2),
        polygonFromBounds(10, 0, 12, 2),
      ],
    };
    expect(
      getClosestPointInsideDeploymentZone(separate, { x: 9, y: 1 }).toPoint(),
    ).toEqual({ x: 10, y: 1 });
  });

  it("partitions a shared polygon without changing its facing", () => {
    const shared = { ...zone, polygons: [polygonFromBounds(0, 0, 12, 12)] };
    const left = clipDeploymentZoneToXRange(shared, 0, 6);
    expect(left.rotation).toBe(Math.PI / 2);
    expect(isInsideDeploymentZone(left, { x: 5, y: 8 })).toBe(true);
    expect(isInsideDeploymentZone(left, { x: 7, y: 8 })).toBe(false);
  });

  it("keeps concave slices out of the disconnected gap", () => {
    const uShaped = {
      ...zone,
      polygons: [
        {
          outer: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 2 },
            { x: 2, y: 2 },
            { x: 2, y: 8 },
            { x: 10, y: 8 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
        },
      ],
    };
    const clipped = clipDeploymentZoneToXRange(uShaped, 5, 10);
    expect(isInsideDeploymentZone(clipped, { x: 7, y: 1 })).toBe(true);
    expect(isInsideDeploymentZone(clipped, { x: 7, y: 5 })).toBe(false);
    expect(
      getClosestPointInsideDeploymentZone(clipped, { x: 7, y: 5 }).toPoint(),
    ).toEqual({ x: 7, y: 2 });
  });

  it("does not turn an edge touch into an empty player area", () => {
    const shared = { ...zone, polygons: [polygonFromBounds(0, 0, 12, 12)] };
    expect(clipDeploymentZoneToXRange(shared, 12, 20).polygons).toEqual([]);
  });

  it("divides disconnected ground by usable area without giving a player a gap", () => {
    const separated = {
      ...zone,
      polygons: [
        polygonFromBounds(0, 0, 10, 10),
        polygonFromBounds(20, 0, 30, 10),
      ],
    };
    const parts = [0, 1, 2, 3].map((index) =>
      divideDeploymentZoneByArea(separated, index, 4),
    );
    parts.forEach((part) =>
      expect(getDeploymentZoneArea(part)).toBeCloseTo(50),
    );
    expect(parts.every((part) => part.polygons.length > 0)).toBe(true);
    expect(divideDeploymentZoneByArea(separated, 2, 4)).toBe(parts[2]);
  });
});
