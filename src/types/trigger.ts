import { EventEmitter } from "@lob-sdk/event-emitter";
import {
  UnitDtoPartialId,
  OrderType,
  OrderPathPoint,
  GameEndReason,
  DynamicBattleType,
  GameId,
} from "@lob-sdk/types";

export enum GameTriggerEventType {
  OnTurnStart = "onTurnStart",
  OnTurnEnd = "onTurnEnd",
}

export enum GameTriggerConditionType {
  IsTurn = "isTurn",
  IsTurnMultipleOf = "isTurnMultipleOf",
  IsTurnGreaterThan = "isTurnGreaterThan",
  IsTurnLessThan = "isTurnLessThan",
  ObjectiveBelongsTo = "objectiveBelongsTo",
  IsUnitNotAlive = "isUnitNotAlive",
  IsUnitRouting = "isUnitRouting",
  UnitMovedThisTurn = "unitMovedThisTurn",
  Chance = "chance",
  IsVar = "isVar",
}

interface ConditionIsTurn {
  type: GameTriggerConditionType.IsTurn;
  value: number;
}

interface ConditionIsTurnMultipleOf {
  type: GameTriggerConditionType.IsTurnMultipleOf;
  value: {
    multiple: number;
    offset?: number;
  };
}

interface ConditionIsTurnGreaterThan {
  type: GameTriggerConditionType.IsTurnGreaterThan;
  value: number;
}

interface ConditionIsTurnLessThan {
  type: GameTriggerConditionType.IsTurnLessThan;
  value: number;
}

interface ConditionObjectiveBelongsTo {
  type: GameTriggerConditionType.ObjectiveBelongsTo;
  value: {
    /** Objective name */
    name: string;
    player?: number;
    team?: number;
  };
}

interface ConditionIsUnitNotAlive {
  type: GameTriggerConditionType.IsUnitNotAlive;
  /** Unit name */
  value: string;
}

interface ConditionIsUnitRouting {
  type: GameTriggerConditionType.IsUnitRouting;
  /** Unit name */
  value: string;
}

interface ConditionUnitMovedThisTurn {
  type: GameTriggerConditionType.UnitMovedThisTurn;
  /** Unit name */
  value: string;
}

interface ConditionChance {
  type: GameTriggerConditionType.Chance;
  value: number;
}

interface ConditionIsVar {
  type: GameTriggerConditionType.IsVar;
  value: {
    /** Var name */
    name: string;
    /** Var value */
    value: number;
    /** If true, it will check that the var does not have the value */
    not?: boolean;
  };
}

export type GameTriggerCondition =
  | ConditionIsTurn
  | ConditionObjectiveBelongsTo
  | ConditionIsUnitNotAlive
  | ConditionIsUnitRouting
  | ConditionIsTurnMultipleOf
  | ConditionIsTurnGreaterThan
  | ConditionIsTurnLessThan
  | ConditionChance
  | ConditionUnitMovedThisTurn
  | ConditionIsVar;

export enum GameTriggerActionType {
  AddUnit = "addUnit",
  AddTrigger = "addTrigger",
  ShowMessage = "showMessage",
  DefeatPlayer = "defeatPlayer",
  MoveCamera = "moveCamera",
  SpawnNeutralObjectives = "spawnNeutralObjectives",
  SetVar = "setVar",
  EndGame = "endGame",
  OrderUnit = "orderUnit",
}

export interface ActionAddUnit {
  type: GameTriggerActionType.AddUnit;
  value: UnitDtoPartialId[];
}

interface ActionAddTrigger {
  type: GameTriggerActionType.AddTrigger;
  value: GameTrigger[];
}

interface ActionShowMessage {
  type: GameTriggerActionType.ShowMessage;
  value: {
    title: string;
    message: string;
  };
}

interface ActionMoveCamera {
  type: GameTriggerActionType.MoveCamera;
  value: {
    x: number;
    y: number;
    zoom?: number;
    duration: number;
  };
}

interface ActionDefeatPlayer {
  type: GameTriggerActionType.DefeatPlayer;
  value: number;
}

interface ActionSetVar {
  type: GameTriggerActionType.SetVar;
  value: {
    /** Var name */
    name: string;
    /** Var value */
    value: number;
  };
}

interface ActionEndGame {
  type: GameTriggerActionType.EndGame;
  value: {
    /** End game reason */
    reason: GameEndReason;
  };
}

export interface ActionSpawnNeutralObjectives {
  type: GameTriggerActionType.SpawnNeutralObjectives;
  value: {
    spacing?: number; // Optional since we now use bounding box
    amount?: Partial<Record<DynamicBattleType, number>>;
    minX?: number; // Percentage of map width (0-1)
    maxX?: number; // Percentage of map width (0-1)
    minY?: number; // Percentage of map height (0-1)
    maxY?: number; // Percentage of map height (0-1)
    orientation?: "perpendicular" | "parallel"; // Orientation relative to the line between team objectives
  };
}

/**
 * Order specification for triggers. Uses unit names instead of IDs
 * to avoid conflicts with dynamically created units.
 */
export interface TriggerOrderSpec {
  /** Order type */
  type: OrderType;

  /** Name of the unit that will execute the order */
  unitName: string;

  /** For orders that require a target (follow, shoot, etc.) */
  targetName?: string;

  /** For orders with path (movement, etc.) */
  path?: OrderPathPoint[];

  /** For orders with position (shoot at location, etc.) */
  pos?: [number, number];

  /** Final rotation (optional) */
  rotation?: number;
}

export interface ActionOrderUnit {
  type: GameTriggerActionType.OrderUnit;
  value: TriggerOrderSpec;
}

export type GameTriggerAction =
  | ActionAddUnit
  | ActionAddTrigger
  | ActionShowMessage
  | ActionDefeatPlayer
  | ActionMoveCamera
  | ActionSpawnNeutralObjectives
  | ActionSetVar
  | ActionEndGame
  | ActionOrderUnit;

export type GameTriggerEventEmitter = EventEmitter<
  Record<GameTriggerEventType, any>
>;

export type GameTriggerConditionLogic = "AND" | "OR";

export interface GameTrigger {
  event: GameTriggerEventType;
  conditions: GameTriggerCondition[];
  /** "AND" or "OR" logic for the conditions. Default is "AND". */
  conditionLogic?: GameTriggerConditionLogic;
  actions: GameTriggerAction[];
  once?: boolean; // Whether the trigger fires only once
}

export interface ITriggerSystem {}

export enum GameClientEventType {
  Message = "message",
  MoveCamera = "moveCamera",
}

export interface GameMessageDto {
  id: number;
  gameId: GameId;
  userId: number;
  type: GameClientEventType.Message;
  data: {
    title?: string;
    message: string;
  };
}

export interface MoveCameraDto {
  id: number;
  gameId: GameId;
  userId: number;
  type: GameClientEventType.MoveCamera;
  data: {
    x: number;
    y: number;
    zoom?: number;
    duration: number;
  };
}

export type GameClientEventDto = GameMessageDto | MoveCameraDto;
