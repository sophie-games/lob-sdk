import { EntityId, UnitDto, UnitStatus, ObjectiveDto } from "@lob-sdk/types";

export enum ActionType {
  TickAction = 1,
  Move = 2,
  Rotate = 3,
  Attack = 4,
  RangedAttack = 5,
  AddUnits = 6,
  UnitDestroyed = 7,
  UpdateUnitState = 8,
  PlaceEntity = 9,
  UpdateObjectiveState = 10,
  TurnAction = 11,
  AddObjectives = 12,
  FormationChange = 13,
}

export interface BaseAction {
  type: ActionType;
}

export interface TurnAction extends BaseAction {
  type: ActionType.TurnAction;
  turn: number;
  teams: {
    team: number;
    armyPower: number;
  }[];
}

/**
 * Contains all the actions of a game tick.
 */
export interface TickAction extends BaseAction {
  type: ActionType.TickAction;
  actions: AnyAction[];
}

export interface MoveAction extends BaseAction {
  type: ActionType.Move;
  unitId: EntityId;
  path: [number, number][];
}

export interface RotateAction extends BaseAction {
  type: ActionType.Rotate;
  unitId: EntityId;
  rotation: number;
}

export interface AttackActionResult {
  unitId: EntityId;
  charge?: boolean;
}

export interface AttackAction extends BaseAction {
  type: ActionType.Attack;
  result: [AttackActionResult, AttackActionResult];
}

export interface RangedAttackAction extends BaseAction {
  type: ActionType.RangedAttack;
  unitId: EntityId;

  /**
   * Damage Type ID so the network payload is lighter
   */
  dt: number;

  /**
   * Final Shot Segment
   */
  fss: [[number, number], [number, number]];
}

export interface UnitDestroyedAction extends BaseAction {
  type: ActionType.UnitDestroyed;
  unitId: EntityId;
}

export interface UpdateUnitStateAction extends BaseAction {
  type: ActionType.UpdateUnitState;
  unitId: EntityId;
  hp?: number;
  org?: number;
  status?: UnitStatus;
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

export interface PlaceEntityAction extends BaseAction {
  type: ActionType.PlaceEntity;
  id: EntityId;
  pos: [number, number];
  rotation?: number;
}

export interface UpdateObjectiveStateAction extends BaseAction {
  type: ActionType.UpdateObjectiveState;
  objectiveId: EntityId;
  player?: number;
  captureProgress?: number;
}

export interface AddUnitsAction extends BaseAction {
  type: ActionType.AddUnits;
  units: UnitDto[];
}

export interface AddObjectivesAction extends BaseAction {
  type: ActionType.AddObjectives;
  objectives: ObjectiveDto[];
}

export interface FormationChangeAction extends BaseAction {
  type: ActionType.FormationChange;
  unitId: EntityId;
  formationId: string;
}

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
