import { AnyAction } from "./action";
import { TurnSubmission } from "./order";
import { PlayerInfo } from "./player";
import { GameScenarioType } from "./scenario";
import { GameState, PlayerSetup } from "./server-game";
import { GameClientEventDto } from "./trigger";
import { UnitType } from "./unit";

export * from "./order";
export * from "./unit";
export * from "./objective";
export * from "./server-game";
export * from "./action";
export * from "./trigger";
export * from "./scenario";
export * from "./fog-of-war";
export * from "./vp-service";
export * from "./order-manager";
export * from "./game-data-manager";
export * from "./organization-system";
export * from "./attack-system";
export * from "./movement-system";
export * from "./player";

export enum TurnStatus {
  InProgress = "IN_PROGRESS",
  Completed = "COMPLETED",
  TimedOut = "TIMED_OUT",
}

export interface FormationTemplate {
  id: string;
  frontBackArc: number;

  /**
   * Number of collision circles for this formation.
   */
  collisionCircles: number;
  /**
   * Size of each collision circle in pixels.
   */
  collisionCircleSize: number;
  /**
   * Distance between collision circles. Defaults to collisionCircleSize if not specified.
   */
  collisionCircleDistance?: number;
  /**
   * If true, collision circles are arranged vertically (along X axis).
   * If false or undefined, collision circles are arranged horizontally (along Y axis).
   * Defaults to false (horizontal).
   */
  collisionCirclesVertical?: boolean;
  /**
   * Points used to check what terrain the unit is on.
   * Each point has an offset relative to the formation center and a weight
   * that determines how much that point influences the terrain check.
   * If not specified, defaults to checking only at the unit's center position.
   */
  checkPoints?: Array<FormationCheckPoint>;

  movementModifier?: number;
  rotationSpeedModifier?: number;
  rangedAttackModifier?: number;
  chargeBonusModifier?: number;
  chargePenetrationModifier?: number;
  chargeResistanceModifier?: number;
  pushStrengthModifier?: number;

  disablesFlankMelee?: boolean;
  disablesRearMelee?: boolean;
  disablesEnfiladeRearFire?: boolean;

  flankChargeResistance?: number;
  rearChargeResistance?: number;

  enfiladeFireResistance?: number;
  rearFireResistance?: number;

  rangedDamageResistance?: number;
  rangedOrgResistance?: number;

  /**
   * The shooting angle is the angle in degrees that the unit can shoot at.
   * Default is 90.
   */
  shootingAngle?: number;

  /**
   * The maximum number of targets that the unit can shoot at.
   * Default is 1.
   */
  shootingMaxTargets?: number;

  /**
   * The angle margin is the minimum angle difference there must be
   * between the current target and the rest of the targets to be shot.
   * Default is 0.
   */
  shootingAngleMargin?: number;

  /**
   * The damage will be split by the number of sides or the number of shots,
   * whichever is greater. Default is 1.
   */
  shootingSides?: number;

  /**
   * Time in ticks to form this formation.
   */
  timeToForm?: number;

  /**
   * Time in ticks to unform from this formation.
   */
  timeToUnform?: number;

  /**
   * Speed modifier when a unit is changing to this formation.
   */
  formingSpeedModifier?: number;

  /**
   * Modifier for the damage received by a unit when it is in this formation.
   * Default is 0.
   */
  receivedMeleeDamageModifier?: number;

  /**
   * Minimum movement modifier for this formation.
   * Default is 0.
   */
  minMovementModifier?: number;

  /**
   * Damage types that this formation is immune to from friendly fire.
   */
  friendlyFireImmuneDamageTypes?: string[];

  /**
   * Projectile pass through value for this formation (0-1).
   * Higher values mean projectiles pass through with less damage reduction.
   */
  projectilePassThrough?: number;
}

export type EntityId = number;

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

export type UnitCounts = Record<UnitType, number>;

/**
 * Points used to check what terrain the unit is on.
 * Each point has an offset relative to the formation center and a weight
 * that determines how much that point influences the terrain check.
 * If not specified, defaults to checking only at the unit's center position.
 */
export interface FormationCheckPoint {
  /** Offset in pixels relative to formation center */
  x: number;
  /** Offset in pixels relative to formation center */
  y: number;
  /** Integer weight (higher = more influence) */
  weight: number;
}

export interface FormationCheckPointWithProportion extends FormationCheckPoint {
  proportion: number;
}

export enum Direction {
  Front,
  Right,
  Back,
  Left,
}

export type GameEra = "napoleonic" | "ww2";

export type GameUserResult = "win" | "lose" | "tie";

export enum UserTier {
  Free = "free",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
}

export type GameLocales = {
  [language: string]: Record<string, string>;
};

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
