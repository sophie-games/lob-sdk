import { Point2 } from "@lob-sdk/vector";
import {
  TerrainType,
  GameMap,
  Scenario,
  DynamicBattleType,
  ObjectiveDto,
  ObjectiveType,
  Size,
} from "@lob-sdk/types";
import { GameEra } from "@lob-sdk/game-data-manager";

/**
 * Properties for generating a random map procedurally.
 */
export interface GenerateRandomMapProps {
  /** The scenario describing map generation (and optional baked map). */
  scenario: Scenario;
  /** The dynamic battle type configuration. `null` for fixed-roster scenarios. */
  dynamicBattleType: DynamicBattleType | null;
  /** Maximum number of players for the map. */
  maxPlayers: number;
  /** Optional seed for random number generation. If not provided, a random seed will be used. */
  seed?: number;
  /** Size of each tile in pixels/units. */
  tileSize: number;
  /** The game era (e.g., "napoleonic", "ww2"). */
  era: GameEra;
  /* Optional number of tiles on the X axis. If not provided, the map size will be used. */
  tilesX?: number;
  /* Optional number of tiles on the Y axis. If not provided, the map size will be used. */
  tilesY?: number;
  /**
   * Optional map size override. When provided, replaces the value derived from
   * `battleType.mapSize[mapSizeIndex(maxPlayers)]` and is used everywhere
   * `battleSize` flows (dimensions, instruction scaling, deployment zones).
   */
  mapSize?: Size;
  /**
   * Values the caller passes to the generation. `angle` turns a procedural map's terrain that
   * many degrees clockwise; it applies only within the range the scenario's `parameters` accept.
   */
  parameters?: RandomMapParameters;
}

/** Values a caller may pass to procedural map generation. */
export interface RandomMapParameters {
  /** Degrees clockwise to turn the terrain, so a river or ridge runs at that angle to the armies' line. */
  angle?: number;
}

/**
 * Result of random map generation.
 */
export interface GenerateRandomMapResult {
  /** The generated game map. */
  map: GameMap;
  /**
   * All objectives on the generated map. Includes scenario.objectives
   * (pre-placed) followed by objectives produced by Objective /
   * ObjectiveLayer instructions. Callers should not re-merge
   * scenario.objectives.
   */
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
  /** Instruction to copy one half of the map onto the other. */
  Symmetry = "SYMMETRY",
  /** Instruction to lay out fields in strips along the roads. */
  Fields = "FIELDS",
}

/**
 * Base interface for all procedural generation instructions.
 */
export interface BaseInstruction {
  /** The type of instruction. */

  /* Optional set an x bounds for the range. THIS AFFECTS ALL INSTRUCTION LOGIC, TREATING THE SPECIFIED BOUNDS AS AN EDGE. Must be used with yBounds to take effect */
  xBounds?: Range;
  /* Optional set an y bounds for the range. THIS AFFECTS ALL INSTRUCTION LOGIC, TREATING THE SPECIFIED BOUNDS AS AN EDGE. Must be used with xBounds to take effect */
  yBounds?: Range;
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
  /**
   * Ranges of noise values that will place this terrain. A range's own `terrain` paints that
   * instead, from the same noise: a wood's dense core and its open fringe in one field.
   */
  ranges: Array<Range & { terrain?: TerrainType }>;
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
  /** Optional list of existing terrains this noise must not overwrite (e.g. water). */
  excludeTerrains?: TerrainType[];
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
  ranges?: Array<Range>;
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
    rotation?: number | Range;
    /** Fixed height value for scattered rectangles. */
    height?: number;
    /** Minimum height value for scattered rectangles. */
    minHeightValue?: number;
    /** Maximum height value for scattered rectangles. */
    maxHeightValue?: number;
  };
  /**
   * Places the rectangle (and each scattered copy) centred on a tile the filter accepts, inside
   * `position` when it is a range: a village beside a bridge, a redoubt on a crest. Nothing is
   * drawn when no tile matches.
   */
  terrainFilter?: TerrainFilter;
  /** Terrain types the fill and border leave as they are, such as a bridge under a village. */
  excludeTerrains?: TerrainType[];
  /**
   * Draw a rectangle only whole: one that would cover an `excludeTerrains` tile or touch its own
   * terrain is skipped, and a scattered copy is tried elsewhere instead. Keeps scattered fields
   * from merging into one stretched shape.
   */
  skipBlocked?: boolean;
}

export interface ScalingFactor extends Record<Size, number> {}

export interface Range {
  min: number;
  max: number;
}

export interface PathPoint {
  xRange: Range;
  yRange: Range;
  heightRanges?: Range[];
}

interface NaturalPathParams extends BaseInstruction {
  /** Terrain type ID for the path. */
  terrain: number;
  /** Optional width of the path. */
  width?: number;
  /** Optional height value for the path. */
  height?: number;
  /** Optional height ranges for path start positions. */
  startHeightRanges?: Range[];
  /** Optional height ranges for path end positions. */
  endHeightRanges?: Range[];
  /** Optional specify how many tiles are considered for weighting against a curve "curve". Default is 5 tiles*/
  curveLen?: number;
  /** Optional specify how much turns weighted against pathfinding. Higher values will make straighter paths. With a value of 1: each 90degree change of direction is weighted as .5 distance. Default is .25 */
  curveWeight?: number;
  /** Optional specify how much noise is weighted against generation. Simplex noise is added to generate a value between -1 and 1. Higher values will generate more random movement.*/
  noiseWeight?: number;
  /** Optional specify roughly how many features will be present in the noise. Scales automatically with bounds width and height. Default is 6 */
  noiseSmoothness?: number;
  /** Optional specify how far out to consider tiles to be part of the edge. Default is 5 */
  edgeDistance?: number;
  /** Optional specify how much to weight against edge tiles to keep paths from walking bounds edges. Default is 5 */
  edgeWeight?: number;
  /** Optional specify how much to weight against vertical height changes. Default is 1 */
  uphillHeightCost?: number;
  /** Optional specify how much to weight against downhill height changes. Default is 1 */
  downHillHeightCost?: number;
  /** Optional Cost multiplier for height differences when pathfinding. DEPRECATED: Use vertical and downhill instead */
  heightDiffCost?: number;
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
  /** Prints out a debug of the noise in the console for map developers to see what the shape of the noise is */
  printNoiseDebug?: boolean;
}

/**
 * Instruction to create natural-looking paths between map edges.
 * Uses pathfinding to create organic paths that avoid difficult terrain.
 */
export interface InstructionNaturalPath extends NaturalPathParams {
  /** Instruction type is NaturalPath. */
  type: InstructionType.NaturalPath;
  /** Direction of path: "edges" (any edge to any edge), "left-right", "top-bottom", "left-top", "left-bottom", "right-top", "right-bottom", and "points". If you pick points, you must enter at least two mid-points. */
  between:
    | "edges"
    | "left-right"
    | "top-bottom"
    | "left-top"
    | "left-bottom"
    | "right-top"
    | "right-bottom"
    | "points";
  /** Specify areas that must be passed through by the paths. Worth with any path options*/
  midPoints?: PathPoint[];
  /** Number of paths to create: {min, max} range. Has optional scaling factor to scale paths by the map size */
  amount: {
    min: number;
    max: number;
    min_scaling_factor?: ScalingFactor;
    max_scaling_factor?: ScalingFactor;
  };
  /** Optional range constraint for path placement. */
  range?: Range;
}

/**
 * Instruction to connect terrain clusters with paths.
 * Finds clusters of specific terrain types and connects them with paths.
 */
export interface InstructionConnectClusters extends NaturalPathParams {
  /** Instruction type is ConnectClusters. */
  type: InstructionType.ConnectClusters;
  /** Terrain type(s) to find clusters of. Can be a single terrain ID or array of terrain IDs. */
  fromTerrain: number | number[];
  /** Deprecated: the terrain that paths will be made from. Overriden by terrain property */
  pathTerrain: number;
  /** Minimum size of a cluster to be connected. */
  minGroupSize: number;
  /** Maximum distance between clusters to connect them. */
  maxDistance: number;
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
  /** Optional team that owns this objective. */
  team?: number;
  /** Optional objective type (Small or Big). Defaults to Small. */
  objectiveType?: ObjectiveType;
  /** Optional name used to reference this objective from triggers. */
  name?: string;
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
  size: Range;
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

export interface TerrainFilter {
  /** Terrain type to filter. */
  terrains?: TerrainType[];
  /** Search radius. Default is 0. */
  searchRadius?: number;
  /** Minimum amount of terrains to filter. Default is 1. */
  minAmount?: number;
  /** Heights that the feature can be placed on. */
  heights?: Range[];
}

/**
 * Instruction to place an objective layer on the map.
 */
export interface InstructionObjectiveLayer extends BaseInstruction {
  /** Instruction type is ObjectiveLayer. */
  type: InstructionType.ObjectiveLayer;
  /**
   * Player slot that owns objectives placed by this layer. Team is taken from game
   * {@link PlayerSetup} for that slot. If this is defined, {@link team} must not be.
   */
  player?: number;
  /**
   * Team that owns objectives placed by this layer. At game init, the owning player number
   * is the first {@link PlayerSetup} in game order on this team. If this is defined,
   * {@link player} must not be.
   */
  team?: number;
  /** Type of objective that this objective layer can place. */
  objectiveType: ObjectiveType;
  /** Optional - Number between 0 and 100 indicating the chance of this objective layer being placed. */
  chance?: number;
  /** Optional - Terrain filter. */
  terrainFilter?: TerrainFilter;
  /** Optional - Minimum distance between this objective layer and the nearest objective. NOTE: This parameter ignores the bounds arguemnt.*/
  minDistance?: number;
  /** Optional - Specify a maximum number of objectives to create */
  maxObj?: number;
}

/**
 * Copies one half of the map onto the other, so two armies deployed on opposite halves meet
 * the same ground. Relief and obstacles can be made fair while woods and villages stay irregular.
 */
export interface InstructionSymmetry extends BaseInstruction {
  /** Instruction type is Symmetry. */
  type: InstructionType.Symmetry;
  /**
   * `mirror` reflects the kept half across the middle; `rotate` turns it 180 degrees, which keeps
   * the two ends fair while the map's left and right still differ.
   */
  mode: "mirror" | "rotate";
  /** The half that is kept and copied. Default is "top". */
  keep?: "top" | "bottom" | "left" | "right";
  /** Copy the relief. Default is true. */
  heights?: boolean;
  /**
   * Copy only these terrain types: a tile is overwritten when it or its source holds one of
   * them. All terrain is copied when absent.
   */
  terrains?: TerrainType[];
}

/**
 * Union type representing any valid procedural generation instruction.
 */
/**
 * Instruction to lay out fields the way farmland grows along roads: the grass beside each road,
 * past a one-tile verge, is cut into strips that run parallel to it, and each strip is sown with
 * one crop or left as meadow. Neighbouring strips never share a crop, so each reads as its own
 * field, and a sliver where a strip is cut short stays meadow. Only grass is sown.
 */
export interface InstructionFields extends BaseInstruction {
  /** Instruction type is Fields. */
  type: InstructionType.Fields;
  /** Crops to sow, one per strip. */
  terrains: TerrainType[];
  /** Terrains the strips run along. Default: road. */
  along?: TerrainType[];
  /** How far from the road, in tiles, the fields reach. */
  maxDistance: number;
  /** Width of a strip across the road, in tiles. */
  width: Range;
  /** Length of a strip along the road, in tiles. */
  size: Range;
  /** Share of strips that are sown; the rest stay meadow. */
  chance: number;
  /** Optional line of this terrain (a hedge or tree row) between strips, drawn with `chance`. */
  border?: { terrain: TerrainType; chance: number };
  /** Heights the fields may be sown on. */
  heights?: Range[];
}

export type AnyInstruction =
  | InstructionTerrainNoise
  | InstructionHeightNoise
  | InstructionTerrainCircle
  | InstructionTerrainRectangle
  | InstructionNaturalPath
  | InstructionConnectClusters
  | InstructionObjective
  | InstructionLake
  | InstructionObjectiveLayer
  | InstructionSymmetry
  | InstructionFields;
