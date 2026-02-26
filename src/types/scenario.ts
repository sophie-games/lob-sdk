import {
  GameTrigger,
  ObjectiveDto,
  PlayerSetup,
  UnitDtoPartialId,
  TerrainType,
  AnyInstruction,
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
 * Represents a deployment zone for a specific player.
 */
export interface DeploymentZone {
  /** The player number this zone belongs to. */
  player: number;
  /** X coordinate of the zone's top-left corner (zone center - radius). */
  x: number;
  /** Y coordinate of the zone's top-left corner (zone center - radius). */
  y: number;
  /** Radius of the circular deployment zone. */
  radius: number;
  /** Optional rotation angle in radians. Zone will be rotated around its center. */
  rotation?: number;
  /** Deployment capacity. If 0, capacity is infinite. If set to a positive value, total deploymentCost of units in this zone cannot exceed this value. */
  capacity: number;
}

/**
 * Represents the game map with terrain, height data, and deployment zones.
 */
export interface GameMap {
  /** Width of the map in tiles. */
  width: number;
  /** Height of the map in tiles. */
  height: number;
  /** Optional deployment zones for each player. */
  deploymentZones?: DeploymentZone[];
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
  /**
   * Configuration for forward deployment zones (for skirmishers).
   * If provided, small deployment zones will be added around each player's main zone.
   */
  forwardDeploymentZones?: {
    /** Number of small zones to create around the circumference for each player (default: 6). */
    amount?: number;
    /** Radius of the small forward zones (as percentage of main zone radius, default: 0.3). */
    radiusRatio?: number;
    /** Distance from main zone edge (as percentage of main zone radius, default: 0.2). */
    distanceRatio?: number;
    /** Deployment capacity for each forward zone. If 0, capacity is infinite. If set to a positive value, total deploymentCost of units in each forward zone cannot exceed this value. */
    capacity?: number;
    /** Spacing between zones along the arc (as percentage of main zone radius, default: uses distanceRatio). If set, zones will be spaced this distance apart along the arc circumference. */
    spacingRatio?: number;
  };
}

/**
 * A preset scenario with a fixed map, unit placement, and objectives.
 * All game elements are predefined and static.
 */
export interface PresetScenario extends BaseScenario {
  /** Type is always Preset for preset scenarios. */
  type: GameScenarioType.Preset;
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
  /** The game map with terrain and deployment zones. */
  map: GameMap;
  /** Optional units to deploy. If not provided, units may be generated procedurally. */
  units?: UnitDtoPartialId[];
  /** Optional objectives. If not provided, objectives may be generated procedurally. */
  objectives?: ObjectiveDto<false>[];
}

/**
 * A randomly generated scenario created procedurally from instructions.
 * The map, terrain, and game elements are generated based on the instructions.
 */
export interface RandomScenario extends BaseScenario {
  /** Type is always Random for random scenarios. */
  type: GameScenarioType.Random;
  /** Base terrain type to use for generation. */
  baseTerrain?: TerrainType;
  /** Instructions for procedural generation of the scenario. */
  instructions: AnyInstruction[];
}

/**
 * Union type representing any game scenario.
 * Can be a PresetScenario, RandomScenario, or HybridScenario.
 */
export type GameScenario =
  | PresetScenario
  | RandomScenario
  | HybridScenario;

/**
 * Union type representing procedurally generated scenarios.
 * Includes RandomScenario types.
 */
export type ProceduralScenario = RandomScenario;

/**
 * Name identifier for a scenario (string).
 */
export type ScenarioName = string;
