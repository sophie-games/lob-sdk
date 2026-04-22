import { EntityId, UnitDto, UnitStatus, ObjectiveDto } from "@lob-sdk/types";

/**
 * Type of action that occurred during game execution.
 */
export enum ActionType {
  /** Container action containing all actions for a game tick. */
  TickAction = 1,
  /** Unit movement action. */
  Move = 2,
  /** Unit rotation action. */
  Rotate = 3,
  /** Melee attack action. */
  Attack = 4,
  /** Ranged attack action. */
  RangedAttack = 5,
  /** Action adding units to the game. */
  AddUnits = 6,
  /** Action when a unit is destroyed. */
  UnitDestroyed = 7,
  /** Action updating a unit's state. */
  UpdateUnitState = 8,
  /** Action placing an entity on the map. */
  PlaceEntity = 9,
  /** Action updating an objective's state. */
  UpdateObjectiveState = 10,
  /** Action marking the start of a new turn. */
  TurnAction = 11,
  /** Action adding objectives to the game. */
  AddObjectives = 12,
  /** Action changing a unit's formation. */
  FormationChange = 13,
}

/**
 * Base interface for all actions.
 * All actions must have a type.
 */
export interface BaseAction {
  /** The type of action. */
  type: ActionType;
}

/**
 * Action marking the start of a new turn.
 */
export interface TurnAction extends BaseAction {
  /** Action type is TurnAction. */
  type: ActionType.TurnAction;
  /** The turn number. */
  turn: number;
  /** Information about teams and their army power. */
  teams: {
    /** The team number. */
    team: number;
    /** Total army power of the team. */
    armyPower: number;
    /**
     * Team's ticks under pressure (first player of the team, matching
     * the VP rule). Carried so replay scrubbing can restore the
     * victory-bar state. Omitted when 0 to save bytes — consumers
     * treat absent as 0. Absent on older replays.
     */
    ticksUnderPressure?: number;
  }[];
}

/**
 * Contains all the actions of a game tick.
 * This is a container action that groups multiple actions together.
 */
export interface TickAction extends BaseAction {
  /** Action type is TickAction. */
  type: ActionType.TickAction;
  /** Array of all actions that occurred in this tick. */
  actions: AnyAction[];
}

/**
 * Action representing a unit's movement along a path.
 */
export interface MoveAction extends BaseAction {
  /** Action type is Move. */
  type: ActionType.Move;
  /** Entity ID of the unit that moved. */
  unitId: EntityId;
  /** Path the unit moved along, as array of [x, y] coordinates. */
  path: [number, number][];
}

/**
 * Action representing a unit's rotation.
 */
export interface RotateAction extends BaseAction {
  /** Action type is Rotate. */
  type: ActionType.Rotate;
  /** Entity ID of the unit that rotated. */
  unitId: EntityId;
  /** New rotation angle in radians. */
  rotation: number;
}

/**
 * Result of an attack action for a single unit.
 */
export interface AttackActionResult {
  /** Entity ID of the unit involved in the attack. */
  unitId: EntityId;
  /** Whether this was a charge attack. */
  charge?: boolean;
}

/**
 * Action representing a melee attack between two units.
 */
export interface AttackAction extends BaseAction {
  /** Action type is Attack. */
  type: ActionType.Attack;
  /** Attack results for both units involved [unit1, unit2]. */
  result: [AttackActionResult, AttackActionResult];
}

/**
 * Action representing a ranged attack.
 */
export interface RangedAttackAction extends BaseAction {
  /** Action type is RangedAttack. */
  type: ActionType.RangedAttack;
  /** Entity ID of the unit that performed the ranged attack. */
  unitId: EntityId;

  /**
   * Damage Type ID so the network payload is lighter.
   */
  dt: number;

  /**
   * Final Shot Segment - the final segment of the shot trajectory as [[x1, y1], [x2, y2]].
   */
  fss: [[number, number], [number, number]];
}

/**
 * Action representing when a unit is destroyed.
 */
export interface UnitDestroyedAction extends BaseAction {
  /** Action type is UnitDestroyed. */
  type: ActionType.UnitDestroyed;
  /** Entity ID of the destroyed unit. */
  unitId: EntityId;
}

/**
 * Action updating a unit's state (HP, organization, status, etc.).
 */
export interface UpdateUnitStateAction extends BaseAction {
  /** Action type is UpdateUnitState. */
  type: ActionType.UpdateUnitState;
  /** Entity ID of the unit being updated. */
  unitId: EntityId;
  /** New HP value, if changed. */
  hp?: number;
  /** New organization value, if changed. */
  org?: number;
  /** New status, if changed. */
  status?: UnitStatus;
  /** Accumulated movement ticks, if changed. */
  ac?: number;
  /**
   * Stamina change.
   */
  st?: number;
  /**
   * Ammo change.
   */
  am?: number;
  /**
   * Supply change.
   */
  su?: number;
  /**
   * Entrenchment change.
   */
  en?: number;
}

/**
 * Action placing an entity on the map.
 */
export interface PlaceEntityAction extends BaseAction {
  /** Action type is PlaceEntity. */
  type: ActionType.PlaceEntity;
  /** Entity ID of the entity being placed. */
  id: EntityId;
  /** Position to place the entity at as [x, y] coordinates. */
  pos: [number, number];
  /** Rotation in radians for the placed entity. */
  rotation?: number;
}

/**
 * Action updating an objective's state.
 */
export interface UpdateObjectiveStateAction extends BaseAction {
  /** Action type is UpdateObjectiveState. */
  type: ActionType.UpdateObjectiveState;
  /** Entity ID of the objective being updated. */
  objectiveId: EntityId;
  /** Player number controlling the objective, if changed. */
  player?: number;
  /** Capture progress (0-1), if changed. */
  captureProgress?: number;
}

/**
 * Action adding units to the game.
 */
export interface AddUnitsAction extends BaseAction {
  /** Action type is AddUnits. */
  type: ActionType.AddUnits;
  /** Array of unit DTOs to add. */
  units: UnitDto[];
}

/**
 * Action adding objectives to the game.
 */
export interface AddObjectivesAction extends BaseAction {
  /** Action type is AddObjectives. */
  type: ActionType.AddObjectives;
  /** Array of objective DTOs to add. */
  objectives: ObjectiveDto[];
}

/**
 * Action changing a unit's formation.
 */
export interface FormationChangeAction extends BaseAction {
  /** Action type is FormationChange. */
  type: ActionType.FormationChange;
  /** Entity ID of the unit changing formation. */
  unitId: EntityId;
  /** ID of the new formation. */
  formationId: string;
}

/**
 * Union type representing any valid action.
 */
export type AnyAction =
  | MoveAction
  | RotateAction
  | AttackAction
  | RangedAttackAction
  | UnitDestroyedAction
  | UpdateUnitStateAction
  | TickAction
  | PlaceEntityAction
  | UpdateObjectiveStateAction
  | AddUnitsAction
  | AddObjectivesAction
  | FormationChangeAction
  | TurnAction;
