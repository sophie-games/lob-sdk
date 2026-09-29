import { TerrainRectangleExecutor } from "./terrain-rectangle";
import {
  InstructionTerrainRectangle,
  InstructionType,
  Scenario,
  TerrainType,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "@lob-sdk/scenario";

// `terrainFilter` places a rectangle relative to the ground already drawn - a village at a
// bridge, a redoubt on a crest - and `excludeTerrains` keeps its fill off ground it must not bury.

const scenario: Scenario = {
  version: SCENARIO_SCHEMA_VERSION,
  name: "Placement",
  description: "",
  instructions: [],
};

const SIZE = 60;
const BRIDGE_X = 15;
const BRIDGE_Y = 42;

function grassMap(): { terrains: TerrainType[][]; heightMap: number[][] } {
  const terrains = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(TerrainType.Grass),
  );
  const heightMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  return { terrains, heightMap };
}

function run(
  instruction: Omit<InstructionTerrainRectangle, "type">,
  terrains: TerrainType[][],
  heightMap: number[][],
  seed: number,
) {
  new TerrainRectangleExecutor(
    { type: InstructionType.TerrainRectangle, ...instruction },
    scenario,
    seed,
    0,
    terrains,
    heightMap,
  ).execute();
}

function tilesOf(terrains: TerrainType[][], terrain: TerrainType) {
  const tiles: [number, number][] = [];
  terrains.forEach((column, x) =>
    column.forEach((t, y) => {
      if (t === terrain) tiles.push([x, y]);
    }),
  );
  return tiles;
}

describe("TerrainRectangleExecutor terrainFilter", () => {
  it.each([1, 42, 777, 2024])(
    "draws a village beside the bridge and leaves the bridge standing (seed %i)",
    (seed) => {
      const { terrains, heightMap } = grassMap();
      terrains[BRIDGE_X][BRIDGE_Y] = TerrainType.Bridge;

      run(
        {
          terrain: TerrainType.Building,
          width: 3,
          height: 3,
          position: { type: "range", min: [0, 0], max: [100, 100] },
          terrainFilter: { terrains: [TerrainType.Bridge], searchRadius: 3 },
          excludeTerrains: [TerrainType.Bridge],
        },
        terrains,
        heightMap,
        seed,
      );

      expect(terrains[BRIDGE_X][BRIDGE_Y]).toBe(TerrainType.Bridge);
      const buildings = tilesOf(terrains, TerrainType.Building);
      expect(buildings.length).toBeGreaterThan(0);
      // The centre is within 3 steps of the bridge, so no tile of a 3x3 lies further than 4.
      for (const [x, y] of buildings) {
        expect(
          Math.max(Math.abs(x - BRIDGE_X), Math.abs(y - BRIDGE_Y)),
        ).toBeLessThanOrEqual(4);
      }
    },
  );

  it.each([1, 42, 777])(
    "lands every scattered copy on ground the filter accepts (seed %i)",
    (seed) => {
      const { terrains, heightMap } = grassMap();
      // A plateau at height 6 in one corner; the rest of the map lies at 0.
      for (let x = 36; x < 54; x++)
        for (let y = 36; y < 54; y++) heightMap[x][y] = 6;

      run(
        {
          terrain: TerrainType.Redoubt,
          width: 1,
          height: 1,
          position: { type: "range", min: [0, 0], max: [100, 100] },
          scatter: { count: 6 },
          terrainFilter: { heights: [{ min: 6, max: 7 }] },
        },
        terrains,
        heightMap,
        seed,
      );

      const redoubts = tilesOf(terrains, TerrainType.Redoubt);
      expect(redoubts.length).toBeGreaterThan(0);
      for (const [x, y] of redoubts) expect(heightMap[x][y]).toBe(6);
    },
  );

  it("draws nothing when no ground matches", () => {
    const { terrains, heightMap } = grassMap();
    run(
      {
        terrain: TerrainType.Building,
        width: 3,
        height: 3,
        position: { type: "range", min: [0, 0], max: [100, 100] },
        terrainFilter: { terrains: [TerrainType.Bridge], searchRadius: 2 },
      },
      terrains,
      heightMap,
      7,
    );
    expect(tilesOf(terrains, TerrainType.Building)).toHaveLength(0);
  });

  it("keeps the rectangle's centre inside its position range", () => {
    const { terrains, heightMap } = grassMap();
    // Bridges at both ends of the map; the range allows only the left one.
    terrains[5][30] = TerrainType.Bridge;
    terrains[55][30] = TerrainType.Bridge;
    for (const seed of [1, 2, 3, 4, 5]) {
      const grid = terrains.map((column) => [...column]);
      run(
        {
          terrain: TerrainType.Building,
          width: 1,
          height: 1,
          position: { type: "range", min: [0, 0], max: [30, 100] },
          terrainFilter: { terrains: [TerrainType.Bridge], searchRadius: 2 },
          excludeTerrains: [TerrainType.Bridge],
        },
        grid,
        heightMap,
        seed,
      );
      for (const [x] of tilesOf(grid, TerrainType.Building))
        expect(x).toBeLessThan(18);
    }
  });
});

describe("TerrainRectangleExecutor excludeTerrains", () => {
  it("leaves the listed ground as it was under the fill", () => {
    const { terrains, heightMap } = grassMap();
    terrains[BRIDGE_X][BRIDGE_Y] = TerrainType.Bridge;
    run(
      {
        terrain: TerrainType.Forest,
        width: 9,
        height: 9,
        position: { type: "exact", coords: [25, 70] },
        excludeTerrains: [TerrainType.Bridge],
      },
      terrains,
      heightMap,
      3,
    );
    expect(terrains[BRIDGE_X][BRIDGE_Y]).toBe(TerrainType.Bridge);
    expect(terrains[BRIDGE_X + 1][BRIDGE_Y]).toBe(TerrainType.Forest);
  });
});
