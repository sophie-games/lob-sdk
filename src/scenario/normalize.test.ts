import {
  GameMap,
  GameScenarioType,
  LegacyHybridScenario,
  InstructionType,
  LegacyPresetScenario,
  LegacyRandomScenario,
  Scenario,
  TerrainType,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "./constants";
import { normalizeScenario } from "./normalize";

const buildPresetMap = (): GameMap => ({
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
      zones: [
        { team: 1, type: "main", x: 0, y: 0, width: 32, height: 32 },
        { team: 1, type: "forward", x: 0, y: 32, width: 32, height: 32 },
      ],
    },
    {
      team: 2,
      zones: [
        { team: 2, type: "main", x: 64, y: 0, width: 32, height: 32 },
        { team: 2, type: "forward", x: 64, y: 32, width: 32, height: 32 },
      ],
    },
  ],
});

const buildSmallMap = (): GameMap => ({
  width: 32,
  height: 32,
  terrains: [[TerrainType.Grass]],
  heightMap: [[0]],
});

const buildPreset = (): LegacyPresetScenario => ({
  type: GameScenarioType.Preset,
  name: "preset-fixture",
  description: "fixture",
  map: buildPresetMap(),
  players: [
    { player: 1, team: 1 },
    { player: 2, team: 2 },
  ],
  units: [],
  objectives: [],
});

const buildHybrid = (
  overrides: Partial<LegacyHybridScenario> = {},
): LegacyHybridScenario => ({
  type: GameScenarioType.Hybrid,
  name: "hybrid-fixture",
  description: "fixture",
  map: buildSmallMap(),
  ...overrides,
});

const buildRandom = (
  overrides: Partial<LegacyRandomScenario> = {},
): LegacyRandomScenario => ({
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

describe("normalizeScenario", () => {
  it("returns current-schema scenarios unchanged when the feature flags are already set", () => {
    const scenario: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "already-current",
      description: "test",
      instructions: [],
      allowDynamicArmy: true,
      allowDeploymentPhase: true,
      placeableObjectives: false,
    };
    expect(normalizeScenario(scenario)).toBe(scenario);
  });

  it("backfills allowDeploymentPhase from allowDynamicArmy on current-schema scenarios without it", () => {
    const dynamic: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "dynamic",
      description: "",
      instructions: [],
      allowDynamicArmy: true,
    };
    const preset: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "preset",
      description: "",
      allowDynamicArmy: false,
    };
    expect(normalizeScenario(dynamic).allowDeploymentPhase).toBe(true);
    expect(normalizeScenario(preset).allowDeploymentPhase).toBe(false);
  });

  it("backfills placeableObjectives only for dynamic-army instruction maps", () => {
    const instruction = buildRandom().instructions[0];
    const dynamicWithInstructions: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "dynamic-instr",
      description: "",
      instructions: [instruction],
      allowDynamicArmy: true,
    };
    const dynamicNoInstructions: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "dynamic-empty",
      description: "",
      instructions: [],
      allowDynamicArmy: true,
    };
    // Fixed-roster instruction map (e.g. the tutorial): must NOT auto-enable.
    const fixedRosterWithInstructions: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "tutorial-like",
      description: "",
      instructions: [instruction],
      allowDynamicArmy: false,
      allowDeploymentPhase: true,
    };
    expect(
      normalizeScenario(dynamicWithInstructions).placeableObjectives,
    ).toBe(true);
    expect(normalizeScenario(dynamicNoInstructions).placeableObjectives).toBe(
      false,
    );
    expect(
      normalizeScenario(fixedRosterWithInstructions).placeableObjectives,
    ).toBe(false);
  });

  it("throws on an unknown scenario shape", () => {
    expect(() =>
      normalizeScenario({
        type: "unknown" as GameScenarioType,
        name: "bad",
        description: "bad",
      } as LegacyPresetScenario),
    ).toThrow(/Unknown scenario shape/);
  });

  describe("preset", () => {
    it("attaches the preset map and forces fixed roster", () => {
      const preset = buildPreset();
      const result = normalizeScenario(preset);

      expect(result.version).toBe(SCENARIO_SCHEMA_VERSION);
      expect(result.allowDynamicArmy).toBe(false);
      expect(result.allowDeploymentPhase).toBe(false);
      expect(result.map).toBe(preset.map);
      expect(result.map?.terrains).toBe(preset.map.terrains);
      expect(result.map?.deploymentZones).toEqual(preset.map.deploymentZones);
      expect(result.players).toHaveLength(2);
      expect(result.instructions).toBeUndefined();
    });
  });

  describe("hybrid", () => {
    it("fixedArmy:true => allowDynamicArmy:false (fixed roster)", () => {
      const result = normalizeScenario(buildHybrid({ fixedArmy: true }));
      expect(result.allowDynamicArmy).toBe(false);
    });

    it("no fixedArmy => allowDynamicArmy:true (deployment phase)", () => {
      const result = normalizeScenario(buildHybrid());
      expect(result.allowDynamicArmy).toBe(true);
    });

    it("fixedArmy:false => allowDynamicArmy:true", () => {
      const result = normalizeScenario(buildHybrid({ fixedArmy: false }));
      expect(result.allowDynamicArmy).toBe(true);
    });

    it("legacy hybrid scenarios opt into a deployment phase", () => {
      expect(
        normalizeScenario(buildHybrid({ fixedArmy: true })).allowDeploymentPhase,
      ).toBe(true);
      expect(
        normalizeScenario(buildHybrid({ fixedArmy: false })).allowDeploymentPhase,
      ).toBe(true);
    });

    it("attaches the hybrid map and defaults missing units/objectives to empty", () => {
      const hybrid = buildHybrid();
      const result = normalizeScenario(hybrid);
      expect(result.map).toBe(hybrid.map);
      expect(result.units).toEqual([]);
      expect(result.objectives).toEqual([]);
      expect(result.instructions).toBeUndefined();
    });
  });

  describe("random", () => {
    it("preserves instructions and baseTerrain, sets allowDynamicArmy:true", () => {
      const result = normalizeScenario(buildRandom());
      expect(result.allowDynamicArmy).toBe(true);
      expect(result.allowDeploymentPhase).toBe(true);
      expect(result.placeableObjectives).toBe(true);
      expect(result.baseTerrain).toBe(TerrainType.Grass);
      expect(result.instructions).toHaveLength(1);
      expect(result.instructions?.[0].type).toBe(InstructionType.HeightNoise);
      expect(result.map).toBeUndefined();
    });
  });

  // _baseFields() in normalize.ts forwards 5 optional fields. Without
  // round-trip assertions a future refactor could drop any of them and the
  // existing tests would still pass — silently losing user data on migration.
  describe("optional base fields round-trip", () => {
    const sampleTriggers = [{ event: "turn_start", conditions: [] }] as any;
    const sampleLocales = {
      en: { name: "English Name", description: "English desc" },
      es: { name: "Nombre", description: "descripción" },
    };

    const baseOverrides = {
      ranked: true,
      hidden: true,
      triggers: sampleTriggers,
      conquestVictory: false,
      locales: sampleLocales,
    };

    it("preset: forwards ranked/hidden/triggers/conquestVictory/locales", () => {
      const preset = { ...buildPreset(), ...baseOverrides };
      const result = normalizeScenario(preset);
      expect(result.ranked).toBe(true);
      expect(result.hidden).toBe(true);
      expect(result.triggers).toBe(sampleTriggers);
      expect(result.conquestVictory).toBe(false);
      expect(result.locales).toBe(sampleLocales);
    });

    it("hybrid: forwards ranked/hidden/triggers/conquestVictory/locales", () => {
      const hybrid = buildHybrid(baseOverrides);
      const result = normalizeScenario(hybrid);
      expect(result.ranked).toBe(true);
      expect(result.hidden).toBe(true);
      expect(result.triggers).toBe(sampleTriggers);
      expect(result.conquestVictory).toBe(false);
      expect(result.locales).toBe(sampleLocales);
    });

    it("random: forwards ranked/hidden/triggers/conquestVictory/locales", () => {
      const random = buildRandom(baseOverrides);
      const result = normalizeScenario(random);
      expect(result.ranked).toBe(true);
      expect(result.hidden).toBe(true);
      expect(result.triggers).toBe(sampleTriggers);
      expect(result.conquestVictory).toBe(false);
      expect(result.locales).toBe(sampleLocales);
    });

    // Locks the no-op path: a fully-populated current-schema scenario must
    // survive normalize() unchanged (returned by reference).
    it("current schema: every optional field survives untouched", () => {
      const scenario: Scenario = {
        version: SCENARIO_SCHEMA_VERSION,
        name: "fully-populated",
        description: "every optional field set",
        instructions: [],
        allowDynamicArmy: true,
        allowDeploymentPhase: true,
        placeableObjectives: false,
        ranked: true,
        hidden: true,
        triggers: sampleTriggers,
        conquestVictory: false,
        locales: sampleLocales,
      };
      expect(normalizeScenario(scenario)).toBe(scenario);
    });
  });
});
