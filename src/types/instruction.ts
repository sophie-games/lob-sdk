import { Point2 } from "@lob-sdk/vector";
import {
  TerrainType,
  GameMap,
  MapSize,
  ProceduralScenario,
  DynamicBattleType,
  ObjectiveDto,
  ObjectiveType,
} from "@lob-sdk/types";

/**
 * Properties for generating a random map procedurally.
 */
export interface GenerateRandomMapProps {
  /** The procedural scenario containing generation instructions. */
  scenario: ProceduralScenario;
  /** The dynamic battle type configuration. */
  dynamicBattleType: DynamicBattleType;
  /** Maximum number of players for the map. */
  maxPlayers: number;
  /** Optional seed for random number generation. If not provided, a random seed will be used. */
  seed?: number;
  /** Optional map size. If not provided, default size will be used. */
  size?: MapSize;
  /** Size of each tile in pixels/units. */
  tileSize: number;
}

/**
 * Result of random map generation.
 */
export interface GenerateRandomMapResult {
  /** The generated game map. */
  map: GameMap;
  /** Objectives placed on the generated map. */
  objectives: ObjectiveDto<false>[];
}

/**
 * Represents an exact position on the map.
 */
interface ExactPosition {
  /** Type is "exact" for exact positions. */
  type: "exact";
  /** Exact coordinates as [x, y]. */
  coords: [number, number];
}

/**
 * Represents a range of positions on the map.
 */
interface RangePosition {
  /** Type is "range" for position ranges. */
  type: "range";
  /** Minimum coordinates as [x, y]. */
  min: [number, number];
  /** Maximum coordinates as [x, y]. */
  max: [number, number];
}

/**
 * Union type representing either an exact position or a range of positions.
 */
export type PositionData = ExactPosition | RangePosition;

/**
 * Type of procedural generation instruction.
 */
export enum InstructionType {
  /** Instruction to generate terrain using noise. */
  TerrainNoise = "TERRAIN_NOISE",
  /** Instruction to generate height using noise. */
  HeightNoise = "HEIGHT_NOISE",
  /** Instruction to place a circular terrain area. */
  TerrainCircle = "TERRAIN_CIRCLE",
  /** Instruction to place a rectangular terrain area. */
  TerrainRectangle = "TERRAIN_RECTANGLE",
  /** Instruction to create a natural path between map edges. */
  NaturalPath = "NATURAL_PATH",
  /** Instruction to connect terrain clusters with paths. */
  ConnectClusters = "CONNECT_CLUSTERS",
  /** Instruction to place an objective. */
  Objective = "OBJECTIVE",
  /** Instruction to generate a lake. */
  Lake = "LAKE",
  /** Instruction to place an objective layer. */
  ObjectiveLayer = "OBJECTIVE_LAYER",
}

/**
 * Base interface for all procedural generation instructions.
 */
export interface BaseInstruction {
  /** The type of instruction. */
  type: InstructionType;
}

/**
 * Instruction to generate terrain using Perlin noise.
 * Creates organic-looking terrain patterns based on noise values.
 */
export interface InstructionTerrainNoise extends BaseInstruction {
  /** Instruction type is TerrainNoise. */
  type: InstructionType.TerrainNoise;
  /** Terrain type to place based on noise values. */
  terrain: TerrainType;
  /** Scale of the noise (smaller = more detail, larger = smoother). Can be a single number or [x, y] for different scales per axis. */
  scale: number | Point2;
  /** Ranges of noise values that will place this terrain. */
  ranges: Array<{ min: number; max: number }>;
  /** Optional multiplier for noise values. */
  multiplier?: number;
  /** Optional offset for noise values. */
  offset?: number;
  /** Optional height range for this terrain. */
  height?: {
    /** Minimum height value. */
    min: number;
    /** Maximum height value. */
    max: number;
  };
  /** Optional smoothing configuration. */
  smoothing?: {
    /** Minimum number of surrounding tiles with same terrain for smoothing. */
    minSurrounding?: number;
  };
}

/**
 * Configuration for a single height noise layer.
 */
interface HeightNoiseConfig {
  /** Scale of the noise (smaller = more detail, larger = smoother). Can be a single number or [x, y] for different scales per axis. */
  scale: number | Point2;
  /** Optional multiplier for noise values. */
  multiplier?: number;
  /** Optional offset for noise values. */
  offset?: number;
  /** Optional randomness factor. */
  randomness?: number;
  /** If true, this noise creates depressions/ravines instead of elevations. */
  reversed?: boolean;
}

/**
 * Instruction to generate height map using noise.
 * Combines multiple noise layers to create varied terrain height.
 */
export interface InstructionHeightNoise extends BaseInstruction {
  /** Instruction type is HeightNoise. */
  type: InstructionType.HeightNoise;
  /** Array of noise configurations to combine. */
  noises: HeightNoiseConfig[];
  /** Strategy for merging multiple noise layers: "min", "max", "avg", or "round". */
  mergeStrategy: "min" | "max" | "avg" | "round";
  /** Optional minimum height value. */
  min?: number;
  /** Maximum height value. */
  max: number;
  /** Optional ranges to apply height values. */
  ranges?: Array<{ min: number; max: number }>;
}

/**
 * Instruction to place a circular terrain area.
 * Creates a circular region with optional falloff and border.
 */
export interface InstructionTerrainCircle extends BaseInstruction {
  /** Instruction type is TerrainCircle. */
  type: InstructionType.TerrainCircle;
  /** Position of the circle center (exact or range). */
  position: PositionData;
  /** Radius of the circle. */
  radius: number;
  /** Falloff distance for smooth blending at edges. */
  falloff: number;
  /** Terrain type to place in the circle. */
  terrain: TerrainType;
  /** Optional height value for the circle. */
  height?: number;
  /** Optional border configuration. */
  border?: {
    /** Width of the border. */
    width: number;
    /** Terrain type for the border. */
    terrain: TerrainType;
  };
}

/**
 * Instruction to place a rectangular terrain area.
 * Creates a rectangular region with optional rotation, height filtering, and scattering.
 */
export interface InstructionTerrainRectangle extends BaseInstruction {
  /** Instruction type is TerrainRectangle. */
  type: InstructionType.TerrainRectangle;
  /** Position of the rectangle (exact or range). */
  position: PositionData;
  /** Width of the rectangle. */
  width: number;
  /** Height of the rectangle. */
  height: number;
  /** Rotation in degrees, optional. 0 = axis-aligned. */
  rotation?: number;
  /** Optional height filter value. */
  heightFilter?: number;
  /** Terrain type ID to place in the rectangle. */
  terrain: number;
  /** Optional border configuration. */
  border?: {
    /** Width of the border. */
    width: number;
    /** Terrain type for the border. */
    terrain: TerrainType;
  };
  /**
   * If set, scatter this rectangle randomly across the map.
   * Creates multiple instances of the rectangle with randomized positions and sizes.
   */
  scatter?: {
    /** Number of rectangles to create. */
    count?: number;
    /** Number of rectangles per 100x100 area. */
    countPer100x100?: number;
    /** Minimum width for scattered rectangles. */
    minWidth?: number;
    /** Maximum width for scattered rectangles. */
    maxWidth?: number;
    /** Minimum height for scattered rectangles. */
    minHeight?: number;
    /** Maximum height for scattered rectangles. */
    maxHeight?: number;
    /** Rotation: fixed number or {min, max} range for random rotation. */
    rotation?: number | { min: number; max: number };
    /** Fixed height value for scattered rectangles. */
    height?: number;
    /** Minimum height value for scattered rectangles. */
    minHeightValue?: number;
    /** Maximum height value for scattered rectangles. */
    maxHeightValue?: number;
  };
}

/**
 * Instruction to create natural-looking paths between map edges.
 * Uses pathfinding to create organic paths that avoid difficult terrain.
 */
export interface InstructionNaturalPath extends BaseInstruction {
  /** Instruction type is NaturalPath. */
  type: InstructionType.NaturalPath;
  /** Terrain type ID for the path. */
  terrain: number;
  /** Direction of path: "edges" (any edge to any edge), "left-right", or "top-bottom". */
  between: "edges" | "left-right" | "top-bottom";
  /** Optional width of the path. */
  width?: number;
  /** Cost multiplier for height differences when pathfinding. */
  heightDiffCost?: number;
  /** Number of paths to create: {min, max} range. */
  amount: { min: number; max: number };
  /** Optional range constraint for path placement. */
  range?: { min: number; max: number };
  /** Optional terrain replacements to apply along the path. */
  terrainReplacements?: Array<{
    /** Terrain type to replace. */
    fromTerrain: TerrainType;
    /** Terrain type to replace with. */
    toTerrain: TerrainType;
  }>;
  /** Optional terrain costs for pathfinding. */
  terrainCosts?: Array<{
    /** Terrain type. */
    terrain: TerrainType;
    /** Cost value for pathfinding (higher = more avoided). */
    cost: number;
  }>;
  /** Optional height value for the path. */
  height?: number;
  /** Optional height ranges for path start positions. */
  startHeightRanges?: Array<{ min: number; max: number }>;
  /** Optional height ranges for path end positions. */
  endHeightRanges?: Array<{ min: number; max: number }>;
}

/**
 * Instruction to connect terrain clusters with paths.
 * Finds clusters of specific terrain types and connects them with paths.
 */
export interface InstructionConnectClusters extends BaseInstruction {
  /** Instruction type is ConnectClusters. */
  type: InstructionType.ConnectClusters;
  /** Terrain type(s) to find clusters of. Can be a single terrain ID or array of terrain IDs. */
  fromTerrain: number | number[];
  /** Terrain type ID for the connecting paths. */
  pathTerrain: number;
  /** Minimum size of a cluster to be connected. */
  minGroupSize: number;
  /** Maximum distance between clusters to connect them. */
  maxDistance: number;
  /** Optional terrain replacements to apply along paths. */
  terrainReplacements?: Array<{
    /** Terrain type to replace. */
    fromTerrain: TerrainType;
    /** Terrain type to replace with. */
    toTerrain: TerrainType;
  }>;
  /** Optional terrain costs for pathfinding. */
  terrainCosts?: Array<{
    /** Terrain type. */
    terrain: TerrainType;
    /** Cost value for pathfinding (higher = more avoided). */
    cost: number;
  }>;
}

/**
 * Instruction to place an objective on the map.
 */
export interface InstructionObjective extends BaseInstruction {
  /** Instruction type is Objective. */
  type: InstructionType.Objective;
  /** Position to place the objective (exact or range). */
  position: PositionData;
  /** Player number that owns this objective initially. */
  player: number;
}

/**
 * Instruction to generate a lake with organic shape.
 * Creates a procedurally generated lake with deep, shallow, and shore areas.
 */
export interface InstructionLake extends BaseInstruction {
  /** Instruction type is Lake. */
  type: InstructionType.Lake;
  /**
   * Size range for individual lakes (as percentage of map size).
   */
  size: { min: number; max: number };
  /**
   * How organic/irregular the lake shapes should be (0-1).
   * Higher values create more irregular, natural-looking shapes.
   */
  organicness: number;
  /**
   * Terrain types for different parts of the lake.
   */
  terrains: {
    /** Terrain type for deep water areas. */
    deep: TerrainType;
    /** Terrain type for shallow water areas. */
    shallow: TerrainType;
    /** Terrain type for shore/beach areas. */
    shore: TerrainType;
  };
  /** Position to place the lake (exact or range). */
  position: PositionData;
}

/**
 * Instruction to place an objective layer on the map.
 */
export interface InstructionObjectiveLayer extends BaseInstruction {
  /** Instruction type is ObjectiveLayer. */
  type: InstructionType.ObjectiveLayer;
  /** Player that owns this objective layer. */
  player: number;
  /** Type of objective that this objective layer can place. */
  objectiveType: ObjectiveType;
  /** Optional - Number between 0 and 100 indicating the chance of this objective layer being placed. */
  chance?: number;
  /** Optional - Terrains that this objective layer can be placed on. */
  terrains?: TerrainType[];
  /** Optional - Heights that this objective layer can be placed on. */
  heights?: [{ min: number; max: number }];
  /** Optional - Minimum distance between this objective layer and the nearest objective. */
  minDistance?: number;
}

/**
 * Union type representing any valid procedural generation instruction.
 */
export type AnyInstruction =
  | InstructionTerrainNoise
  | InstructionHeightNoise
  | InstructionTerrainCircle
  | InstructionTerrainRectangle
  | InstructionNaturalPath
  | InstructionConnectClusters
  | InstructionObjective
  | InstructionLake
  | InstructionObjectiveLayer;
