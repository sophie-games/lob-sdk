import { EventEmitter } from "@lob-sdk/event-emitter";
import {
  UnitDtoPartialId,
  OrderType,
  OrderPathPoint,
  GameEndReason,
  DynamicBattleType,
  GameId,
} from "@lob-sdk/types";

/**
 * Type of event that can trigger game triggers.
 */
export enum GameTriggerEventType {
  /** Trigger fires at the start of a turn. */
  OnTurnStart = "onTurnStart",
  /** Trigger fires at the end of a turn. */
  OnTurnEnd = "onTurnEnd",
}

/**
 * Type of condition that can be checked in a game trigger.
 */
export enum GameTriggerConditionType {
  /** Check if current turn equals a specific value. */
  IsTurn = "isTurn",
  /** Check if current turn is a multiple of a value (with optional offset). */
  IsTurnMultipleOf = "isTurnMultipleOf",
  /** Check if current turn is greater than a value. */
  IsTurnGreaterThan = "isTurnGreaterThan",
  /** Check if current turn is less than a value. */
  IsTurnLessThan = "isTurnLessThan",
  /** Check if an objective belongs to a specific player or team. */
  ObjectiveBelongsTo = "objectiveBelongsTo",
  /** Check if a unit is not alive (destroyed). */
  IsUnitNotAlive = "isUnitNotAlive",
  /** Check if a unit is routing. */
  IsUnitRouting = "isUnitRouting",
  /** Check if a unit moved this turn. */
  UnitMovedThisTurn = "unitMovedThisTurn",
  /** Random chance condition (0-1 probability). */
  Chance = "chance",
  /** Check if a game variable has a specific value. */
  IsVar = "isVar",
}

/**
 * Condition checking if the current turn equals a specific value.
 */
interface ConditionIsTurn {
  /** Condition type is IsTurn. */
  type: GameTriggerConditionType.IsTurn;
  /** Turn number to check against. */
  value: number;
}

/**
 * Condition checking if the current turn is a multiple of a value.
 */
interface ConditionIsTurnMultipleOf {
  /** Condition type is IsTurnMultipleOf. */
  type: GameTriggerConditionType.IsTurnMultipleOf;
  /** Configuration for the multiple check. */
  value: {
    /** The multiple to check (e.g., 5 means turns 5, 10, 15, etc.). */
    multiple: number;
    /** Optional offset (e.g., multiple: 5, offset: 2 means turns 2, 7, 12, etc.). */
    offset?: number;
  };
}

/**
 * Condition checking if the current turn is greater than a value.
 */
interface ConditionIsTurnGreaterThan {
  /** Condition type is IsTurnGreaterThan. */
  type: GameTriggerConditionType.IsTurnGreaterThan;
  /** Turn number threshold. */
  value: number;
}

/**
 * Condition checking if the current turn is less than a value.
 */
interface ConditionIsTurnLessThan {
  /** Condition type is IsTurnLessThan. */
  type: GameTriggerConditionType.IsTurnLessThan;
  /** Turn number threshold. */
  value: number;
}

/**
 * Condition checking if an objective belongs to a specific player or team.
 */
interface ConditionObjectiveBelongsTo {
  /** Condition type is ObjectiveBelongsTo. */
  type: GameTriggerConditionType.ObjectiveBelongsTo;
  /** Configuration for the objective check. */
  value: {
    /** Objective name. */
    name: string;
    /** Optional player number to check. */
    player?: number;
    /** Optional team number to check. */
    team?: number;
  };
}

/**
 * Condition checking if a unit is not alive (has been destroyed).
 */
interface ConditionIsUnitNotAlive {
  /** Condition type is IsUnitNotAlive. */
  type: GameTriggerConditionType.IsUnitNotAlive;
  /** Unit name to check. */
  value: string;
}

/**
 * Condition checking if a unit is routing.
 */
interface ConditionIsUnitRouting {
  /** Condition type is IsUnitRouting. */
  type: GameTriggerConditionType.IsUnitRouting;
  /** Unit name to check. */
  value: string;
}

/**
 * Condition checking if a unit moved this turn.
 */
interface ConditionUnitMovedThisTurn {
  /** Condition type is UnitMovedThisTurn. */
  type: GameTriggerConditionType.UnitMovedThisTurn;
  /** Unit name to check. */
  value: string;
}

/**
 * Condition with a random chance (probability check).
 */
interface ConditionChance {
  /** Condition type is Chance. */
  type: GameTriggerConditionType.Chance;
  /** Probability value between 0 and 1 (e.g., 0.5 = 50% chance). */
  value: number;
}

/**
 * Condition checking if a game variable has a specific value.
 */
interface ConditionIsVar {
  /** Condition type is IsVar. */
  type: GameTriggerConditionType.IsVar;
  /** Configuration for the variable check. */
  value: {
    /** Variable name. */
    name: string;
    /** Value to check against. */
    value: number;
    /** If true, checks that the variable does NOT have the value. */
    not?: boolean;
  };
}

/**
 * Union type representing any valid game trigger condition.
 */
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

/**
 * Type of action that can be executed by a game trigger.
 */
export enum GameTriggerActionType {
  /** Action to add units to the game. */
  AddUnit = "addUnit",
  /** Action to remove units from the game. */
  RemoveUnit = "removeUnit",
  /** Action to add new triggers to the game. */
  AddTrigger = "addTrigger",
  /** Action to show a message to players. */
  ShowMessage = "showMessage",
  /** Action to defeat a player. */
  DefeatPlayer = "defeatPlayer",
  /** Action to move the camera. */
  MoveCamera = "moveCamera",
  /** Action to spawn neutral objectives. */
  SpawnNeutralObjectives = "spawnNeutralObjectives",
  /** Action to set a game variable. */
  SetVar = "setVar",
  /** Action to end the game. */
  EndGame = "endGame",
  /** Action to give an order to a unit. */
  OrderUnit = "orderUnit",
}

/**
 * Action to add units to the game.
 */
export interface ActionAddUnit {
  /** Action type is AddUnit. */
  type: GameTriggerActionType.AddUnit;
  /** Array of unit DTOs to add. */
  value: UnitDtoPartialId[];
}

/**
 * Action to remove units from the game.
 */
export interface ActionRemoveUnit {
  /** Action type is RemoveUnit. */
  type: GameTriggerActionType.RemoveUnit;
  /** Array of unit names to remove. */
  value: string[];
}

/**
 * Action to add new triggers to the game.
 */
interface ActionAddTrigger {
  /** Action type is AddTrigger. */
  type: GameTriggerActionType.AddTrigger;
  /** Array of triggers to add. */
  value: GameTrigger[];
}

/**
 * Action to show a message to players.
 */
interface ActionShowMessage {
  /** Action type is ShowMessage. */
  type: GameTriggerActionType.ShowMessage;
  /** Message content. */
  value: {
    /** Title of the message. */
    title: string;
    /** Message body text. */
    message: string;
  };
}

/**
 * Action to move the camera to a specific position.
 */
interface ActionMoveCamera {
  /** Action type is MoveCamera. */
  type: GameTriggerActionType.MoveCamera;
  /** Camera movement configuration. */
  value: {
    /** Target X coordinate. */
    x: number;
    /** Target Y coordinate. */
    y: number;
    /** Optional zoom level. */
    zoom?: number;
    /** Duration of the camera movement in seconds. */
    duration: number;
  };
}

/**
 * Action to defeat a player.
 */
interface ActionDefeatPlayer {
  /** Action type is DefeatPlayer. */
  type: GameTriggerActionType.DefeatPlayer;
  /** Player number to defeat. */
  value: number;
}

/**
 * Action to set a game variable.
 */
interface ActionSetVar {
  /** Action type is SetVar. */
  type: GameTriggerActionType.SetVar;
  /** Variable configuration. */
  value: {
    /** Variable name. */
    name: string;
    /** Variable value to set. */
    value: number;
  };
}

/**
 * Action to end the game.
 */
interface ActionEndGame {
  /** Action type is EndGame. */
  type: GameTriggerActionType.EndGame;
  /** End game configuration. */
  value: {
    /** End game reason. */
    reason: GameEndReason;
  };
}

/**
 * Action to spawn neutral objectives on the map.
 */
export interface ActionSpawnNeutralObjectives {
  /** Action type is SpawnNeutralObjectives. */
  type: GameTriggerActionType.SpawnNeutralObjectives;
  /** Spawn configuration. */
  value: {
    /** Optional spacing between objectives. Optional since we now use bounding box. */
    spacing?: number;
    /** Number of objectives to spawn per battle type. */
    amount?: Partial<Record<DynamicBattleType, number>>;
    /** Minimum X position as percentage of map width (0-1). */
    minX?: number;
    /** Maximum X position as percentage of map width (0-1). */
    maxX?: number;
    /** Minimum Y position as percentage of map height (0-1). */
    minY?: number;
    /** Maximum Y position as percentage of map height (0-1). */
    maxY?: number;
    /** Orientation relative to the line between team objectives:
     * - "perpendicular": spawn objectives perpendicular to the line between team objectives
     * - "parallel": spawn objectives parallel to the line between team objectives
     * - "circle": spawn objectives in a circle around the line between team objectives
     */
    orientation?: "perpendicular" | "parallel" | "circle";
  };
}

/**
 * Order specification for triggers. Uses unit names instead of IDs
 * to avoid conflicts with dynamically created units.
 */
export interface TriggerOrderSpec {
  /** Order type. Use -1 to remove the unit's current order. */
  type: OrderType | -1;

  /** Name of the unit that will execute the order. */
  unitName: string;

  /** For orders that require a target (follow, shoot, etc.). */
  targetName?: string;

  /** For orders with path (movement, etc.). */
  path?: OrderPathPoint[];

  /** For orders with position (shoot at location, etc.). */
  pos?: [number, number];

  /** Final rotation in radians (optional). */
  rotation?: number;
}

/**
 * Action to give an order to a unit.
 */
export interface ActionOrderUnit {
  /** Action type is OrderUnit. */
  type: GameTriggerActionType.OrderUnit;
  /** Order specification. */
  value: TriggerOrderSpec;
}

/**
 * Union type representing any valid game trigger action.
 */
export type GameTriggerAction =
  | ActionAddUnit
  | ActionRemoveUnit
  | ActionAddTrigger
  | ActionShowMessage
  | ActionDefeatPlayer
  | ActionMoveCamera
  | ActionSpawnNeutralObjectives
  | ActionSetVar
  | ActionEndGame
  | ActionOrderUnit;

/**
 * Event emitter for game trigger events.
 */
export type GameTriggerEventEmitter = EventEmitter<
  Record<GameTriggerEventType, any>
>;

/**
 * Logic operator for combining trigger conditions.
 */
export type GameTriggerConditionLogic = "AND" | "OR";

/**
 * A game trigger that executes actions when conditions are met.
 */
export interface GameTrigger {
  /** Event type that activates this trigger. */
  event: GameTriggerEventType;
  /** Array of conditions that must be checked. */
  conditions: GameTriggerCondition[];
  /** "AND" or "OR" logic for the conditions. Default is "AND". */
  conditionLogic?: GameTriggerConditionLogic;
  /** Array of actions to execute when the trigger fires. */
  actions: GameTriggerAction[];
  /** Whether the trigger fires only once. If false, it can fire multiple times. Default is true. */
  once?: boolean;
}

/**
 * Interface for the trigger system that manages game triggers.
 */
export interface ITriggerSystem {}

/**
 * Type of client event that can be sent to players.
 */
export enum GameClientEventType {
  /** Message event to display to players. */
  Message = "message",
  /** Camera movement event. */
  MoveCamera = "moveCamera",
}

/**
 * Data transfer object for a game message event.
 */
export interface GameMessageDto {
  /** Unique event ID. */
  id: number;
  /** Game ID this event belongs to. */
  gameId: GameId;
  /** User ID this event is targeted to. */
  userId: number;
  /** Event type is Message. */
  type: GameClientEventType.Message;
  /** Message data. */
  data: {
    /** Optional message title. */
    title?: string;
    /** Message body text. */
    message: string;
  };
}

/**
 * Data transfer object for a camera movement event.
 */
export interface MoveCameraDto {
  /** Unique event ID. */
  id: number;
  /** Game ID this event belongs to. */
  gameId: GameId;
  /** User ID this event is targeted to. */
  userId: number;
  /** Event type is MoveCamera. */
  type: GameClientEventType.MoveCamera;
  /** Camera movement data. */
  data: {
    /** Target X coordinate. */
    x: number;
    /** Target Y coordinate. */
    y: number;
    /** Optional zoom level. */
    zoom?: number;
    /** Duration of the camera movement in seconds. */
    duration: number;
  };
}

/**
 * Union type representing any valid game client event.
 */
export type GameClientEventDto = GameMessageDto | MoveCameraDto;
