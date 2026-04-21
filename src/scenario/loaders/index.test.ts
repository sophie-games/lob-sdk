import {
  GameMap,
  GameScenarioType,
  HybridScenario,
  PresetScenario,
  RandomScenario,
  Scenario,
  SCENARIO_SCHEMA_VERSION,
  TerrainType,
} from "@lob-sdk/types";
import { normalizeScenario } from "./index";

const buildMap = (): GameMap => ({
  width: 32,
  height: 32,
  terrains: [[TerrainType.Grass]],
  heightMap: [[0]],
});

describe("normalizeScenario", () => {
  it("returns current-schema scenarios unchanged", () => {
    const scenario: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "already-current",
      description: "test",
      instructions: [],
      allowDynamicArmy: true,
    };
    expect(normalizeScenario(scenario)).toBe(scenario);
  });

  it("dispatches preset to LegacyPresetLoader", () => {
    const preset: PresetScenario = {
      type: GameScenarioType.Preset,
      name: "p",
      description: "p",
      map: buildMap(),
      players: [{ player: 1, team: 1 }],
      units: [],
      objectives: [],
    };
    const result = normalizeScenario(preset);
    expect(result.allowDynamicArmy).toBe(false);
    expect(result.map).toBe(preset.map);
  });

  it("dispatches hybrid to LegacyHybridLoader (fixedArmy:true)", () => {
    const hybrid: HybridScenario = {
      type: GameScenarioType.Hybrid,
      name: "h",
      description: "h",
      map: buildMap(),
      fixedArmy: true,
    };
    const result = normalizeScenario(hybrid);
    expect(result.allowDynamicArmy).toBe(false);
  });

  it("dispatches hybrid to LegacyHybridLoader (no fixedArmy)", () => {
    const hybrid: HybridScenario = {
      type: GameScenarioType.Hybrid,
      name: "h",
      description: "h",
      map: buildMap(),
    };
    const result = normalizeScenario(hybrid);
    expect(result.allowDynamicArmy).toBe(true);
  });

  it("dispatches random to LegacyRandomLoader", () => {
    const random: RandomScenario = {
      type: GameScenarioType.Random,
      name: "r",
      description: "r",
      instructions: [],
    };
    const result = normalizeScenario(random);
    expect(result.allowDynamicArmy).toBe(true);
    expect(result.instructions).toEqual([]);
  });

  it("throws when no loader can handle the input", () => {
    expect(() =>
      normalizeScenario({
        type: "unknown" as GameScenarioType,
        name: "bad",
        description: "bad",
      } as PresetScenario),
    ).toThrow(/No loader can handle scenario/);
  });
});
