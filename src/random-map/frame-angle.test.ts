import { RandomMapGenerator } from "./random-map-generator";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { InstructionType, Scenario, Size, TerrainType } from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "@lob-sdk/scenario";

// A caller can turn a procedural map's terrain by an angle, so a campaign battle lays its river
// or ridge the way it runs across the armies' line; the armies still deploy top and bottom.

const gdm = GameDataManager.get("napoleonic");
const { TILE_SIZE } = gdm.getGameConstants();
const { DeepWater } = TerrainType;

/** A band of deep water straight across the middle, left to right, on rolling ground. */
const riverScenario = (angle?: { min: number; max: number }): Scenario => ({
  version: SCENARIO_SCHEMA_VERSION,
  name: "River",
  description: "",
  allowDynamicArmy: true,
  ...(angle ? { parameters: { angle } } : {}),
  instructions: [
    {
      type: InstructionType.HeightNoise,
      noises: [{ scale: 10, multiplier: 1 }],
      mergeStrategy: "avg",
      min: 0,
      max: 5,
    },
    {
      type: InstructionType.TerrainRectangle,
      terrain: DeepWater,
      position: { type: "exact", coords: [50, 50] },
      width: 400,
      height: 4,
    },
  ],
});

const generate = (scenario: Scenario, angle?: number, seed = 42) =>
  new RandomMapGenerator().generate({
    scenario,
    dynamicBattleType: null,
    maxPlayers: 2,
    seed,
    tileSize: TILE_SIZE,
    era: "napoleonic",
    mapSize: Size.Medium,
    ...(angle !== undefined ? { parameters: { angle } } : {}),
  }).map;

/** The river's direction, in degrees clockwise from left-to-right, from its tiles' spread. */
function riverAngle(terrains: TerrainType[][]): number {
  const tiles: [number, number][] = [];
  terrains.forEach((column, x) => column.forEach((t, y) => t === DeepWater && tiles.push([x, y])));
  const mx = tiles.reduce((s, [x]) => s + x, 0) / tiles.length;
  const my = tiles.reduce((s, [, y]) => s + y, 0) / tiles.length;
  let cxx = 0, cyy = 0, cxy = 0;
  for (const [x, y] of tiles) {
    cxx += (x - mx) ** 2;
    cyy += (y - my) ** 2;
    cxy += (x - mx) * (y - my);
  }
  return (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
}

const steepestStep = (heightMap: number[][]) => {
  let steepest = 0;
  heightMap.forEach((column, x) =>
    column.forEach((h, y) => {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const n = heightMap[x + dx]?.[y + dy];
        if (n !== undefined) steepest = Math.max(steepest, Math.abs(h - n));
      }
    }),
  );
  return steepest;
};

describe("random map angle", () => {
  it("leaves the map exactly as before when no angle is passed", () => {
    const scenario = riverScenario({ min: -90, max: 90 });
    expect(generate(scenario)).toEqual(generate(scenario, 0));
    expect(generate(riverScenario())).toEqual(generate(scenario));
  });

  it.each([30, 45, 90, -60])("turns the terrain %i degrees clockwise and keeps the map's size", (angle) => {
    const scenario = riverScenario({ min: -90, max: 90 });
    const straight = generate(scenario);
    const turned = generate(scenario, angle);
    expect(turned.width).toBe(straight.width);
    expect(turned.height).toBe(straight.height);
    expect(Math.abs(riverAngle(straight.terrains))).toBeLessThan(2);
    // Directions are half-turn periodic: 90 and -90 are the same line.
    const error = ((riverAngle(turned.terrains) - angle + 270) % 180) - 90;
    expect(Math.abs(error)).toBeLessThan(4);
    // The river still crosses the middle of the map.
    const x = Math.floor(turned.terrains.length / 2);
    const y = Math.floor(turned.terrains[0].length / 2);
    expect(turned.terrains.slice(x - 3, x + 4).some((c) => c.slice(y - 3, y + 4).includes(DeepWater))).toBe(true);
    expect(steepestStep(turned.heightMap)).toBeLessThanOrEqual(1);
  });

  it("holds the angle to the range the scenario accepts", () => {
    const scenario = riverScenario({ min: -30, max: 30 });
    expect(generate(scenario, 90)).toEqual(generate(scenario, 30));
  });

  it("ignores the angle when the scenario accepts none", () => {
    expect(generate(riverScenario(), 45)).toEqual(generate(riverScenario()));
  });

  it.each([30, 45, -20])("draws roads, streams and walls whole when turned %i degrees", (angle) => {
    // A 1-tile road across the map, a 1-tile stream down it, and a walled enclosure.
    const scenario: Scenario = {
      ...riverScenario({ min: -90, max: 90 }),
      instructions: [
        { type: InstructionType.NaturalPath, terrain: TerrainType.Road, between: "left-right", range: { min: 30, max: 30 }, width: 1, amount: { min: 1, max: 1 } },
        { type: InstructionType.NaturalPath, terrain: TerrainType.ShallowWater, between: "top-bottom", range: { min: 70, max: 70 }, width: 1, amount: { min: 1, max: 1 } },
        {
          type: InstructionType.TerrainRectangle,
          terrain: TerrainType.Building,
          position: { type: "exact", coords: [35, 65] },
          width: 4,
          height: 4,
          border: { width: 1, terrain: TerrainType.Rampart },
        },
      ],
    };
    const groups = (terrains: TerrainType[][], terrain: TerrainType, diagonal: boolean) => {
      const seen = new Set<string>();
      let count = 0;
      terrains.forEach((column, x) =>
        column.forEach((t, y) => {
          if (t !== terrain || seen.has(`${x},${y}`)) return;
          count++;
          const stack = [[x, y]];
          seen.add(`${x},${y}`);
          while (stack.length) {
            const [cx, cy] = stack.pop()!;
            for (let dx = -1; dx <= 1; dx++)
              for (let dy = -1; dy <= 1; dy++) {
                if (!diagonal && dx && dy) continue;
                const [nx, ny] = [cx + dx, cy + dy];
                if (terrains[nx]?.[ny] === terrain && !seen.has(`${nx},${ny}`)) {
                  seen.add(`${nx},${ny}`);
                  stack.push([nx, ny]);
                }
              }
          }
        }),
      );
      return count;
    };
    const straight = generate(scenario).terrains;
    const turned = generate(scenario, angle).terrains;
    // As many pieces as when drawn straight: the stream cuts the road where they cross.
    expect(groups(turned, TerrainType.Road, true)).toBe(groups(straight, TerrainType.Road, true));
    // Water and walls must hold side to side, or troops would slip through a diagonal gap.
    expect(groups(turned, TerrainType.ShallowWater, false)).toBe(groups(straight, TerrainType.ShallowWater, false));
    expect(groups(turned, TerrainType.Rampart, false)).toBe(1);
  });
});
