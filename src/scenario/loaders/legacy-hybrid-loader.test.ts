import {
  GameMap,
  GameScenarioType,
  HybridScenario,
  SCENARIO_SCHEMA_VERSION,
  TerrainType,
} from "@lob-sdk/types";
import { LegacyHybridLoader } from "./legacy-hybrid-loader";

const buildMap = (): GameMap => ({
  width: 32,
  height: 32,
  terrains: [[TerrainType.Grass]],
  heightMap: [[0]],
});

const buildHybrid = (overrides: Partial<HybridScenario> = {}): HybridScenario => ({
  type: GameScenarioType.Hybrid,
  name: "hybrid-fixture",
  description: "fixture",
  map: buildMap(),
  ...overrides,
});

describe("LegacyHybridLoader", () => {
  const loader = new LegacyHybridLoader();

  it("canLoad recognizes a legacy hybrid shape", () => {
    expect(loader.canLoad(buildHybrid())).toBe(true);
  });

  it("canLoad rejects other types and current schema", () => {
    expect(
      loader.canLoad({
        ...buildHybrid(),
        type: GameScenarioType.Preset as any,
      } as any),
    ).toBe(false);
    expect(
      loader.canLoad({
        version: SCENARIO_SCHEMA_VERSION,
        name: "x",
        description: "x",
        instructions: [],
      }),
    ).toBe(false);
  });

  it("load with fixedArmy:true => allowDynamicArmy:false (fixed roster)", () => {
    const result = loader.load(buildHybrid({ fixedArmy: true }));
    expect(result.allowDynamicArmy).toBe(false);
  });

  it("load without fixedArmy => allowDynamicArmy:true (deployment phase)", () => {
    const result = loader.load(buildHybrid());
    expect(result.allowDynamicArmy).toBe(true);
  });

  it("load with fixedArmy:false => allowDynamicArmy:true", () => {
    const result = loader.load(buildHybrid({ fixedArmy: false }));
    expect(result.allowDynamicArmy).toBe(true);
  });

  it("load attaches the hybrid map and defaults missing units/objectives to empty", () => {
    const hybrid = buildHybrid();
    const result = loader.load(hybrid);
    expect(result.map).toBe(hybrid.map);
    expect(result.units).toEqual([]);
    expect(result.objectives).toEqual([]);
    expect(result.instructions).toBeUndefined();
  });
});
