import {
  GameTrigger,
  ObjectiveDto,
  PlayerSetup,
  UnitDtoPartialId,
  TerrainType,
  AnyInstruction,
  Range,
  Size,
} from "@lob-sdk/types";

/**
 * Translations for scenario content, organized by language.
 * Each language key (e.g., "en", "es", "fr") contains a Record of translation keys to translated strings.
 */
export type GameLocales = {
  [language: string]: Record<string, string>;
};

/**
 * Type of game scenario.
 */
export enum GameScenarioType {
  /** Preset scenario with a fixed map and unit placement. */
  Preset = "preset",
  /** Randomly generated scenario. */
  Random = "random",
  /** Hybrid scenario combining preset and random elements. */
  Hybrid = "hybrid",
}

/**
 * Represents a deployment zone for a specific team.
 */
export interface TeamDeploymentZone {
  /** The team number this zone belongs to. */
  team: number;
  /** X coordinate of the zone's top-left corner. */
  x: number;
  /** Y coordinate of the zone's top-left corner. */
  y: number;
  /** Width of the deployment zone. */
  width: number;
  /** Height of the deployment zone. */
  height: number;
  /** Type of the deployment zone */
  // type: "forward" | "main"; // For future build, put type here and allow an arbritrary number of deployment zones.
}

export interface TeamDeploymentZones {
  team: number;
  mainZone: TeamDeploymentZone;
  forwardZone: TeamDeploymentZone;
}

/**
 * Represents the game map with terrain, height data, and deployment zones.
 */
export interface GameMap {
  /** Width of the map in tiles. */
  width: number;
  /** Height of the map in tiles. */
  height: number;
  /** Optional deployment zones for each team. */
  deploymentZones?: TeamDeploymentZones[];
  /** 2D array of terrain types, indexed by [x][y]. */
  terrains: TerrainType[][];
  /** 2D array of height values, indexed by [x][y]. */
  heightMap: number[][];
  /** Seed used for random map generation. */
  seed?: number;
}

/**
 * Base interface for all scenario types.
 * Contains common properties shared by all scenario types.
 */
interface BaseScenario {
  /** Name of the scenario. */
  name: string;
  /** Description of the scenario. */
  description: string;
  /** Type of scenario. */
  type: GameScenarioType;
  /** Whether this scenario can be used in ranked matches. */
  ranked?: boolean;
  /** Whether this scenario should be hidden from scenario selection. */
  hidden?: boolean;
  /** Game triggers that can modify game state during play. */
  triggers?: GameTrigger[];
  /**
   * Default: true. If false, disables automatic victory when only one team is alive.
   */
  conquestVictory?: boolean;
  /**
   * Translations for scenario name, description, and trigger messages.
   * Each language key (e.g., "en", "es", "fr") contains a Record of translation keys to translated strings.
   * Common keys: "name", "description", and trigger message keys like "trigger.1.title", "trigger.1.message", etc.
   */
  locales?: GameLocales;
}

/**
 * A preset scenario with a fixed map, unit placement, and objectives.
 * All game elements are predefined and static.
 */
export interface PresetScenario extends BaseScenario {
  /** Type is always Preset for preset scenarios. */
  type: GameScenarioType.Preset;
  /** Discriminator: legacy types never carry a schema version. */
  version?: never;
  /** The game map with terrain and deployment zones. */
  map: GameMap;
  /** Player configurations for the scenario. */
  players: PlayerSetup[];
  /** Units to deploy at the start of the game. */
  units: UnitDtoPartialId[];
  /** Objectives placed on the map. */
  objectives: ObjectiveDto<false>[];
}

/**
 * A hybrid scenario that combines preset map elements with optional random unit placement.
 * The map is fixed, but units and objectives may be procedurally generated.
 */
export interface HybridScenario extends BaseScenario {
  /** Type is always Hybrid for hybrid scenarios. */
  type: GameScenarioType.Hybrid;
  /** Discriminator: legacy types never carry a schema version. */
  version?: never;
  /** The game map with terrain and deployment zones. */
  map: GameMap;
  /** Optional units to deploy. If not provided, units may be generated procedurally. */
  units?: UnitDtoPartialId[];
  /** Optional objectives. If not provided, objectives may be generated procedurally. */
  objectives?: ObjectiveDto<false>[];
  /** If true, skips army auto-deployment. The scenario's `units` define the full roster. */
  fixedArmy?: boolean;
}

export interface RandomTeamDeploymentZones {
  /** Specify deployment zones in tile coordinates. If you want fixed deployment zones, use the same min/max values.*/
  topMainDeploymentZone: {
    /* X/Y Coordinates are the top/left corner of the deployment zone in map % */
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    /* Width in map percent */
    width: number;
    /* Height in map percent */
    height: number;
  };
  topForwardDeploymentZone: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  bottomMainDeploymentZone: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  bottomForwardDeploymentZone: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

/**
 * A randomly generated scenario created procedurally from instructions.
 * The map, terrain, and game elements are generated based on the instructions.
 */
export interface RandomScenario extends BaseScenario {
  /** Type is always Random for random scenarios. */
  type: GameScenarioType.Random;
  /** Discriminator: legacy types never carry a schema version. */
  version?: never;
  /** Base terrain type to use for generation. */
  baseTerrain?: TerrainType;
  /** Default deployment zone if a scaled deployment zone is not provided. Follows default map size deployment zones if not provided even if scaled deployment zones are provided. */
  defaultDeploymentZones?: RandomTeamDeploymentZones;
  /** Scaled deployment zones for each battle type (first is micro, second clash, and so on) */
  scaledDeploymentZones?: Record<Size, RandomTeamDeploymentZones>;
  /** Instructions for procedural generation of the scenario. */
  instructions: AnyInstruction[];
  /** Discriminator: random scenarios never carry pixel deployment zones. */
  deploymentZones?: never;
  /** Discriminator: random scenarios use {@link defaultDeploymentZones} instead. */
  randomDeploymentZones?: never;
  /** Discriminator: random scenarios always generate the map procedurally. */
  map?: never;
}

/**
 * Union type representing any game scenario.
 * Can be a PresetScenario, RandomScenario, or HybridScenario.
 */
export type GameScenario = PresetScenario | RandomScenario | HybridScenario;

/**
 * Union type representing procedurally generated scenarios.
 * Includes RandomScenario types and the new feature-based Scenario.
 */
export type ProceduralScenario = RandomScenario | Scenario;

/**
 * Name identifier for a scenario (string).
 */
export type ScenarioName = string;

/**
 * Current schema version for the new feature-based Scenario format.
 * Bump when introducing breaking field changes; loaders detect absence to
 * apply legacy normalization.
 */
export const SCENARIO_SCHEMA_VERSION = 1;

/**
 * Feature-based scenario schema (replaces the legacy preset/hybrid/random union).
 * All maps go through the procedural pipeline; fixed maps are wrapped in a single
 * {@link InstructionStaticMap} as the first instruction.
 */
export interface Scenario {
  /** Schema version. Required for new scenarios. Absence => legacy => normalize. */
  version?: number;
  /** Discriminator: new scenarios never carry the legacy `type` field. */
  type?: never;
  /** Discriminator: new scenarios use {@link randomDeploymentZones} instead. */
  defaultDeploymentZones?: never;
  /** Display name. */
  name: string;
  /** Display description. */
  description: string;
  /** Whether the scenario can be used in ranked matches. */
  ranked?: boolean;
  /** Whether the scenario should be hidden from selection. */
  hidden?: boolean;
  /** Game triggers that can modify game state during play. */
  triggers?: GameTrigger[];
  /** Default true. If false, disables automatic victory when only one team is alive. */
  conquestVictory?: boolean;
  /** Translations for scenario name, description, and trigger keys. */
  locales?: GameLocales;

  /**
   * Prebaked map (handcrafted via the editor or imported as JSON). When set,
   * the procedural pipeline does not generate terrain — {@link instructions}
   * (if any) run as overlays on top of this map (e.g. objective layers).
   */
  map?: GameMap;

  /**
   * Procedural generation pipeline. Without {@link map}: runs full terrain
   * generation. With {@link map}: instructions act as overlays.
   */
  instructions?: AnyInstruction[];

  /** Base terrain used when the procedural pipeline starts (ignored when {@link map} is set). */
  baseTerrain?: TerrainType;

  /**
   * Pixel-based deployment zones (used by legacy preset/hybrid scenarios after normalization).
   * Mutually exclusive with {@link randomDeploymentZones}.
   */
  deploymentZones?: TeamDeploymentZones[];
  /** Default percentage-based zones used by procedural scenarios. */
  randomDeploymentZones?: RandomTeamDeploymentZones;
  /** Per-battle-size scaled percentage-based zones. */
  scaledDeploymentZones?: Record<Size, RandomTeamDeploymentZones>;

  /** Player setups. Required for fixed-roster scenarios; optional otherwise. */
  players?: PlayerSetup[];
  /** Pre-placed units (kept regardless of allowDynamicArmy). */
  units?: UnitDtoPartialId[];
  /** Pre-placed objectives. */
  objectives?: ObjectiveDto<false>[];

  /**
   * If true: the matchmaking-driven army composition runs and auto-deploys units
   * on top of {@link units}. If false/absent: {@link units} defines the full
   * roster and no auto-deployment occurs (deployment phase is skipped).
   *
   * Inverse of the legacy {@link HybridScenario.fixedArmy} flag.
   */
  allowDynamicArmy?: boolean;
}
