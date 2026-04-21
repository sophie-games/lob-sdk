import {
  GameMap,
  GameScenarioType,
  PresetScenario,
  SCENARIO_SCHEMA_VERSION,
  TerrainType,
} from "@lob-sdk/types";
import { LegacyPresetLoader } from "./legacy-preset-loader";

const buildMap = (): GameMap => ({
  width: 96,
  height: 64,
  terrains: [
    [TerrainType.Grass, TerrainType.Grass],
    [TerrainType.Grass, TerrainType.Grass],
    [TerrainType.Grass, TerrainType.Grass],
  ],
  heightMap: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  deploymentZones: [
    {
      team: 1,
      mainZone: { team: 1, x: 0, y: 0, width: 32, height: 32 },
      forwardZone: { team: 1, x: 0, y: 32, width: 32, height: 32 },
    },
    {
      team: 2,
      mainZone: { team: 2, x: 64, y: 0, width: 32, height: 32 },
      forwardZone: { team: 2, x: 64, y: 32, width: 32, height: 32 },
    },
  ],
});

const buildPreset = (): PresetScenario => ({
  type: GameScenarioType.Preset,
  name: "preset-fixture",
  description: "fixture",
  map: buildMap(),
  players: [
    { player: 1, team: 1 },
    { player: 2, team: 2 },
  ],
  units: [],
  objectives: [],
});

describe("LegacyPresetLoader", () => {
  const loader = new LegacyPresetLoader();

  it("canLoad recognizes a legacy preset shape", () => {
    expect(loader.canLoad(buildPreset())).toBe(true);
  });

  it("canLoad rejects other legacy types and the new schema", () => {
    expect(loader.canLoad({ ...buildPreset(), type: GameScenarioType.Hybrid as any })).toBe(false);
    expect(
      loader.canLoad({
        version: SCENARIO_SCHEMA_VERSION,
        name: "x",
        description: "x",
        instructions: [],
      }),
    ).toBe(false);
  });

  it("load attaches the preset map and forces fixed roster", () => {
    const preset = buildPreset();
    const result = loader.load(preset);

    expect(result.version).toBe(SCENARIO_SCHEMA_VERSION);
    expect(result.allowDynamicArmy).toBe(false);
    expect(result.map).toBe(preset.map);
    expect(result.map?.terrains).toBe(preset.map.terrains);
    expect(result.map?.deploymentZones).toEqual(preset.map.deploymentZones);
    expect(result.players).toHaveLength(2);
    expect(result.instructions).toBeUndefined();
  });
});
