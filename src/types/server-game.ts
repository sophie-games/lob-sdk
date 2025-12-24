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
  UnitDto,
  IUnit,
  UnitCounts,
  ObjectiveDto,
  IObjective,
  GameMap,
  TerrainType,
  FogOfWarResult,
  IServerFogOfWarService,
  IVpService,
  IOrderManager,
  IGameDataManager,
  IOrganizationSystem,
  IAttackSystem,
  IMovementSystem,
  Player,
} from "@lob-sdk/types";
import { Point2, Vector2 } from "@lob-sdk/vector";

export type EntityId = number;

export enum TurnStatus {
  InProgress = "IN_PROGRESS",
  Completed = "COMPLETED",
  TimedOut = "TIMED_OUT",
}

export enum GameEndReason {
  Victory = "victory",
  MaxTurn = "max_turn",
  Cancelled = "cancelled",
  DrawByAgreement = "draw_by_agreement",
}

export enum DynamicBattleType {
  Clash = "clash",
  Combat = "combat",
  Battle = "battle",
  GrandBattle = "grand_battle",
}

export enum Direction {
  Front,
  Right,
  Back,
  Left,
}

export type GameEra = "napoleonic" | "ww2";

export type GameUserResult = "win" | "lose" | "tie";

/**
 * Metadata column in the games table.
 */
export interface GameMetadata {
  conquestVictory?: boolean;
  locales?: GameLocales;
  vars?: Record<string, number>;
}

/**
 * Game data that will be saved in the DB.
 */
export interface GameData {
  era: GameEra;
  scenarioName: string;
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

  players: PlayerInfo[];

  turnNumber: number;
  started: boolean;
  finished: boolean;
  ranked: boolean;
  endReason: GameEndReason | null;

  /**
   * Timestamp in seconds for the start of the current turn.
   */
  turnStartedTime: number;

  /**
   * Turn duration limit in seconds.
   */
  turnTimeLimit: number;

  dynamicBattleType: DynamicBattleType | null;
  maxTurn: number;
  playerSetups: PlayerSetup[];
  drawUnlockTurn: number;
  clientEvents: GameClientEventDto[] | null;
  fogOfWar: boolean;
  tournamentId?: number; // required for the client knowing a game is a tournament game
  createdAt: number; // in seconds
  metadata?: GameMetadata;
}

export interface ShootResult {
  action: RangedAttackAction;
  ammoCost: number;
  staminaCost: number;
}

export interface DamageHit {
  damage: number;
  orgBonus: number;
  damageType: string;
  backlashHit?: DamageHit;
  charge?: boolean;
}

export interface GameState<UsePartialIds extends boolean = false> {
  players: {
    player: number;
    /**
     * Units gained in the middle of the battle. See `addUnit` trigger.
     */
    unitsGained: UnitCounts | null;
  }[];
  teams: {
    team: number;
    armyPower: number;
  }[];
  units: UsePartialIds extends true ? UnitDtoPartialId[] : UnitDto[];
  map: GameMap;
  objectives?: ObjectiveDto<UsePartialIds extends true ? false : true>[];
  triggers: GameTrigger[];
}

export interface GameResult {
  winnerTeam: number;
  winners: Pick<Player, "playerNumber" | "userId">[];
  losers: Pick<Player, "playerNumber" | "userId">[];
}

export interface PlayerSetup {
  player: number;
  team: number;
  /** Used for preset scenarios */
  ammoReserve?: number;
  baseAmmoReserve?: number;
}

export interface HandleTurnStatusOptions {
  onPreTimeout: () => Promise<void>;
}

/**
 * Used for backend collision detection and processing.
 */
export interface CollisionData<T extends IUnit = IUnit> {
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

export interface PendingMeleeAttackData<T extends IUnit = IUnit> {
  unit1: T;
  unit2: T;
  collision: CollisionData;
  charge?: boolean;
}

export type GameId = string | number;

export type PendingShotData = {
  position: Vector2;
  /** Direction to the position in radians */
  direction: number;
};

export interface AddNewPlayerProps {
  userId: number;
  username: string;
  elo: number;
  userTier?: UserTier;
  units?: UnitCounts;
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
  units: Map<EntityId, IUnit>;
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
  attackingUnits: Set<IUnit>;
  /** Set of pending melee attack data */
  pendingMeleeAttacks: Set<PendingMeleeAttackData>;
  /** Victory points service for tracking VP */
  vpService: IVpService;
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
  createUnits(unitDtos?: UnitDtoPartialId[]): IUnit[];
  /**
   * Creates objectives from objective DTOs
   * @param objectiveDtos - Array of objective data transfer objects
   * @returns Array of created Objective instances
   */
  createObjectives(objectiveDtos: ObjectiveDto<false>[]): IObjective[];
  /**
   * Gets all objectives in the game
   * @returns Array of all objectives
   */
  getObjectives(): IObjective[];
  /**
   * Gets an objective by its ID
   * @param objectiveId - The objective ID
   * @returns The objective, or undefined if not found
   */
  getObjective(objectiveId: number): IObjective | undefined;
  /**
   * Gets an objective by its name
   * @param name - The objective name
   * @returns The objective, or undefined if not found
   */
  getObjectiveByName(name: string): IObjective | undefined;

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
  addUnit(...units: IUnit[]): void;
  /**
   * Adds one or more objectives to the game
   * @param objectives - Objectives to add
   */
  addObjective(...objectives: IObjective[]): void;
  /**
   * Gets the current game state
   * @returns The current game state
   */
  getState(): GameState;
  /**
   * Gets all units in the game
   * @returns Array of all units
   */
  getUnits(): IUnit[];
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
  removeUnit(unit: IUnit): void;
  /**
   * Removes all units from the game
   */
  removeAllUnits(): void;
  /**
   * Gets a unit by its entity ID
   * @param id - The entity ID
   * @returns The unit, or undefined if not found
   */
  getUnit(id: number): IUnit | undefined;
  /**
   * Gets a unit by its name
   * @param name - The unit name
   * @returns The unit, or undefined if not found
   */
  getUnitByName(name: string): IUnit | undefined;
  /**
   * Gets the closest unit to a position from a list of units
   * @param position - The position to measure from
   * @param units - The units to search through
   * @returns The closest unit, or null if no units provided
   */
  getClosestUnitOf(position: Vector2, units: IUnit[]): IUnit | null;

  /**
   * Calculates the trajectory for a shot from a unit to a target position
   * @param unit - The unit shooting
   * @param targetPosition - The target position
   * @param ignoreEffects - Whether to ignore unit effects
   * @param forAutofire - Whether this is for autofire calculation
   * @returns The shot trajectory data
   */
  getShotTrajectory(
    unit: IUnit,
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
    gameDataManager: IGameDataManager,
    unit: IUnit,
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
    shooter: IUnit,
    target: IUnit,
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
    attacker: IUnit,
    defender: IUnit,
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
  getUnitsOfPlayer(player: number): IUnit[];

  /**
   * Gets the terrain type at a unit's position
   * @param unit - The unit to check
   * @returns The terrain type
   */
  getUnitTerrain(unit: IUnit): TerrainType;
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
   * Checks if a team should lose for having no big objectives
   * @param team - The team number
   * @returns True if the team should lose
   */
  shouldTeamLoseForNoBigObjectives(team: number): boolean;
  /**
   * Gets the closest objective to a position matching a condition
   * @param position - The position to measure from
   * @param condition - Function to filter objectives
   * @returns The closest matching objective, or null if none found
   */
  getClosestObjective(
    position: Vector2,
    condition: (objective: IObjective) => boolean
  ): IObjective | null;
  /**
   * Gets the closest enemy objective to a position
   * @param position - The position to measure from
   * @param team - The team number (enemy of this team)
   * @returns The closest enemy objective, or null if none found
   */
  getClosestEnemyObjective(position: Vector2, team: number): IObjective | null;
  /**
   * Gets the closest ally objective to a position
   * @param position - The position to measure from
   * @param team - The team number (ally of this team)
   * @returns The closest ally objective, or null if none found
   */
  getClosestAllyObjective(position: Vector2, team: number): IObjective | null;

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
  getVisibleEnemyUnits(playerNumber: number): IUnit[];
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
  ): IUnit[];
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
    units: IUnit[]
  ): IUnit | null;

  /**
   * Gets an entity (unit or objective) by its entity ID
   * @param entityId - The entity ID
   * @returns The entity (unit or objective), or undefined if not found
   */
  getEntity(entityId: EntityId): IUnit | IObjective | undefined;
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
  applyUnitDamageTaken(unit: IUnit, collidedWithEnemy: boolean): void;
  /**
   * Records damage taken by a unit for a player
   * @param unit - The unit that took damage
   * @param damage - The amount of damage taken
   */
  recordUnitDamageForPlayer(unit: IUnit, damage: number): void;
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
  canUnitShoot(unit: IUnit): boolean;

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
}
