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
}

export enum TerrainCategoryType {
  Land = "land",
  Forest = "forest",
  Building = "building",
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
  hitboxHeight?: number;
  heightOffset?: number;
  visionAbsorption?: number;
  movementModifier?: Partial<Record<UnitCategoryId, number>>;
  attackModifier?: Partial<Record<UnitCategoryId, number>>;
  defenseModifier?: Partial<Record<UnitCategoryId, number>>;
  rangedAttackModifier?: Partial<Record<UnitCategoryId, number>>;
  projectileAbsorption?: Partial<Record<string, number>>;
  chargeResistanceModifier?: Partial<Record<UnitCategoryId, number>>;
  chargeBonusModifier?: Partial<Record<UnitCategoryId, number>>;
  pushStrengthModifier?: number;
  pushDistanceModifier?: number;
  impassable?: boolean;
  fixedEnemyCollisionLevel?: number;
  prioritizeMovement?: boolean;
  supplyRoute?: boolean;
}

export type TerrainCategories = Record<
  TerrainCategoryType,
  TerrainCategoryConfig
>;
