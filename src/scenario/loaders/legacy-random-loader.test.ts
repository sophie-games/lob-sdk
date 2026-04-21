import {
  GameScenarioType,
  InstructionType,
  RandomScenario,
  RandomTeamDeploymentZones,
  SCENARIO_SCHEMA_VERSION,
  TerrainType,
} from "@lob-sdk/types";
import { LegacyRandomLoader } from "./legacy-random-loader";

const sampleZones: RandomTeamDeploymentZones = {
  topMainDeploymentZone: { minX: 0, maxX: 50, minY: 0, maxY: 25, width: 30, height: 20 },
  topForwardDeploymentZone: { minX: 0, maxX: 50, minY: 25, maxY: 50, width: 30, height: 20 },
  bottomMainDeploymentZone: { minX: 50, maxX: 100, minY: 75, maxY: 100, width: 30, height: 20 },
  bottomForwardDeploymentZone: { minX: 50, maxX: 100, minY: 50, maxY: 75, width: 30, height: 20 },
};

const buildRandom = (overrides: Partial<RandomScenario> = {}): RandomScenario => ({
  type: GameScenarioType.Random,
  name: "random-fixture",
  description: "fixture",
  baseTerrain: TerrainType.Grass,
  instructions: [
    {
      type: InstructionType.HeightNoise,
      noises: [{ scale: 50, multiplier: 1, offset: 0, reversed: false }],
      mergeStrategy: "avg",
      min: 0,
      max: 5,
    },
  ],
  ...overrides,
});

describe("LegacyRandomLoader", () => {
  const loader = new LegacyRandomLoader();

  it("canLoad recognizes a legacy random shape", () => {
    expect(loader.canLoad(buildRandom())).toBe(true);
  });

  it("canLoad rejects other types", () => {
    expect(
      loader.canLoad({
        version: SCENARIO_SCHEMA_VERSION,
        name: "x",
        description: "x",
        instructions: [],
      }),
    ).toBe(false);
  });

  it("load preserves instructions and baseTerrain, sets allowDynamicArmy:true", () => {
    const result = loader.load(buildRandom());
    expect(result.allowDynamicArmy).toBe(true);
    expect(result.baseTerrain).toBe(TerrainType.Grass);
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions?.[0].type).toBe(InstructionType.HeightNoise);
    expect(result.map).toBeUndefined();
  });

  it("load maps defaultDeploymentZones => randomDeploymentZones", () => {
    const result = loader.load(buildRandom({ defaultDeploymentZones: sampleZones }));
    expect(result.randomDeploymentZones).toEqual(sampleZones);
  });

  it("load preserves scaledDeploymentZones", () => {
    const scaled = { 0: sampleZones, 1: sampleZones, 2: sampleZones, 3: sampleZones };
    const result = loader.load(buildRandom({ scaledDeploymentZones: scaled as any }));
    expect(result.scaledDeploymentZones).toEqual(scaled);
  });
});
