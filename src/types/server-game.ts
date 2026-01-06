import {
  AnyAction,
  RangedAttackAction,
  TurnSubmission,
  PlayerInfo,
  UserTier,
  GameScenarioType,
  GameLocales,
  GameClientEventDto,
  GameTrigger,
  ITriggerSystem,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  ObjectiveDto,
  GameMap,
  TerrainType,
  FogOfWarResult,
  IServerFogOfWarService,
  IOrderManager,
  IOrganizationSystem,
  IAttackSystem,
  IMovementSystem,
  Player,
  UnitDto,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GameEra } from "@lob-sdk/game-data-manager";
import { Point2, Vector2 } from "@lob-sdk/vector";
import { BaseUnit } from "@lob-sdk/unit";
import { BaseVpService } from "@lob-sdk/vp-service";
import { BaseObjective } from "@lob-sdk/objective";

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
export enum DynamicBattleType {
  /** Smallest battle type. */
  Clash = "clash",
  /** Standard battle type. */
  Combat = "combat",
  /** Large battle type. */
  Battle = "battle",
  /** Largest battle type. */
  GrandBattle = "grand_battle",
}

/**
 * Template configuration for a battle type, defining resources, unit limits, and game rules.
 */
export interface BattleTypeTemplate {
  /** Starting manpower for players. */
  manpower: number;
  /** Starting gold for players. */
  gold: number;
  /** Starting ammo reserve for players. */
  ammoReserve: number;
  /** Conversion rate from gold to ammo. */
  goldToAmmoRate: number;
  /** Optional ratio for spawning skirmishers [skirmisherRatio, coreUnitsRatio]. */
  skirmisherRatio?: number[];
  /** Whether fog of war is enabled. */
  fogOfWar: boolean;
  /** Maximum number of each unit type allowed. */
  unitCaps: Record<UnitType, number>;
  /** ELO K-factor for rating calculations. */
  eloKFactor: number;
  /** Number of ticks required to capture small objectives. */
  ticksToCaptureSmall: number;
  /** Number of ticks required to capture big objectives. */
  ticksToCaptureBig: number;
  /** Victory points per big objective. */
  bigVps: number;
  /** Victory points per small objective. */
  smallVps: number;
  /** Default army composition for this battle type. */
  defaultArmy: UnitCounts;
  /** If Supply Lines rule enabled, this will be the logistics per big objective. */
  logistics?: number;
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
  /** Type of scenario (e.g., tutorial, skirmish, campaign). */
  scenarioType: GameScenarioType;

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
   * Turn duration limit in seconds.
   */
  turnTimeLimit: number;

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
  /** Tournament ID, if this is a tournament game. Required for the client to know a game is a tournament game. */
  tournamentId?: number;
  /** Timestamp in seconds when the game was created. */
  createdAt: number;
  /** Additional metadata for the game. */
  metadata?: GameMetadata;
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
  /** Type of damage dealt. */
  damageType: string;
  /** Optional backlash hit if the attack caused a counter-attack. */
  backlashHit?: DamageHit;
  /** Whether this was a charge attack. */
  charge?: boolean;
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
 * Unique identifier for a game. Can be a string or number.
 */
export type GameId = string | number;

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
 * Interface for the ServerGame class
 */
export interface IServerGame {
  /** Unique identifier for the game */
  readonly id: GameId;
  /** Name of the scenario being played */
  readonly scenarioName: string;
  /** Dynamic battle type configuration, if applicable */
  readonly dynamicBattleType: DynamicBattleType | null;
  /** Type of scenario (e.g., tutorial, skirmish, campaign) */
  readonly scenarioType: GameScenarioType;
  /** Whether fog of war is enabled for this game */
  readonly fogOfWar: boolean;
  /** Whether this is a ranked game */
  readonly ranked: boolean;
  /** Whether this game gives rewards to players */
  readonly givesRewards: boolean;

  /** Map of all units in the game, keyed by entity ID */
  units: Map<EntityId, BaseUnit>;
  /** Current turn number */
  turnNumber: number;
  /** Whether the game has started */
  started: boolean;
  /** Whether the game has finished */
  finished: boolean;
  /** Reason why the game ended, if finished */
  endReason: GameEndReason | null;
  /** Configuration for all players in the game */
  playerSetups: PlayerSetup[];
  /** Timestamp (milliseconds) when the current turn started */
  turnStartedTime: number;
  /** Timestamp (milliseconds) when the game was created */
  createdAt: number;
  /** Maximum number of turns before the game ends */
  maxTurn: number;
  /** The game map containing terrain and deployment zones */
  map: GameMap;
  /** Actions from the last turn execution */
  lastActions: AnyAction[] | null;
  /** Previous game state, used for state comparisons */
  previousState: GameState | null;
  /** Set of units that are currently attacking */
  attackingUnits: Set<BaseUnit>;
  /** Set of pending melee attack data */
  pendingMeleeAttacks: Set<PendingMeleeAttackData>;
  /** Victory points service for tracking VP */
  vpService: BaseVpService;
  /** Manager for handling unit orders */
  orderManager: IOrderManager;
  /** System for managing unit organization */
  organizationSystem: IOrganizationSystem;
  /** System for handling combat attacks */
  attackSystem: IAttackSystem;
  /** System for managing unit movement */
  movementSystem: IMovementSystem;
  /** Turn number when draw offers become available */
  drawUnlockTurn: number;
  /** System for handling game triggers and events */
  triggerSystem: ITriggerSystem;
  /** Client events to be sent to players */
  clientEvents: GameClientEventDto[] | null;
  /** Client events pending to be saved */
  clientEventsToSave: Set<Omit<GameClientEventDto, "id">>;
  /** Service for calculating fog of war visibility */
  fogOfWarService: IServerFogOfWarService;

  /**
   * Gets the team number for a player
   * @param playerNumber - Optional player number. If not provided, uses current player
   * @returns The team number
   */
  getPlayerTeam(playerNumber?: number): number;
  /**
   * Initializes the game state from a saved state
   * @param state - The game state to load
   */
  setupFromState(state: GameState<false> | GameState<true>): void;
  /**
   * Starts the game, initializing turn order and game state
   */
  start(): void;
  /**
   * Creates units from unit DTOs
   * @param unitDtos - Optional array of unit data transfer objects
   * @returns Array of created ServerUnit instances
   */
  createUnits(unitDtos?: UnitDtoPartialId[]): BaseUnit[];
  /**
   * Creates objectives from objective DTOs
   * @param objectiveDtos - Array of objective data transfer objects
   * @returns Array of created Objective instances
   */
  createObjectives(objectiveDtos: ObjectiveDto<false>[]): BaseObjective[];
  /**
   * Gets all objectives in the game
   * @returns Array of all objectives
   */
  getObjectives(): BaseObjective[];
  /**
   * Gets an objective by its ID
   * @param objectiveId - The objective ID
   * @returns The objective, or undefined if not found
   */
  getObjective(objectiveId: number): BaseObjective | undefined;
  /**
   * Gets an objective by its name
   * @param name - The objective name
   * @returns The objective, or undefined if not found
   */
  getObjectiveByName(name: string): BaseObjective | undefined;

  /**
   * Checks if the game has reached maximum player capacity
   * @returns True if the game is full
   */
  isGameFull(): boolean;
  /**
   * Resets the turn state, preparing for a new turn
   */
  resetTurn(): void;
  /**
   * Checks if a player has passed their turn
   * @param playerNumber - The player number to check
   * @returns True if the player has passed
   */
  hasPlayerPassed(playerNumber: number): boolean;
  /**
   * Marks the current player's turn as passed
   */
  passTurn(): void;
  /**
   * Checks if all players have passed their turns
   * @returns True if all players have passed
   */
  allTurnsPassed(): boolean;
  /**
   * Executes the current turn, processing all orders and updating game state
   */
  executeTurn(): void;
  /**
   * Creates a new player in the game
   * @param userId - The user ID
   * @param username - The player's username
   * @param elo - The player's ELO rating
   * @param userTier - The player's tier level
   * @param playerNumber - Optional player number. If not provided, auto-assigned
   * @returns The created Player instance
   */
  createPlayer(
    userId: number,
    username: string,
    elo: number,
    userTier: UserTier,
    playerNumber?: number
  ): Player;
  /**
   * Gets the next available player number
   * @returns The next player number
   */
  getNextPlayerNumber(): number;
  /**
   * Adds one or more players to the game
   * @param players - Players to add
   */
  addPlayer(...players: Player[]): void;
  /**
   * Adds a new player with the provided properties
   * @param props - Player creation properties
   * @returns The created Player instance
   */
  addNewPlayer(props: AddNewPlayerProps): Player;
  /**
   * Gets a player by their player number
   * @param playerNumber - The player number
   * @returns The player, or undefined if not found
   */
  getPlayer(playerNumber: number): Player | undefined;
  /**
   * Gets a player by their user ID
   * @param userId - The user ID
   * @returns The player, or null if not found
   */
  getPlayerByUserId(userId: number): Player | null;

  /**
   * Adds one or more units to the game
   * @param units - Units to add
   */
  addUnit(...units: BaseUnit[]): void;
  /**
   * Adds one or more objectives to the game
   * @param objectives - Objectives to add
   */
  addObjective(...objectives: BaseObjective[]): void;
  /**
   * Gets the current game state
   * @returns The current game state
   */
  getState(): GameState;
  /**
   * Gets all units in the game
   * @returns Array of all units
   */
  getUnits(): BaseUnit[];
  /**
   * Gets the set of unit types owned by a player
   * @param playerNumber - The player number
   * @returns Set of unit types
   */
  getUnitTypesOf(playerNumber: number): Set<UnitType>;
  /**
   * Gets all players in the game
   * @returns Array of all players
   */
  getPlayers(): Player[];
  /**
   * Gets all user IDs of players in the game
   * @returns Array of user IDs
   */
  getUserIds(): number[];
  /**
   * Submits orders for a player's turn
   * @param playerNumber - The player number
   * @param turnSubmission - The turn submission containing orders
   */
  submitOrders(playerNumber: number, turnSubmission: TurnSubmission): void;
  /**
   * Gets the current turn status
   * @param wsServerTimestamp - WebSocket server timestamp, or null
   * @returns The turn status
   */
  getTurnStatus(wsServerTimestamp: number | null): TurnStatus;
  /**
   * Handles turn status updates and executes turn if needed
   * @param turnStatus - The turn status to handle
   * @param options - Optional handling options
   */
  handleTurnStatus(
    turnStatus: TurnStatus,
    options?: Partial<HandleTurnStatusOptions>
  ): Promise<void>;
  /**
   * Gets IDs of players who are idle (haven't submitted orders)
   * @returns Array of idle player user IDs
   */
  getIdlePlayerIds(): number[];
  /**
   * Removes a unit from the game
   * @param unit - The unit to remove
   */
  removeUnit(unit: BaseUnit): void;
  /**
   * Removes all units from the game
   */
  removeAllUnits(): void;
  /**
   * Gets a unit by its entity ID
   * @param id - The entity ID
   * @returns The unit, or undefined if not found
   */
  getUnit(id: number): BaseUnit | undefined;
  /**
   * Gets a unit by its name
   * @param name - The unit name
   * @returns The unit, or undefined if not found
   */
  getUnitByName(name: string): BaseUnit | undefined;
  /**
   * Gets the closest unit to a position from a list of units
   * @param position - The position to measure from
   * @param units - The units to search through
   * @returns The closest unit, or null if no units provided
   */
  getClosestUnitOf(position: Vector2, units: BaseUnit[]): BaseUnit | null;

  /**
   * Calculates the trajectory for a shot from a unit to a target position
   * @param unit - The unit shooting
   * @param targetPosition - The target position
   * @param ignoreEffects - Whether to ignore unit effects
   * @param forAutofire - Whether this is for autofire calculation
   * @returns The shot trajectory data
   */
  getShotTrajectory(
    unit: BaseUnit,
    targetPosition: Vector2,
    ignoreEffects?: boolean,
    forAutofire?: boolean
  ): any;
  /**
   * Executes a shot from a unit to a target position
   * @param gameDataManager - The game data manager
   * @param unit - The unit shooting
   * @param targetPosition - The target position
   * @returns The shoot result, or null if shot is invalid
   */
  shoot(
    gameDataManager: GameDataManager,
    unit: BaseUnit,
    targetPosition: Vector2
  ): ShootResult | null;
  /**
   * Calculates ranged damage between a shooter and target
   * @param shooter - The unit shooting
   * @param target - The target unit
   * @param damageType - The type of damage
   * @param stepStrength - The step strength modifier
   * @returns The damage hit result
   */
  calculateRangedDamage(
    shooter: BaseUnit,
    target: BaseUnit,
    damageType: string,
    stepStrength: number
  ): DamageHit;
  /**
   * Calculates melee damage between an attacker and defender
   * @param attacker - The attacking unit
   * @param defender - The defending unit
   * @param side - The direction of the attack
   * @param isCharging - Whether the attacker is charging
   * @returns The damage hit result, or null if attack is invalid
   */
  calculateMeleeDamage(
    attacker: BaseUnit,
    defender: BaseUnit,
    side: Direction,
    isCharging: boolean
  ): DamageHit | null;

  /**
   * Checks if a player has been defeated
   * @param playerNumber - The player number to check
   * @returns True if the player is defeated
   */
  checkPlayerDefeat(playerNumber: number): boolean;
  /**
   * Defeats a player, removing them from the game
   * @param playerNumber - The player number to defeat
   */
  defeatPlayer(playerNumber: number): void;
  /**
   * Defeats a player if they exist in the game
   * @param playerNumber - The player number to defeat
   */
  defeatPlayerIfExists(playerNumber: number): void;
  /**
   * Gets the winning team number
   * @returns The winning team number, or null if no winner
   */
  getWinnerTeam(): number | null;
  /**
   * Gets the game result
   * @returns The game result, or null if game hasn't finished
   */
  getResult(): GameResult | null;
  /**
   * Counts the number of teams that still have alive players
   * @returns The number of alive teams
   */
  countAliveTeams(): number;
  /**
   * Gets all alive player numbers for a team
   * @param team - The team number
   * @returns Array of alive player numbers
   */
  getAlivePlayersOfTeam(team: number): number[];
  /**
   * Gets the first player number for a team
   * @param team - The team number
   * @returns The first player number
   */
  getFirstPlayerOfTeam(team: number): number;
  /**
   * Gets all units owned by a player
   * @param player - The player number
   * @returns Array of units owned by the player
   */
  getUnitsOfPlayer(player: number): BaseUnit[];

  /**
   * Gets the terrain type at a unit's position
   * @param unit - The unit to check
   * @returns The terrain type
   */
  getUnitTerrain(unit: BaseUnit): TerrainType;
  /**
   * Checks if a point is outside the map boundaries
   * @param point - The point to check
   * @returns True if the point is outside the map
   */
  isPointOutsideMap(point: Point2): boolean;
  /**
   * Checks if a player has any active (non-routing) units
   * @param playerNumber - The player number to check
   * @returns True if the player has active units
   */
  hasActiveUnits(playerNumber: number): boolean;
  /**
   * Checks if the turn timeout has been exceeded
   * @param wsServerTimestamp - WebSocket server timestamp, or null
   * @returns True if the timeout has been exceeded
   */
  hasTurnTimeoutExceeded(wsServerTimestamp: number | null): boolean;
  /**
   * Finishes the game with a specific reason
   * @param reason - The reason the game ended
   */
  finish(reason: GameEndReason): void;
  /**
   * Checks if the game should end and finishes it if conditions are met
   */
  checkGameEnd(): void;
  /**
   * Checks if the turn limit has been exceeded
   * @returns True if turn limit exceeded
   */
  isTurnLimitExceeded(): boolean;
  /**
   * Checks if this is the last turn
   * @returns True if this is the last turn
   */
  isLastTurn(): boolean;
  /**
   * Checks if all players have agreed to a draw
   * @returns True if unanimous draw
   */
  isUnanimousDraw(): boolean;
  /**
   * Checks if this is the first turn
   * @returns True if this is the first turn
   */
  isFirstTurn(): boolean;
  /**
   * Checks if this is a fast game
   * @returns True if this is a fast game
   */
  isFastGame(): boolean;
  /**
   * Checks if the first turn has already passed
   * @returns True if first turn has passed
   */
  wasFirstTurn(): boolean;

  /**
   * Checks if a team has any objectives
   * @param team - The team number
   * @returns True if the team has objectives
   */
  hasObjectives(team: number): boolean;
  /**
   * Checks if a team has any big objectives
   * @param team - The team number
   * @returns True if the team has big objectives
   */
  hasBigObjectives(team: number): boolean;
  /**
   * Gets the closest objective to a position matching a condition
   * @param position - The position to measure from
   * @param condition - Function to filter objectives
   * @returns The closest matching objective, or null if none found
   */
  getClosestObjective(
    position: Vector2,
    condition: (objective: BaseObjective) => boolean
  ): BaseObjective | null;
  /**
   * Gets the closest enemy objective to a position
   * @param position - The position to measure from
   * @param team - The team number (enemy of this team)
   * @returns The closest enemy objective, or null if none found
   */
  getClosestEnemyObjective(
    position: Vector2,
    team: number
  ): BaseObjective | null;
  /**
   * Gets the closest ally objective to a position
   * @param position - The position to measure from
   * @param team - The team number (ally of this team)
   * @returns The closest ally objective, or null if none found
   */
  getClosestAllyObjective(
    position: Vector2,
    team: number
  ): BaseObjective | null;

  /**
   * Calculates fog of war visibility for a team
   * @param team - The team number
   * @returns Fog of war result with visibility levels, or null if fog of war disabled
   */
  calculateFogOfWar(team: number): FogOfWarResult | null;
  /**
   * Gets enemy units visible to a specific player based on fog of war
   * @param playerNumber - The player number to check visibility for
   * @returns Array of visible enemy units
   */
  getVisibleEnemyUnits(playerNumber: number): BaseUnit[];
  /**
   * Gets nearby units visible to a specific player based on fog of war
   * @param playerNumber - The player number to check visibility for
   * @param position - The position to search from
   * @param range - The range to search within
   * @returns Array of visible nearby units
   */
  getVisibleNearbyUnits(
    playerNumber: number,
    position: Vector2,
    range: number
  ): BaseUnit[];
  /**
   * Gets the closest unit from a list, but only if it's visible to the player
   * @param playerNumber - The player number to check visibility for
   * @param position - The position to search from
   * @param units - The units to search through
   * @returns The closest visible unit, or null if none are visible
   */
  getVisibleClosestUnitOf(
    playerNumber: number,
    position: Vector2,
    units: BaseUnit[]
  ): BaseUnit | null;

  /**
   * Gets an entity (unit or objective) by its entity ID
   * @param entityId - The entity ID
   * @returns The entity (unit or objective), or undefined if not found
   */
  getEntity(entityId: EntityId): BaseUnit | BaseObjective | undefined;
  /**
   * Gets the army composition for a player
   * @param playerNumber - The player number
   * @returns Object mapping unit types to counts
   */
  getArmyComposition(playerNumber: number): UnitCounts;

  /**
   * Applies damage taken effects to a unit
   * @param unit - The unit that took damage
   * @param collidedWithEnemy - Whether the unit collided with an enemy
   */
  applyUnitDamageTaken(unit: BaseUnit, collidedWithEnemy: boolean): void;
  /**
   * Records damage taken by a unit for a player
   * @param unit - The unit that took damage
   * @param damage - The amount of damage taken
   */
  recordUnitDamageForPlayer(unit: BaseUnit, damage: number): void;
  /**
   * Gets the total damage taken by a player's units
   * @param playerNumber - The player number
   * @returns Object mapping unit IDs to damage amounts
   */
  getPlayerUnitDamageTaken(playerNumber: number): Record<string, number>;

  /**
   * Clears all turn-level caches
   */
  clearTurnCache(): void;
  /**
   * Gets the maximum number of players allowed in the game
   * @returns The maximum number of players
   */
  getMaxPlayers(): number;

  /**
   * Checks if a unit can shoot
   * @param unit - The unit to check
   * @returns True if the unit can shoot
   */
  canUnitShoot(unit: BaseUnit): boolean;

  /**
   * Offers a draw from a player
   * @param playerNumber - The player number offering the draw
   */
  offerDraw(playerNumber: number): void;
  /**
   * Withdraws a draw offer
   * @param playerNumber - The player number withdrawing the draw
   */
  withdrawDraw(playerNumber: number): void;

  /**
   * Checks if a team has any team objectives
   * @param team - The team number
   * @returns True if the team has team objectives
   */
  hasTeamObjectives(team: number): boolean;

  /**
   * Gets filtered game data for a specific player, including fog of war visibility
   * @param playerTeam - The team number of the requesting player
   * @param players - Array of player info
   * @returns Filtered game data for the player
   */
  getGameData(playerTeam: number, players: PlayerInfo[]): GameData;
  /**
   * Gets the victory points for a team
   * @param team - The team number
   * @returns The victory points
   */
  getTeamVictoryPoints(team: number): number;

  /**
   * Sets the ammo reserve for a player
   * @param playerNumber - The player number
   * @param amount - The amount of ammo to set
   */
  setPlayerAmmoReserve(playerNumber: number, amount: number): void;
  /**
   * Consumes ammo from a player's reserve
   * @param playerNumber - The player number
   * @param amount - The amount of ammo to consume
   * @returns True if ammo was successfully consumed
   */
  consumeAmmoFromReserve(playerNumber: number, amount: number): boolean;

  /**
   * Clears all tick-level caches
   */
  clearTickCache(): void;

  /**
   * Returns how much time has passed in seconds since the game was created
   * @returns Age of the game in seconds
   */
  age(): number;

  /**
   * Gets units near a position within a certain height.
   * @param position - The position to search from.
   * @param height - The height/distance to search within.
   * @returns Array of nearby units.
   * @template T - The type of unit to return, must extend BaseUnit.
   */
  getNearbyUnits<T extends BaseUnit = BaseUnit>(
    position: Point2,
    height: number
  ): T[];
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
  /** Type of scenario (e.g., tutorial, skirmish, campaign). */
  scenarioType: GameScenarioType;
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
  /** Turn duration limit in seconds. */
  turnTimeLimit: number;
  /** Whether the game has started. */
  started: boolean;
  /** Whether the game has finished. */
  finished: boolean;
  /** Whether this is a ranked game. */
  ranked: boolean;
  /** Whether this game gives rewards to players. */
  givesRewards: boolean;
  /** Maximum number of turns before the game ends. */
  maxTurn: number;
  /** Configuration for all players in the game. */
  playerSetups?: PlayerSetup[];
  /** Tournament ID, if this is a tournament game. */
  tournamentId?: number;
  /** Turn number when draw offers become available. */
  drawUnlockTurn: number;
  /** Last actions executed, if any. */
  lastActions?: AnyAction[] | null;
  /** Client events to be sent to players. */
  clientEvents?: GameClientEventDto[] | null;
  /** Whether fog of war is enabled. */
  fogOfWar?: boolean;
  /** Timestamp (milliseconds) when the game was created. */
  createdAt?: number;
  /** Additional metadata for the game. */
  metadata?: GameMetadata;
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
