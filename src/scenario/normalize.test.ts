import {
  isInsideDeploymentZone,
  polygonFromBounds,
} from "../utils/deployment-zone";
import {
  GameScenarioType,
  LegacyGameMap,
  LegacyRandomDeploymentZones,
  LegacyVersion1Scenario,
  LegacyHybridScenario,
  InstructionType,
  LegacyPresetScenario,
  LegacyRandomScenario,
  Scenario,
  Size,
  TerrainType,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "./constants";
import { normalizeScenario } from "./normalize";
import { ScenarioFeatures } from "./scenario-features";

const buildPresetMap = (): LegacyGameMap => ({
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
      mainZone: { x: 64, y: 0, width: 32, height: 32 },
      forwardZone: { x: 64, y: 32, width: 32, height: 32 },
    },
  ],
});

const presetPolygonZones = () => [
  {
    team: 1,
    zones: [
      { team: 1, type: "main", polygons: [polygonFromBounds(0, 0, 32, 32)] },
      {
        team: 1,
        type: "forward",
        polygons: [polygonFromBounds(0, 32, 32, 64)],
      },
    ],
  },
  {
    team: 2,
    zones: [
      { team: 2, type: "main", polygons: [polygonFromBounds(64, 0, 96, 32)] },
      {
        team: 2,
        type: "forward",
        polygons: [polygonFromBounds(64, 32, 96, 64)],
      },
    ],
  },
];

const buildVersion1 = (
  overrides: Partial<LegacyVersion1Scenario> = {},
): LegacyVersion1Scenario => ({
  version: 1,
  name: "version-1",
  description: "",
  map: buildPresetMap(),
  allowDynamicArmy: false,
  ...overrides,
});

const buildSmallMap = (): LegacyGameMap => ({
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
  it("rejects a schema version it does not know", () => {
    const futureScenario: Scenario = {
      version: SCENARIO_SCHEMA_VERSION + 1,
      name: "future",
      description: "",
    };
    expect(() => normalizeScenario(futureScenario)).toThrow(
      `Unsupported scenario schema version ${SCENARIO_SCHEMA_VERSION + 1}`,
    );
  });

  describe("version 1", () => {
    it("turns rectangle zones, pre-1.4 pairs included, into polygons", () => {
      const result = normalizeScenario(
        buildVersion1({ allowDeploymentPhase: true }),
      );

      expect(result.version).toBe(SCENARIO_SCHEMA_VERSION);
      expect(result.map?.deploymentZones).toEqual(presetPolygonZones());
      expect(result.map?.terrains).toEqual(buildPresetMap().terrains);
      expect(result).not.toHaveProperty("allowDeploymentPhase");
      expect(ScenarioFeatures.getInitialTurnNumber(result)).toBe(0);
    });

    it("keeps a rotated rectangle's area and facing", () => {
      const map = buildPresetMap();
      map.deploymentZones = [
        {
          team: 1,
          zones: [
            {
              team: 1,
              player: 1,
              type: "main",
              x: 0,
              y: 0,
              width: 40,
              height: 20,
              rotation: Math.PI / 2,
            },
          ],
        },
      ];
      const result = normalizeScenario(
        buildVersion1({ map, allowDeploymentPhase: true }),
      );
      const zone = result.map?.deploymentZones?.[0]?.zones[0];

      expect(zone).toMatchObject({ player: 1, rotation: Math.PI / 2 });
      // On end around its centre (20, 10), it spans x 10..30, y -10..30.
      expect(isInsideDeploymentZone(zone!, { x: 20, y: 25 })).toBe(true);
      expect(isInsideDeploymentZone(zone!, { x: 5, y: 10 })).toBe(false);
    });

    it("drops zones no feature used, so fixed rosters start at turn 1", () => {
      const result = normalizeScenario(buildVersion1());

      expect(result.map?.deploymentZones).toBeUndefined();
      expect(ScenarioFeatures.getInitialTurnNumber(result)).toBe(1);
    });

    it("drops unused percentage zones too", () => {
      const zones: LegacyRandomDeploymentZones = {
        top: [
          {
            role: "main",
            rect: {
              x: { min: 0, max: 0 },
              y: { min: 0, max: 0 },
              width: 10,
              height: 10,
            },
          },
        ],
      };
      const result = normalizeScenario(
        buildVersion1({
          randomDeploymentZones: zones,
          scaledDeploymentZones: {
            [Size.XSmall]: zones,
            [Size.Small]: zones,
            [Size.Medium]: zones,
            [Size.Large]: zones,
            [Size.ExtraLarge]: zones,
          },
        }),
      );

      expect(result.randomDeploymentZones).toBeUndefined();
      expect(result.scaledDeploymentZones).toBeUndefined();
      expect(ScenarioFeatures.getInitialTurnNumber(result)).toBe(1);
    });

    it("keeps zones that placed objectives or a dynamic army", () => {
      expect(
        normalizeScenario(buildVersion1({ placeableObjectives: true })).map
          ?.deploymentZones,
      ).toEqual(presetPolygonZones());
      expect(
        normalizeScenario(buildVersion1({ allowDynamicArmy: true })).map
          ?.deploymentZones,
      ).toEqual(presetPolygonZones());
    });

    it("turns percentage rectangles into an origin and a polygon", () => {
      const rect = {
        x: { min: 5, max: 10 },
        y: { min: 3, max: 3 },
        width: 90,
        height: 10,
      };
      const converted = {
        role: "main",
        player: 2,
        origin: { x: rect.x, y: rect.y },
        polygon: polygonFromBounds(0, 0, 90, 10),
      };
      const zones: LegacyRandomDeploymentZones = {
        top: [{ role: "main", player: 2, rect }],
      };
      const scaled = { ...zones, bottom: zones.top };
      const result = normalizeScenario(
        buildVersion1({
          map: undefined,
          allowDynamicArmy: true,
          randomDeploymentZones: zones,
          scaledDeploymentZones: {
            [Size.XSmall]: scaled,
            [Size.Small]: scaled,
            [Size.Medium]: scaled,
            [Size.Large]: scaled,
            [Size.ExtraLarge]: scaled,
          },
        }),
      );

      expect(result.randomDeploymentZones).toEqual({ top: [converted] });
      expect(result.scaledDeploymentZones?.[Size.Small]).toEqual({
        top: [converted],
        bottom: [converted],
      });
    });
  });

  it("returns current-schema scenarios unchanged when the remaining feature flag is set", () => {
    const scenario: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "already-current",
      description: "test",
      instructions: [],
      allowDynamicArmy: true,
      placeableObjectives: false,
    };
    expect(normalizeScenario(scenario)).toBe(scenario);
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
    // Fixed-roster instruction map: must NOT auto-enable.
    const fixedRosterWithInstructions: Scenario = {
      version: SCENARIO_SCHEMA_VERSION,
      name: "fixed-roster",
      description: "",
      instructions: [instruction],
      allowDynamicArmy: false,
    };
    expect(normalizeScenario(dynamicWithInstructions).placeableObjectives).toBe(
      true,
    );
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
      expect(ScenarioFeatures.hasDeploymentPhase(result)).toBe(true);
      expect(result.map?.terrains).toBe(preset.map.terrains);
      expect(result.map?.deploymentZones).toEqual(presetPolygonZones());
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

    it("legacy hybrids without zones start at turn 1", () => {
      expect(ScenarioFeatures.hasDeploymentPhase(normalizeScenario(buildHybrid()))).toBe(false);
    });

    it("attaches the hybrid map and defaults missing units/objectives to empty", () => {
      const hybrid = buildHybrid();
      const result = normalizeScenario(hybrid);
      expect(result.map).toEqual(hybrid.map);
      expect(result.units).toEqual([]);
      expect(result.objectives).toEqual([]);
      expect(result.instructions).toBeUndefined();
    });
  });

  describe("random", () => {
    it("preserves instructions and baseTerrain, sets allowDynamicArmy:true", () => {
      const result = normalizeScenario(buildRandom());
      expect(result.allowDynamicArmy).toBe(true);
      expect(ScenarioFeatures.hasDeploymentPhase(result)).toBe(true);
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
