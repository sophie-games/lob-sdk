import {
  AnyAction,
  RangedAttackAction,
  PlayerInfo,
  UserTier,
  GameScenarioType,
  GameLocales,
  GameClientEventDto,
  GameTrigger,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  ObjectiveDto,
  GameMap,
  TerrainType,
  Player,
  UnitDto,
  Size,
  TeamSize,
  UnitTemplate,
  FormationTemplate,
  OrderTemplate,
  OrderType,
} from "@lob-sdk/types";
import type {
  DamageTypeTemplate,
  UnitCategoryTemplate,
  GameConstants,
  GameRules,
} from "../game-data-manager/types";
import type { DeepPartial } from "../utils/object-merge";
import type { CustomTerrainCategoryOverride, CustomSprite } from "./scenario";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GameEra } from "@lob-sdk/game-data-manager";
import { Vector2 } from "@lob-sdk/vector";
import { BaseUnit } from "@lob-sdk/unit";
import { GameTimePreset } from "@lob-sdk/game-time-preset";

/**
 * A unique identifier for game entities (units, objectives, etc.).
 */
export type EntityId = number;

/**
 * Status of a game turn.
 */
export enum TurnStatus {
  /** Turn is currently in progress. */
  InProgress = "IN_PROGRESS",
  /** Turn has been completed. */
  Completed = "COMPLETED",
  /** Turn has timed out. */
  TimedOut = "TIMED_OUT",
}

/**
 * Reason why a game ended.
 */
export enum GameEndReason {
  /** Game ended due to victory conditions. */
  Victory = "victory",
  /** Game ended because maximum turn limit was reached. */
  MaxTurn = "max_turn",
  /** Game was cancelled. */
  Cancelled = "cancelled",
  /** Game ended in a draw by agreement. */
  DrawByAgreement = "draw_by_agreement",
}

/**
 * Dynamic battle type configuration.
 */
export type DynamicBattleType = string;

/**
 * Template configuration for a battle type, defining resources, unit limits, and game rules.
 */
export interface BattleTypeTemplate {
  /** Starting manpower for players. */
  manpower: number;
  /** Starting gold for players. */
  gold: number;
  /** Optional ratio for spawning skirmishers [skirmisherRatio, coreUnitsRatio]. */
  skirmisherRatio?: number[];
  /** Maximum number of each unit type allowed. */
  unitCaps: Record<UnitType, number>;
  /** Number of ticks required to capture small objectives. */
  ticksToCaptureSmall: number;
  /** Number of ticks required to capture big objectives. */
  ticksToCaptureBig: number;
  /**
   * Per-battle-type override for the default big objective VP (the objectives
   * rule's vpBigDefaultPoints). Omit to inherit the era default. Resolved via the
   * BaseGame.vpBigDefaultPoints getter (scenario override > battle type > era).
   */
  vpBigDefaultPoints?: number;
  /**
   * Per-battle-type override for the default small objective VP (the objectives
   * rule's vpSmallDefaultPoints). Omit to inherit the era default. Resolved via the
   * BaseGame.vpSmallDefaultPoints getter (scenario override > battle type > era).
   */
  vpSmallDefaultPoints?: number;
  /**
   * Minimum distance, in world pixels, kept between a team's objectives when
   * repositioned during deployment. Omit or set to 0 to disable. Read via
   * GameDataManager.getObjectiveSpacing.
   */
  objectiveSpacing?: number;
  /**
   * Number of small objectives each side owns and may reposition during the
   * deployment phase. Omit or set to 0 for none. Read via
   * GameDataManager.getSmallObjectivesPerSide.
   */
  smallObjectivesPerSide?: number;
  /**
   * Number of neutral objectives spawned on the no-man's-land line at the end of
   * deployment, spread along that line as a contested tiebreaker row. Omit for
   * the single drifting neutral objective. Read via
   * GameDataManager.getCentralNeutralObjectives.
   */
  centralNeutralObjectives?: number;
  /**
   * Per-battle-type override for the casualties VP weight (the objectives
   * rule's vpLossRatioPoints). Omit to inherit the era default. Resolved via the
   * BaseGame.vpLossRatioPoints getter (scenario override > battle type > era).
   */
  vpLossRatioPoints?: number;
  /**
   * Per-battle-type override for the under-pressure VP rate (the objectives
   * rule's vpTicksUnderPressureBase). Omit to inherit the era default. Resolved via
   * the BaseGame.vpTicksUnderPressureBase getter (scenario override > battle type > era).
   */
  vpTicksUnderPressureBase?: number;
  /**
   * Per-battle-type override for the under-pressure objective-share threshold
   * (the objectives rule's vpPressureThreshold). Omit to inherit the era default.
   * Resolved via the BaseGame.vpPressureThreshold getter (scenario override > battle type > era).
   */
  vpPressureThreshold?: number;
  /**
   * Per-battle-type override for the starting/base VP (the objectives rule's
   * vpBasePoints). Omit to inherit the era default. Resolved via the
   * BaseGame.vpBasePoints getter (scenario override > battle type > era).
   */
  vpBasePoints?: number;
  /**
   * Per-battle-type override for the tie-break margin VP (the objectives rule's
   * vpPointsToTieBreak). Omit to inherit the era default. Resolved via the
   * BaseGame.vpPointsToTieBreak getter (scenario override > battle type > era).
   */
  vpPointsToTieBreak?: number;
  /** Default army composition for this battle type. */
  defaultArmy: UnitCounts;
  /** If Supply Lines rule enabled, this will be the logistics per big objective. */
  logistics?: number;
  /**
   * Determines the map size from the player count.
   * The index increases by 1 for every 2 players, up to the last available index.
   */
  mapSize: Array<Size>;
  /** Chance (0-100) to receive premium currency as a reward. */
  premiumCurrencyChance: number;
  /** Maximum number of turns for this battle type. Falls back to DEFAULT_MAX_TURN when omitted. */
  maxTurn?: number;
  /** Whether this battle type is allowed in ranked matchmaking (defaults to false when omitted). */
  ranked?: boolean;
  /**
   * Fixed team size (players per side) for this battle type in matchmaking.
   * Defaults to 1v1 when omitted; read via GameDataManager.getBattleTypeTeamSize.
   */
  teamSize?: TeamSize;
}

/**
 * Direction relative to a unit's facing.
 */
export enum Direction {
  /** Front of the unit. */
  Front,
  /** Right side of the unit. */
  Right,
  /** Back of the unit. */
  Back,
  /** Left side of the unit. */
  Left,
}

/**
 * Result of a game for a user.
 */
export type GameUserResult = "win" | "lose" | "tie";

/**
 * Metadata column in the games table.
 * Stores additional game information that doesn't affect gameplay.
 */
export interface GameMetadata {
  /** Whether the game ended with a conquest victory. */
  conquestVictory?: boolean;
  /** Language locales used in the game. */
  locales?: GameLocales;
  /** Custom variables for game tracking. */
  vars?: Record<string, number>;
  /** Additive unit templates layered on top of the era registry for this game. */
  customUnitTemplates?: UnitTemplate[];
  /** Additive damage types layered on top of the era registry for this game. */
  customDamageTypes?: DamageTypeTemplate[];
  /** Additive formation templates layered on top of the era registry for this game. */
  customUnitFormations?: FormationTemplate[];
  /** Additive unit categories layered on top of the era registry for this game. */
  customUnitCategories?: UnitCategoryTemplate[];
  /** Terrain category overrides applied on top of the era registry for this game. */
  customTerrainCategories?: CustomTerrainCategoryOverride[];
  /** Uploaded sprites (inline base64) referenced by custom unit formations. */
  customSprites?: Record<string, CustomSprite>;
  /** Sparse game-constant overrides layered on the era registry for this game. */
  customGameConstants?: Partial<GameConstants>;
  /** Sparse (deep-partial) game-rule overrides layered on the era registry for this game. */
  customGameRules?: DeepPartial<GameRules>;
  /** Sparse per-order overrides (keyed by OrderType id) deep-merged onto the era orders for this game. */
  customOrders?: Partial<Record<OrderType, DeepPartial<OrderTemplate>>>;
}

/**
 * Game data that will be saved in the DB.
 * Contains all information needed to restore and continue a game.
 */
export interface GameData {
  /** The game era (e.g., "napoleonic", "ww2"). */
  era: GameEra;
  /** Name of the scenario being played. */
  scenarioName: string;

  /**
   * Current state of the game.
   */
  gameState: GameState;

  /**
   * Last actions executed. It will be null if it is the first turn.
   */
  lastActions: AnyAction[] | null;

  /**
   * Previous state of the game. It will be null if it is the first turn.
   */
  prevGameState: GameState | null;

  /** Information about all players in the game. */
  players: PlayerInfo[];

  /** Current turn number. */
  turnNumber: number;
  /** Whether the game has started. */
  started: boolean;
  /** Whether the game has finished. */
  finished: boolean;
  /** Whether this is a ranked game. */
  ranked: boolean;
  /** Reason why the game ended, if finished. */
  endReason: GameEndReason | null;
  /**
   * Timestamp in seconds for the start of the current turn.
   */
  turnStartedTime: number;

  /**
   * The Fischer timing settings.
   */
  timePreset: GameTimePreset;

  /** ELO K-factor for this game (from time control at creation; use 0 when not applicable). */
  kFactor: number;

  /** Dynamic battle type configuration, if applicable. */
  dynamicBattleType: DynamicBattleType | null;
  /** Maximum number of turns before the game ends. */
  maxTurn: number;
  /** Configuration for all players in the game. */
  playerSetups: PlayerSetup[];
  /** Turn number when draw offers become available. */
  drawUnlockTurn: number;
  /** Client events to be sent to players. */
  clientEvents: GameClientEventDto[] | null;
  /** Whether fog of war is enabled. */
  fogOfWar: boolean;
  /** When true, spectators see the full map (no fog of war) in ongoing games. */
  spectatorFullVision: boolean;
  /** Tournament ID, if this is a tournament game. Required for the client to know a game is a tournament game. */
  tournamentId?: number;
  /** Arena ID, if this game is part of an arena (Lichess-style continuous tournament). */
  arenaId?: number;
  /** Timestamp in seconds when the game was created. */
  createdAt: number;
  /** Additional metadata for the game. */
  metadata?: GameMetadata;
  /** User id of the player who created the game (custom lobby host). Omitted in some offline/test payloads. */
  creatorId?: number;
}

/**
 * Result of a ranged attack shot.
 */
export interface ShootResult {
  /** The ranged attack action that was executed. */
  action: RangedAttackAction;
  /** Amount of ammo consumed by the shot. */
  ammoCost: number;
  /** Amount of stamina consumed by the shot. */
  staminaCost: number;
}

/**
 * Result of a damage calculation, representing a hit on a unit.
 */
export interface DamageHit {
  /** Amount of damage dealt. */
  damage: number;
  /** Organization bonus/penalty applied. */
  orgBonus: number;
  /**
   * Relative org-damage modifier for this shot, interpolated from the firing distance across
   * the range band (`orgDamageModifier` near/far). Applied as `orgDamageRatio * (1 + modifier)`;
   * absent or 0 means the damage type's flat org ratio.
   */
  orgRangeModifier?: number;
  /**
   * Per-hit reorg-debuff magnitude, pre-scaled by how much of the nominal attack landed
   * (ranged: modifiers x `stepStrength`; melee: the modifier product), so a spent or
   * resisted hit suppresses reorganization less. Falls back to the damage type's flat
   * `reorgDebuff` when absent (e.g. the backlash counter-hit).
   */
  reorgDebuff?: number;
  /** Type of damage dealt. */
  damageType: string;
  /** Optional backlash hit if the attack caused a counter-attack. */
  backlashHit?: DamageHit;
  /** Whether this was a charge attack. */
  charge?: boolean;
  /** Player number that dealt the damage. Omitted for environmental damage (attrition, morale shatter). */
  attackerPlayer?: number;
  /** Unit type that dealt the damage. Omitted for environmental damage. */
  attackerType?: UnitType;
}

/**
 * Represents the complete state of a game at a point in time.
 * @template UsePartialIds - Whether to use partial IDs for units (true) or full IDs (false).
 */
export interface GameState<UsePartialIds extends boolean = false> {
  /** Information about players and their units gained during battle. */
  players: {
    /** The player number. */
    player: number;
    /**
     * Units gained in the middle of the battle. See `addUnit` trigger.
     */
    unitsGained: UnitCounts | null;
    /**
     * Ticks the player has spent under objective pressure. Persisted on
     * snapshots so replay scrubbing restores the correct victory-bar state.
     * Omitted when 0 to save bytes — consumers treat absent as 0. Absent
     * on older snapshots.
     */
    ticksUnderPressure?: number;
  }[];
  /** Information about teams and their army power. */
  teams: {
    /** The team number. */
    team: number;
    /** Total army power of the team. */
    armyPower: number;
  }[];
  /** All units in the game. */
  units: UsePartialIds extends true ? UnitDtoPartialId[] : UnitDto[];
  /** The game map with terrain and deployment zones. */
  map: GameMap;
  /** All objectives in the game, if any. */
  objectives?: ObjectiveDto<UsePartialIds extends true ? false : true>[];
  /** Game triggers that can modify game state. */
  triggers: GameTrigger[];
}

/**
 * Result of a completed game.
 */
export interface GameResult {
  /** The winning team number. */
  winnerTeam: number;
  /** Players who won the game. */
  winners: Pick<Player, "playerNumber" | "userId">[];
  /** Players who lost the game. */
  losers: Pick<Player, "playerNumber" | "userId">[];
}

/**
 * Role of a player in a scenario — who's expected to play this slot.
 * `"either"` (or omitted) lets the caller assign.
 */
export type PlayerSetupRole = "human" | "bot" | "either";

/**
 * Configuration for a player's setup in the game.
 */
export interface PlayerSetup {
  /** The player number. */
  player: number;
  /** The team number the player belongs to. */
  team: number;
  /** Ammo reserve for the player. Used for preset scenarios. */
  ammoReserve?: number;
  /** Base ammo reserve before any modifications. */
  baseAmmoReserve?: number;
  /**
   * Preset army composition. When present, the scenario dictates this
   * player's roster — `allowDynamicArmy` still controls whether the
   * deployment phase runs so units can be repositioned.
   */
  units?: UnitCounts;
  /**
   * Preferred role for this slot (e.g. tutorial wants slot 1 human,
   * slot 2 bot). Undefined/omitted or `"either"` leaves the choice to
   * the caller (matchmaking, lobby).
   */
  role?: PlayerSetupRole;
}

/**
 * Options for handling turn status updates.
 */
export interface HandleTurnStatusOptions {
  /** Callback to execute before a timeout occurs. */
  onPreTimeout: () => Promise<void>;
}

/**
 * Used for backend collision detection and processing.
 */
export interface CollisionData<T extends BaseUnit = BaseUnit> {
  unitA: T;
  unitB: T;
  /** The position where unit A is placed when the collision happens */
  pointA: Vector2;
  /** The position where unit B is placed when the collision happens */
  pointB: Vector2;
  /** The direction of unit A when the collision happens */
  directionA: Direction;
  /** The direction of unit B when the collision happens */
  directionB: Direction;
  /** The flank modifier of unit A when the collision happens */
  flankModA: number;
  /** The flank modifier of unit B when the collision happens */
  flankModB: number;
  /** The squared distance between the 2 collision points */
  squaredDistance: number;
  /** The total overlap percentage of the two units */
  totalOverlap: number;
}

/**
 * Data for a pending melee attack between two units.
 * @template T - The type of unit, must extend BaseUnit.
 */
export interface PendingMeleeAttackData<T extends BaseUnit = BaseUnit> {
  /** The first unit in the melee attack. */
  unit1: T;
  /** The second unit in the melee attack. */
  unit2: T;
  /** Collision data for the attack. */
  collision: CollisionData;
  /** Whether this is a charge attack. */
  charge?: boolean;
}

/**
 * Unique identifier for a game. Matches the SERIAL primary key in the games table.
 */
export type GameId = number;

/**
 * Data for a pending shot, representing where a unit is aiming.
 */
export type PendingShotData = {
  /** Target position for the shot. */
  position: Vector2;
  /** Direction to the position in radians. */
  direction: number;
};

/**
 * Properties for adding a new player to the game.
 */
export interface AddNewPlayerProps {
  /** The user ID. */
  userId: number;
  /** The player's username. */
  username: string;
  /** The player's ELO rating. */
  elo: number;
  /** The player's tier level. */
  userTier?: UserTier;
  /** Optional unit composition for the player. */
  units?: UnitCounts;
  /** Optional player number. If not provided, will be auto-assigned. */
  playerNumber?: number;
}

/**
 * Properties for creating a new ServerGame instance.
 */
export interface ServerGameProps {
  /** Unique identifier for the game. */
  id: GameId;
  /** The game era (e.g., "napoleonic", "ww2"). */
  era: GameEra;
  /** Name of the scenario being played. */
  scenarioName: string;
  /** Dynamic battle type configuration, if applicable. */
  dynamicBattleType: DynamicBattleType | null;
  /** Current turn number. */
  turnNumber: number;
  /** Current game state. */
  state: GameState<true> | GameState<false>;
  /** Previous game state, if available. */
  previousState?: GameState | null;
  /** All players in the game. */
  players: Player[];
  /** Timestamp (milliseconds) when the current turn started. */
  turnStartedTime: number;
  /** Fischer timing settings */
  timePreset: GameTimePreset;
  /** ELO K-factor persisted for this game (matches {@link GameTimePreset.kFactor} at creation). */
  kFactor?: number;
  /** Whether the game has started. */
  started: boolean;
  /** Whether the game has finished. */
  finished: boolean;
  /** Whether this is a ranked game. */
  ranked: boolean;
  /** Whether this game gives rewards to players. */
  givesRewards: boolean;
  /** Whether this custom game is listed in the public lobby. Defaults to false. */
  isPublic?: boolean;
  /** Maximum number of turns before the game ends. */
  maxTurn: number;
  /** Configuration for all players in the game. */
  playerSetups?: PlayerSetup[];
  /** Tournament ID, if this is a tournament game. */
  tournamentId?: number;
  /** Arena ID, if this game is part of an arena. */
  arenaId?: number;
  /** Turn number when draw offers become available. */
  drawUnlockTurn: number;
  /** Last actions executed, if any. */
  lastActions?: AnyAction[] | null;
  /** Client events to be sent to players. */
  clientEvents?: GameClientEventDto[] | null;
  /** Whether fog of war is enabled. */
  fogOfWar?: boolean;
  /** When true, spectators see the full map (no fog of war) in ongoing games. */
  spectatorFullVision: boolean;
  /** Timestamp (milliseconds) when the game was created. */
  createdAt?: number;
  /** Additional metadata for the game. */
  metadata?: GameMetadata;
  /** Reason why the game ended, if finished. */
  endReason?: GameEndReason | null;
  /** User id of the player who created the game. Defaults to 0 when unknown (e.g. tests). */
  creatorId?: number;
  /**
   * Pre-built GameDataManager for this game. When the game uses
   * scenario-scoped custom unit templates, damage types, or formations, the
   * caller passes a per-game instance built via
   * {@link GameDataManager.createWithCustomDefs}. Omit to fall back to the
   * era singleton.
   */
  gameDataManager?: GameDataManager;
}

/**
 * Represents a terrain check with an associated weight.
 */
export interface UnitTerrainCheck {
  /** The terrain type being checked. */
  terrain: TerrainType;
  /** Weight value for this terrain check. */
  weight: number;
}

/**
 * Represents the proportion of a unit's position that is on a specific terrain type.
 */
export interface UnitTerrainProportion {
  /** The terrain type. */
  terrain: TerrainType;
  /** Proportion (0-1) of the unit's position on this terrain. */
  proportion: number;
}

/**
 * Represents a rectangular zone with position and dimensions.
 */
export interface Zone {
  /** X coordinate of the zone's top-left corner. */
  x: number;
  /** Y coordinate of the zone's top-left corner. */
  y: number;
  /** Width of the zone. */
  width: number;
  /** Height of the zone. */
  height: number;
}
