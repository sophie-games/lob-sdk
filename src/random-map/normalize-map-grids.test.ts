import { normalizeMapGrids } from "./normalize-map-grids";
import { TerrainType } from "@lob-sdk/types";

const buildGrid = <T>(width: number, height: number, value: T): T[][] =>
  Array.from({ length: width }, () =>
    Array.from({ length: height }, () => value),
  );

describe("normalizeMapGrids", () => {
  it("pads a heightMap shorter than terrains up to the target dimensions", () => {
    const terrains = buildGrid(10, 8, TerrainType.Grass);
    const heightMap = buildGrid(10, 8, 7);
    heightMap.length = 6; // drop the last 4 columns (the real-world shape)

    const result = normalizeMapGrids(
      terrains,
      heightMap,
      10,
      8,
      TerrainType.Grass,
    );

    expect(result.repaired).toBe(true);
    expect(result.heightMap.length).toBe(10);
    expect(result.heightMap.every((col) => col.length === 8)).toBe(true);
    // Present heights preserved; missing columns filled with 0.
    expect(result.heightMap[0][0]).toBe(7);
    expect(result.heightMap[9][0]).toBe(0);
  });

  it("fills missing terrain tiles with the base terrain", () => {
    const terrains = buildGrid(4, 4, TerrainType.Grass);
    terrains[3] = []; // ragged: last column empty
    const heightMap = buildGrid(4, 4, 0);

    const result = normalizeMapGrids(
      terrains,
      heightMap,
      4,
      4,
      TerrainType.ShallowWater,
    );

    expect(result.repaired).toBe(true);
    expect(result.terrains[3][2]).toBe(TerrainType.ShallowWater);
    expect(result.terrains[0][0]).toBe(TerrainType.Grass);
  });

  it("leaves a well-formed pair unchanged in content and reports no repair", () => {
    const terrains = buildGrid(5, 6, TerrainType.Grass);
    terrains[2][3] = TerrainType.ShallowWater;
    const heightMap = buildGrid(5, 6, 3);

    const result = normalizeMapGrids(
      terrains,
      heightMap,
      5,
      6,
      TerrainType.Grass,
    );

    expect(result.repaired).toBe(false);
    expect(result.terrains).toEqual(terrains);
    expect(result.heightMap).toEqual(heightMap);
    // Deep-copied, not aliased.
    expect(result.terrains).not.toBe(terrains);
    expect(result.heightMap[0]).not.toBe(heightMap[0]);
  });

  it("truncates grids longer than the target dimensions", () => {
    const terrains = buildGrid(12, 10, TerrainType.Grass);
    const heightMap = buildGrid(12, 10, 1);

    const result = normalizeMapGrids(
      terrains,
      heightMap,
      10,
      8,
      TerrainType.Grass,
    );

    expect(result.repaired).toBe(true);
    expect(result.terrains.length).toBe(10);
    expect(result.terrains.every((col) => col.length === 8)).toBe(true);
    expect(result.heightMap.length).toBe(10);
  });
});
