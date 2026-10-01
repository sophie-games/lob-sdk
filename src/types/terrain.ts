import { UnitCategoryId } from "@lob-sdk/types";

export enum TerrainType {
  Grass = 0,
  Forest = 1,
  Building = 2,
  Road = 3,
  ShallowWater = 4,
  DeepWater = 5,
  Cliff = 6,
  Bridge = 7,
  Snow = 8,
  Dirt = 9,
  Sand = 10,
  Farm = 11,
  City = 12,
  ForestWinter = 13,
  CliffWinter = 14,
  RoadWinter = 15,
  Ice = 16,
  FarmUnplanted = 17,
  FarmGrowing = 18,
  Mud = 19,
  SunkenRoad = 20,
  Trench = 21,
  Redoubt = 22,
  Railway = 23,
  RailwayRoad = 24,
  Camp = 25,
  Wall = 26,
  LightForest = 27,
  LightForestWinter = 28,
  Rampart = 29,
}

export enum TerrainCategoryType {
  Land = "land",
  Forest = "forest",
  LightForest = "lightForest",
  Building = "building",
  Wall = "wall",
  Rampart = "rampart",
  Path = "path",
  ShallowWater = "shallowWater",
  DeepWater = "deepWater",
  Cliff = "cliff",
  Mud = "mud",
  SunkenRoad = "sunkenRoad",
  Railway = "railway",
  RailwayRoad = "railwayRoad",
}

export interface TerrainConfig {
  name: string;
  id: TerrainType;
  category: TerrainCategoryType;
}

export type TerrainsData = Record<string, TerrainConfig>;

export interface TerrainCategoryConfig {
  color?: string;
  canPlaceObjectives?: boolean;
  staminaCostModifier?: number;
  /** Scales how fast units turn on this terrain, blended like `staminaCostModifier`
   * (e.g. -0.5 halves rotation speed, +0.2 speeds it up). Defaults to 0 (no effect). */
  rotationSpeedModifier?: number;
  hitboxHeight?: number;
  heightOffset?: number;
  visionAbsorption?: number;
  movementModifier?: Partial<Record<UnitCategoryId, number>>;
  /** Per-category speed modifier applied while running. Falls back to
   * `movementModifier` for any category it doesn't set (so unset = same as walking). */
  runSpeedModifier?: Partial<Record<UnitCategoryId, number>>;
  /** A `true` entry (or `*`) makes the terrain impassable for that unit category. */
  impassable?: Partial<Record<UnitCategoryId, boolean>>;
  attackModifier?: Partial<Record<UnitCategoryId, number>>;
  defenseModifier?: Partial<Record<UnitCategoryId, number>>;
  rangedAttackModifier?: Partial<Record<UnitCategoryId, number>>;
  projectileAbsorption?: Partial<Record<string, number>>;
  chargeResistanceModifier?: Partial<Record<UnitCategoryId, number>>;
  chargeBonusModifier?: Partial<Record<UnitCategoryId, number>>;
  pushStrengthModifier?: number;
  pushDistanceModifier?: number;
  fixedEnemyCollisionLevel?: number;
  /** A click on this terrain routes along it, as on a road. */
  followedOnClick?: boolean;
  /**
   * Formation id ("*" for any other) -> share of the footprint at which the
   * whole unit counts as on this terrain. Below it, or when absent, the
   * footprint blends by proportion. Of two allies side by side on it, only the
   * one covering more counts.
   */
  takesOverAt?: Partial<Record<string, number>>;
  /** @deprecated Saved overrides only; loading migrates it to {@link followedOnClick}. */
  prioritizeMovement?: boolean;
  /**
   * Its movement and run modifiers apply in full while any part of a unit's
   * footprint is on it, above a road it is on: a one-tile wall slows a whole
   * battalion climbing it, not the share of the footprint on it.
   */
  obstructsMovement?: boolean;
  supplyRoute?: boolean;
}

export type TerrainCategories = Record<
  TerrainCategoryType,
  TerrainCategoryConfig
>;
