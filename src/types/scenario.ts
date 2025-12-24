import {
  GameTrigger,
  ObjectiveDto,
  PlayerSetup,
  UnitDtoPartialId,
  TerrainType,
  AnyInstruction,
} from "@lob-sdk/types";

export type GameLocales = {
  [language: string]: Record<string, string>;
};

export interface MapSize {
  width: number;
  height: number;
}

export enum GameScenarioType {
  Preset = "preset",
  Random = "random",
  Hybrid = "hybrid",
  Classic = "classic",
}

export interface TeamDeploymentZone {
  team: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameMap {
  width: number;
  height: number;
  deploymentZones?: TeamDeploymentZone[];
  terrains: TerrainType[][];
  heightMap: number[][];
  /** Seed used for random map generation. */
  seed?: number;
}

interface BaseScenario {
  name: string;
  description: string;
  type: GameScenarioType;
  ranked?: boolean;
  hidden?: boolean;
  triggers?: GameTrigger[];
  /**
   * Default: true. If false, disables automatic victory when only one team is alive
   */
  conquestVictory?: boolean;
  /**
   * Translations for scenario name, description, and trigger messages.
   * Each language key (e.g., "en", "es", "fr") contains a Record of translation keys to translated strings.
   * Common keys: "name", "description", and trigger message keys like "trigger.1.title", "trigger.1.message", etc.
   */
  locales?: GameLocales;
}

export interface PresetScenario extends BaseScenario {
  type: GameScenarioType.Preset;
  map: GameMap;
  players: PlayerSetup[];
  units: UnitDtoPartialId[];
  objectives: ObjectiveDto<false>[];
}

export interface HybridScenario extends BaseScenario {
  type: GameScenarioType.Hybrid;
  map: GameMap;
  units?: UnitDtoPartialId[];
  objectives?: ObjectiveDto<false>[];
}

export interface RandomScenario extends BaseScenario {
  type: GameScenarioType.Random;
  baseTerrain?: TerrainType;
  instructions: AnyInstruction[];
}

export interface ClassicScenario extends BaseScenario {
  type: GameScenarioType.Classic;
  baseTerrain?: TerrainType;
  instructions: AnyInstruction[];
}

export type GameScenario =
  | PresetScenario
  | RandomScenario
  | HybridScenario
  | ClassicScenario;

export type ProceduralScenario = RandomScenario | ClassicScenario;

export type ScenarioName = string;
