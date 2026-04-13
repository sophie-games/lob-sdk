import {
  GameTrigger,
  ObjectiveDto,
  PlayerSetup,
  UnitDtoPartialId,
  UnitTemplate,
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
  /**
   * Custom game data overrides for this scenario.
   * Allows scenarios to define their own unit templates that are used
   * only within matches playing this scenario.
   */
  customGameData?: ScenarioCustomGameData;
}

/**
 * Custom game data that a scenario can carry to override or extend
 * the base era game data for matches using this scenario.
 */
export interface ScenarioCustomGameData {
  /** Custom unit templates. Types matching built-in IDs override them; types >= CUSTOM_UNIT_TYPE_OFFSET are new. */
  unitTemplates?: UnitTemplate[];
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
  /** Base terrain type to use for generation. */
  baseTerrain?: TerrainType;
  /** Default deployment zone if a scaled deployment zone is not provided. Follows default map size deployment zones if not provided even if scaled deployment zones are provided. */
  defaultDeploymentZones?: RandomTeamDeploymentZones;
  /** Scaled deployment zones for each battle type (first is micro, second clash, and so on) */
  scaledDeploymentZones?: Record<Size, RandomTeamDeploymentZones>;
  /** Instructions for procedural generation of the scenario. */
  instructions: AnyInstruction[];
}

/**
 * Union type representing any game scenario.
 * Can be a PresetScenario, RandomScenario, or HybridScenario.
 */
export type GameScenario = PresetScenario | RandomScenario | HybridScenario;

/**
 * Union type representing procedurally generated scenarios.
 * Includes RandomScenario types.
 */
export type ProceduralScenario = RandomScenario;

/**
 * Name identifier for a scenario (string).
 */
export type ScenarioName = string;
