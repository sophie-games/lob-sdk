import { Point2 } from "@lob-sdk/vector";
import {
  TerrainType,
  GameMap,
  MapSize,
  ProceduralScenario,
  DynamicBattleType,
  ObjectiveDto,
} from "@lob-sdk/types";

export interface GenerateRandomMapProps {
  scenario: ProceduralScenario;
  dynamicBattleType: DynamicBattleType;
  maxPlayers: number;
  seed?: number;
  size?: MapSize;
  tileSize: number;
}

export interface GenerateRandomMapResult {
  map: GameMap;
  objectives: ObjectiveDto<false>[];
}

interface ExactPosition {
  type: "exact";
  coords: [number, number];
}

interface RangePosition {
  type: "range";
  min: [number, number];
  max: [number, number];
}

export type PositionData = ExactPosition | RangePosition;

export enum InstructionType {
  TerrainNoise = "TERRAIN_NOISE",
  HeightNoise = "HEIGHT_NOISE",
  TerrainCircle = "TERRAIN_CIRCLE",
  TerrainRectangle = "TERRAIN_RECTANGLE",
  NaturalPath = "NATURAL_PATH",
  ConnectClusters = "CONNECT_CLUSTERS",
  Objective = "OBJECTIVE",
  Lake = "LAKE",
}

export interface BaseInstruction {
  type: InstructionType;
}

export interface InstructionTerrainNoise extends BaseInstruction {
  type: InstructionType.TerrainNoise;
  terrain: TerrainType;
  scale: number | Point2;
  ranges: Array<{ min: number; max: number }>;
  multiplier?: number;
  offset?: number;
  height?: {
    min: number;
    max: number;
  };
  smoothing?: {
    minSurrounding?: number;
  };
}

interface HeightNoiseConfig {
  scale: number | Point2;
  multiplier?: number;
  offset?: number;
  randomness?: number;
  reversed?: boolean; // If true, this noise creates depressions/ravines
}

export interface InstructionHeightNoise extends BaseInstruction {
  type: InstructionType.HeightNoise;
  noises: HeightNoiseConfig[];
  mergeStrategy: "min" | "max" | "avg" | "round";
  min?: number;
  max: number;
  ranges?: Array<{ min: number; max: number }>;
}

export interface InstructionTerrainCircle extends BaseInstruction {
  type: InstructionType.TerrainCircle;
  position: PositionData;
  radius: number;
  falloff: number;
  terrain: TerrainType;
  height?: number;
  border?: {
    width: number;
    terrain: TerrainType;
  };
}

export interface InstructionTerrainRectangle extends BaseInstruction {
  type: InstructionType.TerrainRectangle;
  position: PositionData;
  width: number;
  height: number;
  rotation?: number; // degrees, optional, 0 = axis-aligned
  heightFilter?: number;
  terrain: number;
  border?: {
    width: number;
    terrain: TerrainType;
  };
  /**
   * If set, scatter this rectangle randomly across the map.
   * count: number of rectangles
   * minWidth/maxWidth/minHeight/maxHeight: size range
   * rotation: fixed or {min, max} for random rotation
   */
  scatter?: {
    count?: number;
    countPer100x100?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    rotation?: number | { min: number; max: number };
    height?: number;
    minHeightValue?: number;
    maxHeightValue?: number;
  };
}

export interface InstructionNaturalPath extends BaseInstruction {
  type: InstructionType.NaturalPath;
  terrain: number;
  between: "edges" | "left-right" | "top-bottom";
  width?: number;
  heightDiffCost?: number;
  amount: { min: number; max: number };
  range?: { min: number; max: number };
  terrainReplacements?: Array<{
    fromTerrain: TerrainType;
    toTerrain: TerrainType;
  }>;
  terrainCosts?: Array<{
    terrain: TerrainType;
    cost: number;
  }>;
  height?: number;
  startHeightRanges?: Array<{ min: number; max: number }>;
  endHeightRanges?: Array<{ min: number; max: number }>;
}

export interface InstructionConnectClusters extends BaseInstruction {
  type: InstructionType.ConnectClusters;
  fromTerrain: number | number[];
  pathTerrain: number;
  minGroupSize: number;
  maxDistance: number;
  terrainReplacements?: Array<{
    fromTerrain: TerrainType;
    toTerrain: TerrainType;
  }>;
  terrainCosts?: Array<{
    terrain: TerrainType;
    cost: number;
  }>;
}

export interface InstructionObjective {
  type: InstructionType.Objective;
  position: PositionData;
  player: number;
}

export interface InstructionLake {
  type: InstructionType.Lake;
  /**
   * Size range for individual lakes (as percentage of map size)
   */
  size: { min: number; max: number };
  /**
   * How organic/irregular the lake shapes should be (0-1)
   */
  organicness: number;
  /**
   * Terrain types for different parts of the lake
   */
  terrains: {
    deep: TerrainType;
    shallow: TerrainType;
    shore: TerrainType;
  };
  position: PositionData;
}

export type AnyInstruction =
  | InstructionTerrainNoise
  | InstructionHeightNoise
  | InstructionTerrainCircle
  | InstructionTerrainRectangle
  | InstructionNaturalPath
  | InstructionConnectClusters
  | InstructionObjective
  | InstructionLake;
