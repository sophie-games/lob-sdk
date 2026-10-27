import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GenerateRandomMapProps, InstructionType, Scenario, TerrainType } from "@lob-sdk/types";
import { RandomMapGenerator } from "./random-map-generator";
import { resolveMapSizing } from "./resolve-map-sizing";
import { SizedMapGenerator } from "./sized-map-generator";

const scenario = {
  name: "sized",
  instructions: [
    { type: InstructionType.HeightNoise, noises: [{ scale: 12 }], min: 0, max: 6 },
    { type: InstructionType.TerrainNoise, terrain: TerrainType.Forest, scale: 8, ranges: [{ min: 0.6, max: 1 }] },
  ],
} as unknown as Scenario;

const props: GenerateRandomMapProps = {
  scenario,
  dynamicBattleType: null,
  maxPlayers: 2,
  seed: 11,
  tileSize: GameDataManager.get("napoleonic").getGameConstants().TILE_SIZE,
  era: "napoleonic",
};

describe("SizedMapGenerator", () => {
  it("generates what RandomMapGenerator does, given the sizing it resolves", () => {
    expect(new SizedMapGenerator().generate(props, resolveMapSizing(props))).toEqual(
      new RandomMapGenerator().generate(props),
    );
  });

  it("resolves the battle size from the battle type and player count, or the caller's override", () => {
    const sizing = resolveMapSizing({ ...props, mapSize: "xl" as never });
    expect(sizing.battleSize).toBe("xl");
    expect(sizing.mapSizes.xl.map.tilesX).toBeGreaterThan(0);
  });

  const steepestStep = (generated: Scenario) => {
    const { heightMap } = new RandomMapGenerator().generate({ ...props, scenario: generated }).map;
    let steepest = 0;
    for (let x = 0; x < heightMap.length - 1; x++) {
      for (let y = 0; y < heightMap[0].length - 1; y++) {
        steepest = Math.max(
          steepest,
          Math.abs(heightMap[x][y] - heightMap[x + 1][y]),
          Math.abs(heightMap[x][y] - heightMap[x][y + 1]),
        );
      }
    }
    return steepest;
  };
  const steep = {
    ...scenario,
    instructions: [{ type: InstructionType.HeightNoise, noises: [{ scale: 2 }], min: 0, max: 40 }],
  } as unknown as Scenario;

  it("lets neighbouring tiles differ by up to the era's height step", () => {
    const { maxLevelDiff } = GameDataManager.get("napoleonic").getGameRules().height!;
    expect(steepestStep(steep)).toBe(maxLevelDiff);
  });

  it("lets a scenario's maxHeightStep override the era's height step", () => {
    expect(steepestStep({ ...steep, maxHeightStep: 1 })).toBe(1);
  });

  it.each(["plains", "iberia"])("sows %s's farmland, which its height markers grow from", (name) => {
    const terrains = new RandomMapGenerator()
      .generate({ ...props, scenario: GameDataManager.get("napoleonic").getScenario(name) })
      .map.terrains.flat();
    const farmland = [TerrainType.Farm, TerrainType.FarmGrowing, TerrainType.FarmUnplanted];
    expect(terrains.filter((terrain) => farmland.includes(terrain)).length).toBeGreaterThan(0);
  });

  it("clears the forest's small clusters with REPLACE_SMALL_CLUSTERS", () => {
    const forestTiles = (instructions: unknown[]) =>
      new RandomMapGenerator()
        .generate({ ...props, scenario: { ...scenario, instructions } as Scenario })
        .map.terrains.flat()
        .filter((terrain) => terrain === TerrainType.Forest).length;
    const replace = {
      type: InstructionType.ReplaceSmallClusters,
      fromTerrain: TerrainType.Forest,
      toTerrain: TerrainType.Grass,
      maxSize: 1_000_000,
    };

    const forest = scenario.instructions!;

    expect(forestTiles(forest)).toBeGreaterThan(0);
    expect(forestTiles([...forest, replace])).toBe(0);
  });
});
