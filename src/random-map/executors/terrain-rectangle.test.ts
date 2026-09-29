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

describe("TerrainRectangleExecutor skipBlocked", () => {
  /** Groups the tiles of a terrain into 4-connected patches and returns each patch's bounding box. */
  function patches(terrains: TerrainType[][], terrain: TerrainType) {
    const seen = new Set<string>();
    const boxes: { w: number; h: number; tiles: number }[] = [];
    for (const [sx, sy] of tilesOf(terrains, terrain)) {
      if (seen.has(`${sx},${sy}`)) continue;
      const stack = [[sx, sy]];
      seen.add(`${sx},${sy}`);
      let [x0, y0, x1, y1, tiles] = [sx, sy, sx, sy, 0];
      while (stack.length) {
        const [x, y] = stack.pop()!;
        tiles++;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
          if (terrains[nx]?.[ny] === terrain && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
      }
      boxes.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, tiles });
    }
    return boxes;
  }

  it.each([1, 42, 777])(
    "draws each field whole or not at all, so fields never merge into long bands (seed %i)",
    (seed) => {
      // Fields scattered along a road: without skipBlocked, a field that overlaps an earlier
      // one fills only the leftover grass and the two read as one stretched field.
      const { terrains, heightMap } = grassMap();
      for (let y = 0; y < SIZE; y++) terrains[30][y] = TerrainType.Road;
      run(
        {
          terrain: TerrainType.Farm,
          width: 4,
          height: 4,
          position: { type: "range", min: [0, 0], max: [100, 100] },
          terrainFilter: { terrains: [TerrainType.Road], searchRadius: 5 },
          excludeTerrains: [TerrainType.Road, TerrainType.Farm],
          skipBlocked: true,
          scatter: { count: 30, minWidth: 4, maxWidth: 5, minHeight: 4, maxHeight: 5 },
        },
        terrains,
        heightMap,
        seed,
      );
      const fields = patches(terrains, TerrainType.Farm);
      expect(fields.length).toBeGreaterThan(5);
      for (const field of fields) {
        // A lone rectangle fills its bounding box; two touching ones would span twice its side.
        expect(Math.max(field.w, field.h)).toBeLessThanOrEqual(6);
        expect(field.tiles).toBe(field.w * field.h);
      }
      expect(terrains[30].every((t) => t === TerrainType.Road)).toBe(true);
    },
  );

  it("lets a field of another crop sit right beside it", () => {
    // Plains' fields cluster: neighbours of different crops share an edge, each still whole.
    const { terrains, heightMap } = grassMap();
    // `exact` coords are percentages of the map; this takes the centre in tiles.
    const field = (terrain: TerrainType, x: number) =>
      run(
        {
          terrain,
          width: 4,
          height: 4,
          position: { type: "exact", coords: [((x + 0.5) * 100) / SIZE, 50] },
          excludeTerrains: [TerrainType.Farm, TerrainType.FarmGrowing],
          skipBlocked: true,
        },
        terrains,
        heightMap,
        1,
      );
    field(TerrainType.Farm, 20);
    field(TerrainType.FarmGrowing, 25);
    // Covers the growing field: skipped rather than drawn around it.
    field(TerrainType.Farm, 27);
    expect(tilesOf(terrains, TerrainType.Farm)).toHaveLength(25);
    expect(tilesOf(terrains, TerrainType.FarmGrowing)).toHaveLength(25);
  });

  it("tries each blocked copy elsewhere as many times as its scatter allows", () => {
    // Crowded fields along a road: with one try, a blocked copy is simply dropped.
    const sowAlongRoad = (tries?: number) => {
      const { terrains, heightMap } = grassMap();
      for (let y = 0; y < SIZE; y++) terrains[30][y] = TerrainType.Road;
      run(
        {
          terrain: TerrainType.Farm,
          width: 4,
          height: 4,
          position: { type: "range", min: [0, 0], max: [100, 100] },
          terrainFilter: { terrains: [TerrainType.Road], searchRadius: 5 },
          excludeTerrains: [TerrainType.Road, TerrainType.Farm],
          skipBlocked: true,
          scatter: { count: 40, minWidth: 4, maxWidth: 5, minHeight: 4, maxHeight: 5, ...(tries ? { tries } : {}) },
        },
        terrains,
        heightMap,
        42,
      );
      return tilesOf(terrains, TerrainType.Farm).length;
    };
    expect(sowAlongRoad(1)).toBeLessThan(sowAlongRoad());
  });
});
